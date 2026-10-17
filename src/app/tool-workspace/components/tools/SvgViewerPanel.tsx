'use client';

import { useEffect, useMemo, useState } from 'react';
import beautify from 'js-beautify';
import { Check, Copy, Download, Image as ImageIcon, Minimize2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" rx="24" fill="#0ea5e9"/><circle cx="160" cy="90" r="48" fill="white"/><path d="M145 65v50l45-25z" fill="#0ea5e9"/></svg>`;

function sanitizeSvg(source: string): string {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') throw new Error('Enter valid SVG markup with an <svg> root element.');
  document.querySelectorAll('script, style, foreignObject, iframe, object, embed').forEach((node) => node.remove());
  for (const element of Array.from(document.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || /javascript:/i.test(value) || /@import|expression\s*\(/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (['href', 'xlink:href'].includes(name) && value && !value.startsWith('#') && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (/url\(\s*['"]?(?!#)/i.test(value)) element.removeAttribute(attribute.name);
    }
  }
  return new XMLSerializer().serializeToString(document.documentElement);
}

export default function SvgViewerPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [dataUri, setDataUri] = useState('');
  const isValid = useMemo(() => {
    try { return Boolean(sanitizeSvg(input)); } catch { return false; }
  }, [input]);

  useEffect(() => {
    if (!isValid) {
      setPreviewUrl('');
      return;
    }
    const safe = sanitizeSvg(input);
    const url = URL.createObjectURL(new Blob([safe], { type: 'image/svg+xml' }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [input, isValid]);

  const optimize = () => {
    try {
      const safe = sanitizeSvg(input);
      const formatted = beautify.html(safe, { indent_size: 2, preserve_newlines: false });
      setOutput(formatted);
      setDataUri(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(safe)))}`);
      setError('');
    } catch (cause) {
      setOutput('');
      setDataUri('');
      setError(cause instanceof Error ? cause.message : 'Could not process this SVG.');
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-secondary/30 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground"><ImageIcon size={16} className="text-primary" />SVG viewer &amp; optimizer</span>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={() => setInput(SAMPLE)}><Minimize2 size={14} />Reset sample</button>
          <button type="button" className="btn-primary inline-flex items-center gap-1.5 text-xs" onClick={optimize} disabled={!isValid}><WandSparkles size={14} />Sanitize &amp; format</button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r" aria-label="SVG source">
          <h2 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">SVG source</h2>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setError(''); setOutput(''); setDataUri(''); }} spellCheck={false} className="input-code min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm focus:ring-0" placeholder="Paste SVG markup…" />
        </section>
        <section className="flex min-h-0 flex-col" aria-label="SVG preview">
          <h2 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>
          <div className="flex min-h-44 flex-1 items-center justify-center overflow-auto bg-[linear-gradient(45deg,var(--tw-gradient-stops))] from-muted via-background to-muted p-6">
            {previewUrl ? <img src={previewUrl} alt="Sanitized SVG preview" className="max-h-full max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">Enter valid SVG markup to preview it.</p>}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border p-3">
            {output && <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={() => void copy(output, 'SVG')}><Copy size={14} />Copy sanitized SVG</button>}
            {dataUri && <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={() => void copy(dataUri, 'Data URI')}><Check size={14} />Copy data URI</button>}
            {dataUri && <a href={dataUri} download="optimized.svg" className="btn-ghost inline-flex items-center gap-1.5 text-xs"><Download size={14} />Download</a>}
          </div>
        </section>
      </div>
      {error && <p role="alert" className="border-t border-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}
      {output && <details className="max-h-48 shrink-0 overflow-auto border-t border-border"><summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-muted-foreground">Sanitized SVG output</summary><pre className="whitespace-pre-wrap px-4 pb-3 font-mono text-xs text-foreground">{output}</pre></details>}
    </div>
  );
}
