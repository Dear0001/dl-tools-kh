'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Tool } from '@/data/tools';
import { Upload, Copy, Download, ClipboardPaste, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import AppImage from '@/components/ui/AppImage';

type Mode = 'encode' | 'decode';

export default function Base64ImagePanel({ tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>('encode');
  const [base64, setBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    setMimeType(file.type);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handlePaste = useCallback(async () => {
    // Backend integration point: navigator.clipboard API
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          processFile(new File([blob], 'pasted-image.png', { type: imageType }));
          return;
        }
      }
      toast.error('No image found in clipboard');
    } catch {
      toast.error('Clipboard access denied — try uploading the file directly');
    }
  }, []);

  const decodeBase64 = () => {
    try {
      const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      setPreviewUrl(dataUrl);
      toast.success('Base64 decoded — preview updated');
    } catch {
      toast.error('Invalid Base64 string');
    }
  };

  const downloadFile = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = fileName || 'decoded-file';
    a.click();
  };

  const copyBase64 = async () => {
    if (!base64) return;
    await navigator.clipboard.writeText(base64);
    toast.success('Base64 string copied');
  };

  const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          {(['encode', 'decode'] as Mode[]).map((m) => (
            <button
              key={`b64-mode-${m}`}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-150 capitalize ${mode === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'encode' ? 'File → Base64' : 'Base64 → File'}
            </button>
          ))}
        </div>

        {mode === 'encode' ? (
          <>
            {/* Upload zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-150 cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={28} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDFs, any binary file</p>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="*/*" />
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-ghost text-xs" onClick={handlePaste}>
                <ClipboardPaste size={13} />
                Paste from Clipboard
              </button>
              <span className="text-xs text-muted-foreground">Ctrl+V works on image data</span>
            </div>

            {fileName && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{mimeType.split('/')[0].charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{mimeType} · {fileSize}</p>
                </div>
              </div>
            )}

            {base64 && (
              <>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base64 Output</span>
                    <div className="flex items-center gap-1">
                      <button className="btn-icon" onClick={copyBase64} title="Copy Base64">
                        <Copy size={13} />
                      </button>
                      <button className="btn-icon" onClick={downloadFile} title="Download file">
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={rawBase64}
                    readOnly
                    className="input-code w-full text-emerald-300 text-xs"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Length: <span className="text-foreground tabular-nums">{rawBase64.length.toLocaleString()}</span> chars
                    · Data URI prefix: <span className="text-violet-400 font-mono">{base64.split(',')[0]}</span>
                  </p>
                </div>

                {previewUrl && mimeType.startsWith('image/') && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Preview</span>
                    <div className="flex items-center justify-center bg-[#0a0a0c] rounded-lg p-4 min-h-32">
                      <AppImage
                        src={previewUrl}
                        alt={`Preview of uploaded file ${fileName}`}
                        width={320}
                        height={240}
                        className="max-h-48 object-contain rounded"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-5">
              <label className="block text-xs text-muted-foreground font-medium mb-2">Base64 String</label>
              <textarea
                value={base64}
                onChange={(e) => setBase64(e.target.value)}
                className="input-code w-full text-emerald-300 text-xs"
                rows={6}
                placeholder="Paste Base64 string here… or data:image/png;base64,iVBORw0KGgo..."
                spellCheck={false}
              />
              <button className="btn-primary mt-3 text-xs" onClick={decodeBase64}>
                <ArrowLeftRight size={12} />
                Decode & Preview
              </button>
            </div>

            {previewUrl && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
                  <button className="btn-ghost text-xs" onClick={downloadFile}>
                    <Download size={12} />
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-center bg-[#0a0a0c] rounded-lg p-4 min-h-32">
                  <AppImage
                    src={previewUrl}
                    alt="Decoded image preview from Base64 string"
                    width={320}
                    height={240}
                    className="max-h-48 object-contain rounded"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}