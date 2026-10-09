'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import beautify from 'js-beautify';

const SAMPLE = `.container{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;background-color:#0e0e10;border-radius:8px;}.title{font-size:24px;font-weight:700;color:#f0f0f5;margin-bottom:8px;}.btn{background:linear-gradient(135deg,#00d4aa,#7c6af7);color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;transition:all 150ms ease;}`;

type Status = 'idle' | 'success' | 'error';

export default function CssFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [indent, setIndent] = useState(2);

  const format = () => {
    try {
      const formatted = beautify.css(input, { indent_size: indent });
      setOutput(formatted);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const minify = () => {
    setOutput(input.replace(/\s+/g, ' ').replace(/\s*{\s*/g, '{').replace(/\s*}\s*/g, '}').replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';').trim());
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
          <button className="btn-primary text-xs" onClick={format}>Format CSS</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste CSS / SCSS here…" minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="css" placeholder="Formatted CSS appears here…" />}
          outputText={output}
          outputStatus={status}
          onClear={() => { setInput(''); setOutput(''); setStatus('idle'); }}
          onSwap={() => { if (output) setInput(output); }}
        />
      </div>
    </div>
  );
}