'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { Download, Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import QRCode from 'qrcode';

// CRC16-CCITT implementation (EMVCo spec)
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'));
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function buildKhqr(data: FormValues): string {
  const isDynamic = data.mode === 'dynamic';
  let payload = '';

  // 00: Payload Format Indicator
  payload += tlv('00', '01');
  // 01: Point of Initiation Method
  payload += tlv('01', isDynamic ? '12' : '11');

  // 29: Merchant Account Info (KHQR)
  let merchantInfo = '';
  merchantInfo += tlv('00', 'bakong.io');
  merchantInfo += tlv('01', data.bakongId);
  if (data.merchantId) merchantInfo += tlv('02', data.merchantId);
  if (data.acquiringBank) merchantInfo += tlv('03', data.acquiringBank);
  payload += tlv('29', merchantInfo);

  // 52: Merchant Category Code
  payload += tlv('52', data.mcc || '5999');
  // 53: Transaction Currency
  payload += tlv('53', data.currency === 'KHR' ? '116' : '840');
  // 54: Transaction Amount
  if (data.amount && isDynamic) payload += tlv('54', data.amount);
  // 58: Country Code
  payload += tlv('58', 'KH');
  // 59: Merchant Name
  payload += tlv('59', data.merchantName);
  // 60: Merchant City
  payload += tlv('60', data.merchantCity || 'Phnom Penh');

  // 62: Additional Data
  if (data.billNumber || data.mobileNumber || data.storeLabel || data.terminalLabel) {
    let addData = '';
    if (data.billNumber) addData += tlv('01', data.billNumber);
    if (data.mobileNumber) addData += tlv('02', data.mobileNumber);
    if (data.storeLabel) addData += tlv('03', data.storeLabel);
    if (data.terminalLabel) addData += tlv('07', data.terminalLabel);
    payload += tlv('62', addData);
  }

  // 63: CRC (4 chars placeholder, then compute)
  const withCrcTag = payload + '6304';
  let crc = crc16(withCrcTag);
  return withCrcTag + crc;
}

interface FormValues {
  mode: 'static' | 'dynamic';
  bakongId: string;
  merchantId: string;
  acquiringBank: string;
  merchantName: string;
  merchantCity: string;
  mcc: string;
  currency: 'KHR' | 'USD';
  amount: string;
  billNumber: string;
  mobileNumber: string;
  storeLabel: string;
  terminalLabel: string;
}

export default function KhqrBuilderPanel({ tool }: { tool: Tool }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [khqrString, setKhqrString] = useState('');
  const [generated, setGenerated] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      mode: 'dynamic',
      bakongId: 'devtoolkit@wing',
      merchantId: 'MERCHANT001',
      acquiringBank: 'WING',
      merchantName: 'DevToolkit Store',
      merchantCity: 'Phnom Penh',
      mcc: '5999',
      currency: 'USD',
      amount: '12.50',
      billNumber: 'INV-2026-001',
      mobileNumber: '',
      storeLabel: 'Main Branch',
      terminalLabel: 'POS-001',
    },
  });

  const mode = watch('mode');

  const generate = async (data: FormValues) => {
    try {
      const qrString = buildKhqr(data);
      setKhqrString(qrString);
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrString, {
          width: 280,
          margin: 2,
          color: { dark: '#00D4AA', light: '#0E0E10' },
          errorCorrectionLevel: 'M',
        });
      }
      setGenerated(true);
      toast.success('KHQR generated successfully');
    } catch (e) {
      toast.error('Failed to generate KHQR — check input values');
    }
  };

  const copyString = async () => {
    await navigator.clipboard.writeText(khqrString);
    toast.success('KHQR string copied');
  };

  const downloadQr = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'khqr.png';
    a.click();
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(generate)} className="flex flex-col gap-4">
              {/* Mode */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">QR Mode</h4>
                <div className="flex gap-2">
                  {(['static', 'dynamic'] as const).map((m) => (
                    <label key={`mode-${m}`} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={m} {...register('mode')} className="accent-primary" />
                      <span className="text-sm text-foreground capitalize">{m}</span>
                      <span className="text-xs text-muted-foreground">
                        {m === 'static' ? '(fixed amount)' : '(amount per transaction)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Merchant Info */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Merchant Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Bakong ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register('bakongId', { required: 'Bakong ID is required' })}
                      className="input-code w-full py-2 text-xs"
                      placeholder="yourname@bank"
                    />
                    {errors.bakongId && <p className="text-xs text-red-400 mt-1">{errors.bakongId.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Merchant Name <span className="text-red-400">*</span></label>
                    <input
                      {...register('merchantName', { required: 'Merchant name is required' })}
                      className="input-code w-full py-2 text-xs"
                      placeholder="Your Business Name"
                    />
                    {errors.merchantName && <p className="text-xs text-red-400 mt-1">{errors.merchantName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Merchant ID</label>
                    <input {...register('merchantId')} className="input-code w-full py-2 text-xs" placeholder="MERCHANT001" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Acquiring Bank</label>
                    <input {...register('acquiringBank')} className="input-code w-full py-2 text-xs" placeholder="WING / ABA / ACLEDA" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Merchant City</label>
                    <input {...register('merchantCity')} className="input-code w-full py-2 text-xs" placeholder="Phnom Penh" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">MCC (Category Code)</label>
                    <input {...register('mcc')} className="input-code w-full py-2 text-xs" placeholder="5999" />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Currency</label>
                    <select className="select-input w-full" {...register('currency')}>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="KHR">KHR (Cambodian Riel)</option>
                    </select>
                  </div>
                  {mode === 'dynamic' && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Amount</label>
                      <input {...register('amount')} className="input-code w-full py-2 text-xs" placeholder="12.50" type="number" step="0.01" />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Data */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Data (Tag 62)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Bill Number</label>
                    <input {...register('billNumber')} className="input-code w-full py-2 text-xs" placeholder="INV-2026-001" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Mobile Number</label>
                    <input {...register('mobileNumber')} className="input-code w-full py-2 text-xs" placeholder="+855 12 345 678" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Store Label</label>
                    <input {...register('storeLabel')} className="input-code w-full py-2 text-xs" placeholder="Main Branch" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Terminal Label</label>
                    <input {...register('terminalLabel')} className="input-code w-full py-2 text-xs" placeholder="POS-001" />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-fit">
                Generate KHQR
              </button>
            </form>
          </div>

          {/* QR Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 self-start">QR Code Preview</h4>
              <div className="bg-[#0E0E10] rounded-xl p-4 flex items-center justify-center w-full">
                <canvas ref={canvasRef} className="rounded-lg" style={{ width: 280, height: 280 }} />
              </div>
              {generated && (
                <div className="flex gap-2 mt-4 w-full">
                  <button className="btn-primary flex-1 justify-center text-xs" onClick={downloadQr}>
                    <Download size={12} />
                    Download PNG
                  </button>
                  <button className="btn-ghost text-xs" onClick={copyString}>
                    <Copy size={12} />
                    Copy String
                  </button>
                </div>
              )}
            </div>

            {khqrString && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">EMVCo String</h4>
                <p className="font-mono text-xs text-emerald-300 break-all leading-relaxed">{khqrString}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Length: <span className="text-foreground tabular-nums">{khqrString.length}</span> chars ·
                  CRC: <span className="text-primary font-mono">{khqrString.slice(-4)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}