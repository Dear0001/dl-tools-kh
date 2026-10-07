'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { Download, Copy } from 'lucide-react';
// no form library needed - simple raw input + upload
import { toast } from 'sonner';
import QRCode from 'qrcode';
import crc16 from './crc16';

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function buildKhqr(data: any): string {
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


export default function KhqrBuilderPanel({ tool }: { tool: Tool }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [khqrString, setKhqrString] = useState('');
  const [generated, setGenerated] = useState(false);
  const [customString, setCustomString] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(0.2); // 20% default

  // no external form state - only raw string input

  const generate = async () => {
    try {
      const content = customString?.trim();
      if (!content) {
        toast.error('Please enter a string to encode');
        return;
      }
      setKhqrString(content);
      await renderQr(content);
      setGenerated(true);
      toast.success('KHQR generated successfully');
    } catch (e) {
      toast.error('Failed to generate KHQR — check input values');
    }
  };

  // render QR to canvas and composite logo according to current settings
  const renderQr = async (content: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const opts: any = {
      width: 240,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: logoDataUrl ? 'H' : 'M',
    };
    await QRCode.toCanvas(canvas, content, opts);

    if (logoDataUrl) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoDataUrl;
      await new Promise((res, rej) => {
        img.onload = () => {
          try {
            const size = Math.floor(Math.min(canvas.width, canvas.height) * logoSize);
            const x = Math.floor((canvas.width - size) / 2);
            const y = Math.floor((canvas.height - size) / 2);
            // rounded clip for logo
            const radius = Math.floor(size * 0.18);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + size, y, x + size, y + size, radius);
            ctx.arcTo(x + size, y + size, x, y + size, radius);
            ctx.arcTo(x, y + size, x, y, radius);
            ctx.arcTo(x, y, x + size, y, radius);
            ctx.closePath();
            ctx.clip();
            ctx.imageSmoothingEnabled = true;
            // preserve aspect ratio
            let iw = img.width;
            let ih = img.height;
            const ratio = Math.min(size / iw, size / ih);
            const dw = Math.round(iw * ratio);
            const dh = Math.round(ih * ratio);
            const dx = x + Math.round((size - dw) / 2);
            const dy = y + Math.round((size - dh) / 2);
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
            res(true);
          } catch (err) { rej(err); }
        };
        img.onerror = rej;
      });
    }
  };

  // re-render QR when appearance or logo changes (if a string already exists)
  useEffect(() => {
    if (khqrString) {
      renderQr(khqrString).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fgColor, bgColor, logoDataUrl, logoSize]);

  // File / drag-drop handlers for logo image
  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result));
      setLogoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeLogo = () => {
    setLogoDataUrl(null);
    setLogoName(null);
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
            <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Encode string</h4>
                <label className="text-xs text-muted-foreground">Raw string</label>
                <textarea
                  value={customString}
                  onChange={(e) => setCustomString(e.target.value)}
                  placeholder="Enter the string to encode as QR code"
                  className="input-code w-full min-h-[120px] text-xs"
                />
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Foreground</label>
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-9 h-9 p-0 border rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Background</label>
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 p-0 border rounded" />
                  </div>
                  <div className="text-2xs text-muted-foreground">Background is also used behind the center logo</div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-2 block">Logo (center) — drag & drop or upload</label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-dashed border-2 border-border rounded-md p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-card rounded-md overflow-hidden flex items-center justify-center">
                        {logoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoDataUrl} alt={logoName || 'logo'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-2xs text-muted-foreground">No logo</div>
                        )}
                      </div>
                      <div className="text-xs">
                        <div>{logoName || 'No file selected'}</div>
                        <div className="text-2xs text-muted-foreground">Supports PNG/JPG/SVG</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <label htmlFor="logo-upload" className="btn-ghost text-xs cursor-pointer">Upload</label>
                      {logoDataUrl && (
                        <button type="button" className="btn-ghost text-xs" onClick={removeLogo}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-2 block">Logo size: {Math.round(logoSize * 100)}%</label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={Math.round(logoSize * 100)}
                    onChange={(e) => setLogoSize(Number(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <button type="submit" className="btn-primary w-fit">Generate KHQR</button>
              </div>
            </form>
          </div>

          {/* QR Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 self-start">QR Code Preview</h4>
              <div className="bg-[#0E0E10] rounded-xl p-4 flex items-center justify-center w-full">
                <canvas ref={canvasRef} className="rounded-lg" style={{ width: 240, height: 240 }} />
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