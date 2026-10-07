'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { Upload, ScanLine, ClipboardPaste, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import AppImage from '@/components/ui/AppImage';
import VisibleUnicodeText, { hasInvisibleUnicode } from '../VisibleUnicodeText';

interface TlvTag {
  tag: string;
  length: number;
  value: string;
  label: string;
  children?: TlvTag[];
}

const TAG_LABELS: Record<string, string> = {
  '00': 'Payload Format Indicator',
  '01': 'Point of Initiation Method',
  '26': 'Merchant Account Info',
  '27': 'Merchant Account Info',
  '29': 'Merchant Account Info (KHQR)',
  '40': 'Additional Data Field Template',
  '52': 'Merchant Category Code',
  '53': 'Transaction Currency',
  '54': 'Transaction Amount',
  '55': 'Tip or Convenience Indicator',
  '58': 'Country Code',
  '59': 'Merchant Name',
  '60': 'Merchant City',
  '61': 'Postal Code',
  '62': 'Additional Data Field',
  '63': 'CRC',
};

const NESTED_TLV_TAGS = new Set(['26', '27', '29', '40', '62']);

// Known nested sub-tag schemas to display placeholders for missing subtags
const NESTED_TLV_SCHEMA: Record<string, Record<string, string>> = {
  '29': {
    '00': 'IANA',
    '01': 'Bakong ID',
    '02': 'Merchant ID',
    '03': 'Acquiring Bank',
  },
  '26': {
    '00': 'Globally Unique Identifier',
    '01': 'Payment Network Specific',
  },
  '27': {
    '00': 'Globally Unique Identifier',
    '01': 'Payment Network Specific',
  },
  '40': {
    // generic template entries — show common placeholders
    '00': 'Additional Data 00',
    '01': 'Additional Data 01',
  },
  '62': {
    '01': 'Bill Number',
    '02': 'Mobile Number',
    '03': 'Store Label',
    '04': 'Reference',
    '07': 'Terminal Label',
  },
};

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function parseTlv(data: string): TlvTag[] {
  const tags: TlvTag[] = [];
  let i = 0;
  while (i + 4 <= data.length) {
    const tag = data.slice(i, i + 2);
    const lenStr = data.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (Number.isNaN(len) || i + 4 + len > data.length) break;
    const value = data.slice(i + 4, i + 4 + len);
    const children = NESTED_TLV_TAGS.has(tag) ? parseTlv(value) : undefined;
    tags.push({
      tag,
      length: len,
      value,
      label: TAG_LABELS[tag] || `Tag ${tag}`,
      children,
    });
    i += 4 + len;
  }
  return tags;
}

function renderTlvChildren(children: TlvTag[], level = 1): React.ReactNode {
  return children.map((child, index) => (
    <div key={`${child.tag}-${level}-${index}`}>
      <div className={`flex items-start gap-3 px-4 py-2 transition-colors ${level % 2 === 1 ? 'bg-muted/10' : 'bg-muted/05'} ${level > 1 ? 'pl-10' : ''}`}>
        <span className="font-mono text-xs text-amber-400 w-8 flex-shrink-0 tabular-nums">{child.tag}</span>
        <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{child.label}</span>
        <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{child.length}</span>
        <span className="font-mono text-xs text-foreground flex-1 break-all">
          {child.tag === '59' ? <VisibleUnicodeText value={child.value} /> : child.value}
        </span>
      </div>
      {child.children && renderTlvChildren(child.children, level + 1)}
    </div>
  ));
}

function fillMissingChildren(tags: TlvTag[]) {
  for (const tag of tags) {
    if (tag.children) {
      // if schema exists for this parent, ensure all schema subtags present (in order)
      const schema = NESTED_TLV_SCHEMA[tag.tag];
      if (schema) {
        const existingByTag: Record<string, TlvTag> = {};
        for (const c of tag.children) existingByTag[c.tag] = c;
        const filled: TlvTag[] = [];
        for (const [subTag, label] of Object.entries(schema)) {
          if (existingByTag[subTag]) {
            // recursively fill deeper children
            if (existingByTag[subTag].children) fillMissingChildren([existingByTag[subTag]]);
            filled.push(existingByTag[subTag]);
          } else {
            filled.push({ tag: subTag, length: 0, value: '', label, children: undefined });
          }
        }
        // append any other children that weren't in the schema after the listed ones
        for (const c of tag.children) {
          if (!schema[c.tag]) {
            if (c.children) fillMissingChildren([c]);
            filled.push(c);
          }
        }
        tag.children = filled;
      } else {
        // no schema: still recurse into existing children
        fillMissingChildren(tag.children);
      }
    }
  }
}

export default function QrReaderPanel({ tool }: { tool: Tool }) {
  const [result, setResult] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<TlvTag[]>([]);
  const [crcValid, setCrcValid] = useState<boolean | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevPreviewUrl = useRef<string | null>(null);

  const decodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    return code ? code.data : null;
  };

  const validateResult = useCallback((decoded: string) => {
    const data = decoded.trim();
    if (!data) {
      setTags([]);
      setCrcValid(null);
      setParseError('');
      return;
    }

    const parsed = parseTlv(data);
    if (!parsed.length) {
      setTags([]);
      setParseError('No EMVCo/KHQR tag structure detected');
      setCrcValid(null);
      return;
    }

    // Fill missing expected nested subtags so UI shows placeholders
    fillMissingChildren(parsed);
    setTags(parsed);
    setParseError('');

    const crcIndex = data.lastIndexOf('6304');
    if (crcIndex !== -1 && data.length >= crcIndex + 8) {
      const withoutCrc = data.slice(0, crcIndex + 4);
      const providedCrc = data.slice(crcIndex + 4, crcIndex + 8).toUpperCase();
      setCrcValid(providedCrc === crc16(withoutCrc));
    } else {
      setCrcValid(null);
    }
  }, []);

  const updateResult = useCallback(
    (decoded: string) => {
      setResult(decoded);
      setError('');
      validateResult(decoded);
    },
    [validateResult],
  );

  const processImage = useCallback((file: File) => {
    setError('');
    const url = URL.createObjectURL(file);
    if (prevPreviewUrl.current) {
      URL.revokeObjectURL(prevPreviewUrl.current);
    }
    prevPreviewUrl.current = url;
    setPreviewUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const decoded = decodeFromCanvas(canvas);
      if (decoded) {
        updateResult(decoded);
        toast.success('QR code decoded successfully');
      } else {
        setError('No QR code detected in this image — try a clearer or higher-resolution image');
        setResult('');
        setTags([]);
        setCrcValid(null);
        setParseError('');
      }
    };
  }, [updateResult]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processImage(new File([blob], 'pasted.png', { type: imageType }));
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        updateResult(text);
        toast.success('Text pasted from clipboard');
        return;
      }
      toast.error('No image or text found in clipboard');
    } catch {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          updateResult(text);
          toast.success('Text pasted from clipboard');
          return;
        }
      } catch {
        // ignore
      }
      toast.error('Clipboard access denied');
    }
  }, [processImage, updateResult]);

  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch {
      toast.error('Camera access denied — try uploading an image instead');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const decoded = decodeFromCanvas(canvas);
    if (decoded) {
      setResult(decoded);
      stopCamera();
      toast.success('QR code scanned');
      return;
    }
    if (streamRef.current) requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    const handleClipboardPaste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));

      if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          processImage(file);
        }
        return;
      }

      const text = event.clipboardData.getData('text');
      if (text) {
        event.preventDefault();
        updateResult(text);
        toast.success('Text pasted from clipboard');
      }
    };

    document.addEventListener('paste', handleClipboardPaste);
    return () => {
      document.removeEventListener('paste', handleClipboardPaste);
      if (prevPreviewUrl.current) {
        URL.revokeObjectURL(prevPreviewUrl.current);
        prevPreviewUrl.current = null;
      }
    };
  }, [processImage, updateResult]);

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Result copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center gap-2 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={22} className="text-primary" />
            <span className="text-xs font-medium text-foreground">Upload Image</span>
            <span className="text-xs text-muted-foreground text-center">PNG, JPG, WebP</span>
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </button>

          <button
            className="flex flex-col items-center gap-2 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 cursor-pointer"
            onClick={handlePaste}
          >
            <ClipboardPaste size={22} className="text-violet-400" />
            <span className="text-xs font-medium text-foreground">Paste Image</span>
            <span className="text-xs text-muted-foreground text-center">Ctrl+V / clipboard</span>
          </button>

          <button
            className={`flex flex-col items-center gap-2 p-5 bg-card border rounded-xl transition-all duration-150 cursor-pointer ${scanning ? 'border-red-500/30 bg-red-500/5' : 'border-border hover:border-primary/30 hover:bg-primary/5'}`}
            onClick={scanning ? stopCamera : startCamera}
          >
            <ScanLine size={22} className={scanning ? 'text-red-400' : 'text-amber-400'} />
            <span className="text-xs font-medium text-foreground">{scanning ? 'Stop Camera' : 'Live Camera'}</span>
            <span className="text-xs text-muted-foreground text-center">{scanning ? 'Scanning…' : 'Webcam scan'}</span>
          </button>
        </div>

        {/* Camera feed */}
        {scanning && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full rounded-xl" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-3 flex items-center gap-2 justify-center">
              <span className="status-dot-success animate-pulse-soft" />
              <span className="text-xs text-primary">Scanning for QR code…</span>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewUrl && !scanning && (
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Scanned Image</span>
            <div className="bg-[#0a0a0c] rounded-lg flex items-center justify-center p-4">
              <AppImage
                key={previewUrl}
                src={previewUrl}
                alt="Uploaded image being scanned for QR code content"
                width={280}
                height={280}
                className="max-h-48 object-contain rounded"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-card border border-primary/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Decoded Result</span>
              </div>
              <button className={`btn-icon ${copied ? 'text-primary' : ''}`} onClick={copyResult}>
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="font-mono text-sm text-foreground break-all whitespace-pre-wrap">{result}</pre>
            <p className="text-xs text-muted-foreground mt-2 tabular-nums">{result.length} characters</p>
          </div>
        )}

        {parseError && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-500 mt-0.5">⚠</span>
            <span className="text-xs text-yellow-500">{parseError}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="panel-header rounded-t-xl">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tag Validation</span>
              <span className="text-xs text-muted-foreground">{tags.length} tags parsed</span>
            </div>
            {tags.some((tag) => tag.tag === '59' && hasInvisibleUnicode(tag.value)) && (
              <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                Red markers show invisible characters in the merchant name; the original decoded value is unchanged.
              </p>
            )}
            <div className="divide-y divide-border">
              {tags.map((tag, i) => (
                <div key={`tlv-${i}-${tag.tag}`}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className="font-mono text-xs text-violet-400 w-8 flex-shrink-0 tabular-nums">{tag.tag}</span>
                    <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{tag.label}</span>
                    <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{tag.length}</span>
                    <span className="font-mono text-xs text-foreground flex-1 break-all">
                      {tag.tag === '59' ? <VisibleUnicodeText value={tag.value} /> : tag.value}
                    </span>
                  </div>
                  {tag.children && renderTlvChildren(tag.children, 1)}
                </div>
              ))}
              {crcValid !== null && (
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <span className="font-mono text-xs text-violet-400 w-8 flex-shrink-0">63</span>
                  <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">CRC</span>
                  <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">04</span>
                  <span className={`font-mono text-xs flex-1 ${crcValid ? 'text-primary' : 'text-red-400'}`}>
                    {crcValid ? 'CRC valid' : 'CRC mismatch'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {!result && !error && !scanning && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <ScanLine size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">No QR code scanned yet</p>
            <p className="text-xs">Upload an image, paste from clipboard, or use your camera above</p>
          </div>
        )}
      </div>
    </div>
  );
}