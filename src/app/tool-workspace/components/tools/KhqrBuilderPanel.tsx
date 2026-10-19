'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { Download, Copy } from 'lucide-react';
// no form library needed - simple raw input + upload
import { toast } from 'sonner';
import QRCode from 'qrcode';
import crc16 from './crc16';
import { useDebouncedValue } from '../useDebouncedValue';

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function readMerchantName(payload: string): string {
  let offset = 0;
  while (offset + 4 <= payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    if (!Number.isFinite(length) || length < 0) return '';
    const value = payload.slice(offset + 4, offset + 4 + length);
    if (value.length !== length) return '';
    if (tag === '59') return value;
    offset += 4 + length;
  }
  return '';
}

function readEmvTag(payload: string, targetTag: string): string {
  let offset = 0;
  while (offset + 4 <= payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    if (!Number.isFinite(length) || length < 0) return '';
    const value = payload.slice(offset + 4, offset + 4 + length);
    if (value.length !== length) return '';
    if (tag === targetTag) return value;
    offset += 4 + length;
  }
  return '';
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
  const amountValue = data.amount == null ? '' : String(data.amount).trim();
  if (isDynamic && amountValue !== '') payload += tlv('54', amountValue);
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
  const renderRequestRef = useRef(0);
  const [khqrString, setKhqrString] = useState('');
  const [generated, setGenerated] = useState(false);
  const [customString, setCustomString] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const defaultLogo = '/assets/images/bakong-mark.png';
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(defaultLogo);
  const [logoName, setLogoName] = useState<string | null>('Bakong logo');
  const [logoSize, setLogoSize] = useState(0.16);
  const [headerText, setHeaderText] = useState('KHQR');
  const [headerImageDataUrl, setHeaderImageDataUrl] = useState<string | null>(null);
  const [headerImageName, setHeaderImageName] = useState('');
  const [headerColor, setHeaderColor] = useState('#e31b23');
  const debouncedCustomString = useDebouncedValue(customString, 200);

  // no external form state - only raw string input

  // Render the card, QR, optional custom header artwork, and center logo.
  const renderQr = async (content: string) => {
    const outputCanvas = canvasRef.current;
    if (!outputCanvas) return false;
    const requestId = ++renderRequestRef.current;
    const canvas = document.createElement('canvas');
    const cardWidth = 400;
    const cardHeight = 560;
    const qrSize = 300;
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const qrCanvas = document.createElement('canvas');
    const opts: any = {
      width: qrSize,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: 'H',
    };
    await QRCode.toCanvas(qrCanvas, content, opts);

    if (requestId !== renderRequestRef.current) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, cardWidth, cardHeight, 12);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardWidth, cardHeight);
    ctx.fillStyle = headerColor;
    ctx.beginPath();
    const headerHeight = 88;
    const headerContentCenterY = 32.5;
    ctx.moveTo(0, 0);
    ctx.lineTo(cardWidth, 0);
    ctx.lineTo(cardWidth, headerHeight);
    ctx.lineTo(cardWidth - 30, headerHeight - 30);
    ctx.lineTo(0, headerHeight - 30);
    ctx.closePath();
    ctx.fill();
    if (headerImageDataUrl) {
      const headerImage = new Image();
      headerImage.src = headerImageDataUrl;
      await new Promise<void>((resolve, reject) => {
        headerImage.onload = () => {
          const maxWidth = cardWidth * 0.32;
          const maxHeight = 24;
          const scale = Math.min(maxWidth / headerImage.naturalWidth, maxHeight / headerImage.naturalHeight);
          const width = headerImage.naturalWidth * scale;
          const height = headerImage.naturalHeight * scale;
          ctx.drawImage(headerImage, (cardWidth - width) / 2, headerContentCenterY - height / 2, width, height);
          resolve();
        };
        headerImage.onerror = () => reject(new Error('Could not load the header image.'));
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 30px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(headerText.slice(0, 24) || 'KHQR', cardWidth / 2, headerContentCenterY);
    }

    const merchantName = readMerchantName(content);
    if (merchantName) {
      ctx.fillStyle = '#1f2937';
      ctx.font = '400 15px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(merchantName.slice(0, 38), 40, 101);
    }
    const amount = readEmvTag(content, '54');
    const currencyCode = readEmvTag(content, '53');
    const currency = currencyCode === '116' ? 'KHR' : currencyCode === '840' ? 'USD' : currencyCode;
    const hasKnownCurrency = currencyCode === '116' || currencyCode === '840';
    const formattedAmount = amount !== ''
      ? Number(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : currencyCode === '840' ? '0.0' : '0';
    if (amount !== '' || hasKnownCurrency) {
      ctx.fillStyle = '#080808';
      ctx.font = '700 34px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formattedAmount, 40, 145);
      const amountWidth = ctx.measureText(formattedAmount).width;
      ctx.fillStyle = '#374151';
      ctx.font = '400 13px Arial, sans-serif';
      ctx.fillText(currency, 48 + amountWidth, 145);
    }
    ctx.strokeStyle = '#e5e7eb';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(cardWidth, 180);
    ctx.stroke();
    ctx.setLineDash([]);

    const qrX = Math.round((cardWidth - qrSize) / 2);
    const qrY = 208;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    ctx.restore();

    if (logoDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoDataUrl;
      await new Promise((res, rej) => {
        img.onload = () => {
          try {
            const size = Math.floor(qrSize * logoSize);
            const x = Math.floor((cardWidth - size) / 2);
            const y = qrY + Math.floor((qrSize - size) / 2);
            const radius = Math.floor(size / 2);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, radius, 0, Math.PI * 2);
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
    if (requestId !== renderRequestRef.current) return false;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) return false;
    outputCanvas.width = cardWidth;
    outputCanvas.height = cardHeight;
    outputContext.clearRect(0, 0, cardWidth, cardHeight);
    outputContext.drawImage(canvas, 0, 0);
    return true;
  };

  // Update the QR after a short pause; leave the source text exactly as entered.
  useEffect(() => {
    const content = debouncedCustomString;
    if (customString !== debouncedCustomString) {
      setKhqrString('');
      setGenerated(false);
      return () => { renderRequestRef.current += 1; };
    }
    if (!content.trim()) {
      renderRequestRef.current += 1;
      setKhqrString('');
      setGenerated(false);
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    let cancelled = false;
    setKhqrString(content);
    renderQr(content)
      .then((rendered) => { if (!cancelled) setGenerated(rendered); })
      .catch(() => { if (!cancelled) setGenerated(false); });
    return () => {
      cancelled = true;
      renderRequestRef.current += 1;
    };
    // renderQr reads only the appearance settings listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customString, debouncedCustomString, fgColor, bgColor, logoDataUrl, logoSize, headerText, headerImageDataUrl, headerColor]);

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

  const handleHeaderImage = (file: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Choose a PNG, JPG, or WebP image for the header.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Header image must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHeaderImageDataUrl(String(reader.result));
      setHeaderImageName(file.name);
    };
    reader.onerror = () => toast.error('Could not read this header image.');
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
    setLogoDataUrl(defaultLogo);
    setLogoName('Bakong logo');
  };

  const removeHeaderImage = () => {
    setHeaderImageDataUrl(null);
    setHeaderImageName('');
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
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Encode string</h4>
                <label className="text-xs text-muted-foreground">Raw string</label>
                <textarea
                  value={customString}
                  onChange={(e) => {
                    renderRequestRef.current += 1;
                    setGenerated(false);
                    setCustomString(e.target.value);
                    const canvas = canvasRef.current;
                    const context = canvas?.getContext('2d');
                    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
                  }}
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
                <div className="mt-5 border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Card header</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3">
                    <label className="text-xs text-muted-foreground">
                      Header text
                      <input
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        maxLength={24}
                        disabled={Boolean(headerImageDataUrl)}
                        placeholder="KHQR"
                        className="input-field mt-1 w-full disabled:opacity-50"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      Header color
                      <input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="h-10 w-14 rounded border border-border bg-transparent p-1" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Header shape
                      <span className="input-field mt-1 flex w-full items-center text-foreground">Folded corner</span>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {headerImageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={headerImageDataUrl} alt="Custom header artwork" className="h-10 w-20 rounded bg-muted object-contain p-1" />
                      ) : (
                        <div className="flex h-10 w-20 items-center justify-center rounded bg-muted text-xs font-semibold text-foreground">{headerText || 'KHQR'}</div>
                      )}
                      <div className="min-w-0 text-xs">
                        <div className="truncate text-foreground">{headerImageName || 'Use custom header image'}</div>
                        <div className="text-2xs text-muted-foreground">PNG, JPG, or WebP · up to 5 MB · stays on this device</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="khqr-header-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleHeaderImage(e.target.files?.[0] ?? null)} className="hidden" />
                      <label htmlFor="khqr-header-upload" className="btn-ghost cursor-pointer text-xs">Upload image</label>
                      {headerImageDataUrl && <button type="button" className="btn-ghost text-xs" onClick={removeHeaderImage}>Use text</button>}
                    </div>
                  </div>
                  <p className="mt-2 text-2xs text-muted-foreground">An uploaded image replaces the header text. Color and shape still apply to the band behind it.</p>
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

              <p className="text-xs text-muted-foreground" aria-live="polite">
                {generated ? 'QR code updates automatically as you type.' : 'Enter content to generate a QR preview automatically.'}
              </p>
            </div>
          </div>

          {/* QR Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 self-start">QR Code Preview</h4>
              <div className="w-full rounded-xl bg-muted/60 p-3 flex items-center justify-center">
                <canvas ref={canvasRef} className="h-auto w-full max-w-[300px] rounded-xl shadow-lg" />
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
