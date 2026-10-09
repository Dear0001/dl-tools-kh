'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import beautify from 'js-beautify';

const SAMPLE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>DevToolkit</title><link rel="stylesheet" href="/styles.css"></head><body><div class="container"><h1 class="title">Hello World</h1><p class="description">A developer toolkit.</p><button onClick="handleClick()">Click me</button></div><script src="/app.js"></script></body></html>`;

type Status = 'idle' | 'success' | 'error';

export default function HtmlFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [indent, setIndent] = useState(2);

  const format = () => {
    try {
      // Backend integration point: js-beautify html formatter
      const formatted = beautify.html(input, { indent_size: indent, wrap_line_length: 120 });
      setOutput(formatted);
      setStatus('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Format error';
      setStatus('error');
      setOutput('');
    }
  };

  const minify = () => {
    setOutput(input.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim());
    setStatus('success');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Indent</label>
          <select className="select-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="btn-ghost text-xs" onClick={minify}>Minify</button>
          <button className="btn-primary text-xs" onClick={format}>Format HTML</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste HTML here…" minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="html" placeholder="Formatted HTML appears here…" />}
          outputText={output}
          outputStatus={status}
          onClear={() => { setInput(''); setOutput(''); setStatus('idle'); }}
          onSwap={() => { if (output) setInput(output); }}
        />
      </div>
    </div>
  );
}