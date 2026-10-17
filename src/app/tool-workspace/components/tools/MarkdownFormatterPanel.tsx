'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Eye, FileCode2, WandSparkles } from 'lucide-react';
import { marked } from 'marked';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';

const SAMPLE = `# Markdown preview

Write **Markdown** on the left and preview it here.

- Headings and lists
- [Links](https://example.com)

\`\`\`js
const ready = true;
\`\`\`
`;

function safeMarkdownHtml(markdown: string): string {
  const rendered = marked.parse(markdown, { async: false });
  const parsed = new DOMParser().parseFromString(rendered, 'text/html');
  const allowed = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'STRONG', 'B', 'EM', 'I', 'DEL', 'S', 'HR', 'BR', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  const clean = (parent: ParentNode) => {
    for (const child of Array.from(parent.childNodes)) {
      if (!(child instanceof HTMLElement)) continue;
      if (!allowed.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG'].includes(child.tagName)) child.remove();
        else {
          clean(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      const href = child.tagName === 'A' ? child.getAttribute('href') : null;
      for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      if (child.tagName === 'A' && href && /^(https?:|mailto:|#|\/)/i.test(href)) {
        child.setAttribute('href', href);
        child.setAttribute('rel', 'noreferrer noopener');
        child.setAttribute('target', '_blank');
      }
      clean(child);
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

export default function MarkdownFormatterPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [formatted, setFormatted] = useState(SAMPLE);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const safeHtml = useMemo(() => safeMarkdownHtml(preview ? formatted : ''), [formatted, preview]);

  const format = async () => {
    setBusy(true);
    try {
      const [{ format: prettierFormat }, markdownPlugin] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/markdown'),
      ]);
      const result = await prettierFormat(input, { parser: 'markdown', plugins: [markdownPlugin], proseWrap: 'preserve' });
      setInput(result);
      setFormatted(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not format Markdown.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      toast.success('Markdown copied');
    } catch {
      toast.error('Could not copy Markdown');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-secondary/30 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground"><FileCode2 size={16} className="text-primary" />Markdown</span>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={() => setPreview((value) => !value)}><Eye size={14} />{preview ? 'Hide preview' : 'Show preview'}</button>
          <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={copy} disabled={!formatted}><Copy size={14} />Copy</button>
          <button type="button" className="btn-primary inline-flex items-center gap-1.5 text-xs" onClick={format} disabled={busy}><WandSparkles size={14} />{busy ? 'Formatting…' : 'Format'}</button>
        </div>
      </div>
      <div className={`grid min-h-0 flex-1 ${preview ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        <section className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r" aria-label="Markdown source">
          <h2 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</h2>
          <textarea value={input} onChange={(event) => { setInput(event.target.value); setFormatted(event.target.value); }} spellCheck={false} className="input-code min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm focus:ring-0" placeholder="Write Markdown…" />
        </section>
        {preview && <section className="min-h-0 overflow-auto" aria-label="Rendered Markdown preview">
          <h2 className="sticky top-0 border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>
          <article className="prose prose-sm max-w-none p-5 dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeHtml }} />
        </section>}
      </div>
      {formatted && formatted !== input && <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-2 text-xs text-emerald-500"><Check size={14} />Formatted output is ready to copy or edit in the source pane.</div>}
    </div>
  );
}
