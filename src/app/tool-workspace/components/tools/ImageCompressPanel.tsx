'use client';
import React, { useState, useRef } from 'react';
import { Tool } from '@/data/tools';
import { Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import AppImage from '@/components/ui/AppImage';

export default function ImageCompressPanel({ tool }: { tool: Tool }) {
  const [original, setOriginal] = useState<{ url: string; size: number; name: string; width: number; height: number } | null>(null);
  const [compressed, setCompressed] = useState<{ url: string; size: number; width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxSizeMB, setMaxSizeMB] = useState(0.5);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [quality, setQuality] = useState(0.8);
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setOriginal({ url, size: file.size, name: file.name, width: img.naturalWidth, height: img.naturalHeight });
      setCompressed(null);
    };
  };

  const compress = async () => {
    if (!original) return;
    setLoading(true);
    try {
      // Backend integration point: browser-image-compression
      const resp = await fetch(original.url);
      const blob = await resp.blob();
      const file = new File([blob], original.name, { type: blob.type });
      const result = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: maxWidth,
        initialQuality: quality,
        fileType: outputFormat,
        useWebWorker: true,
      });
      const compUrl = URL.createObjectURL(result);
      const img = new Image();
      img.src = compUrl;
      img.onload = () => {
        setCompressed({ url: compUrl, size: result.size, width: img.naturalWidth, height: img.naturalHeight });
        setLoading(false);
        toast.success(`Compressed to ${(result.size / 1024).toFixed(1)} KB`);
      };
    } catch (e) {
      toast.error('Compression failed — try a different format or quality setting');
      setLoading(false);
    }
  };

  const downloadCompressed = () => {
    if (!compressed) return;
    const a = document.createElement('a');
    a.href = compressed.url;
    const ext = outputFormat.split('/')[1];
    a.download = `compressed.${ext}`;
    a.click();
  };

  const savings = original && compressed
    ? Math.round((1 - compressed.size / original.size) * 100)
    : 0;

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Upload */}
        {!original ? (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all duration-150"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={32} className="text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Upload an image to compress</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF supported</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <>
            {/* Config */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Compression Settings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Max Size</label>
                  <select className="select-input w-full" value={maxSizeMB} onChange={(e) => setMaxSizeMB(Number(e.target.value))}>
                    <option value={0.1}>0.1 MB</option>
                    <option value={0.3}>0.3 MB</option>
                    <option value={0.5}>0.5 MB</option>
                    <option value={1}>1 MB</option>
                    <option value={2}>2 MB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Max Width</label>
                  <select className="select-input w-full" value={maxWidth} onChange={(e) => setMaxWidth(Number(e.target.value))}>
                    <option value={640}>640px</option>
                    <option value={1280}>1280px</option>
                    <option value={1920}>1920px</option>
                    <option value={3840}>3840px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quality</label>
                  <select className="select-input w-full" value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
                    <option value={0.5}>50%</option>
                    <option value={0.7}>70%</option>
                    <option value={0.8}>80%</option>
                    <option value={0.9}>90%</option>
                    <option value={1}>100%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Format</label>
                  <select className="select-input w-full" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}>
                    <option value="image/webp">WebP</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button className="btn-primary text-xs" onClick={compress} disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />Compressing…</span>
                  ) : 'Compress Image'}
                </button>
                <button className="btn-ghost text-xs" onClick={() => { setOriginal(null); setCompressed(null); }}>
                  Change Image
                </button>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Original</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{(original.size / 1024).toFixed(1)} KB · {original.width}×{original.height}</span>
                </div>
                <div className="bg-[#0a0a0c] rounded-lg overflow-hidden flex items-center justify-center min-h-32">
                  <AppImage src={original.url} alt={`Original image: ${original.name}`} width={300} height={200} className="max-h-40 object-contain" unoptimized />
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compressed</span>
                  {compressed && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">{(compressed.size / 1024).toFixed(1)} KB · {compressed.width}×{compressed.height}</span>
                      <span className="tool-category-badge bg-primary/10 text-primary border border-primary/20">-{savings}%</span>
                    </div>
                  )}
                </div>
                <div className="bg-[#0a0a0c] rounded-lg overflow-hidden flex items-center justify-center min-h-32">
                  {compressed ? (
                    <AppImage src={compressed.url} alt="Compressed output image" width={300} height={200} className="max-h-40 object-contain" unoptimized />
                  ) : (
                    <span className="text-xs text-muted-foreground">Compressed image appears here</span>
                  )}
                </div>
                {compressed && (
                  <button className="btn-primary text-xs mt-3 w-full justify-center" onClick={downloadCompressed}>
                    <Download size={12} />
                    Download Compressed
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}