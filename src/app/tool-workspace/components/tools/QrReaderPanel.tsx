'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Tool } from '@/data/tools';
import { Upload, ScanLine, ClipboardPaste, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import AppImage from '@/components/ui/AppImage';

export default function QrReaderPanel({ tool }: { tool: Tool }) {
  const [result, setResult] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const decodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    return code ? code.data : null;
  };

  const processImage = useCallback((file: File) => {
    setError('');
    const url = URL.createObjectURL(file);
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
        setResult(decoded);
        toast.success('QR code decoded successfully');
      } else {
        setError('No QR code detected in this image — try a clearer or higher-resolution image');
        setResult('');
      }
    };
  }, []);

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
      toast.error('No image found in clipboard');
    } catch {
      toast.error('Clipboard access denied');
    }
  }, [processImage]);

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