'use client';
import React, { useState, useCallback } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { Minimize2, Maximize2 } from 'lucide-react';

const SAMPLE = `{"name":"DevToolkit","version":"1.0.0","tools":["formatter","diff","qr"],"config":{"theme":"dark","autosave":true,"maxHistory":50},"meta":{"author":"dev@devtoolkit.io","created":"2026-01-15"}}`;

type Status = 'idle' | 'success' | 'error';

export default function JsonFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      const sorted = sortKeys
        ? JSON.parse(JSON.stringify(parsed, Object.keys(parsed).sort()))
        : parsed;
      setOutput(JSON.stringify(sorted, null, indent));
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setOutput('');
      setStatus('error');
      setError(msg);
    }
  }, [input, indent, sortKeys]);

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setStatus('error');
      setError(msg);
    }
  };

  const validate = () => {
    try {
      JSON.parse(input);
      setStatus('success');
      setError('');
      setOutput('✓ Valid JSON');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setStatus('error');
      setError(msg);
      setOutput('✗ ' + msg);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Config bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Indent</label>
          <select
            className="select-input"
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={1}>1 space</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={sortKeys}
            onChange={(e) => setSortKeys(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground">Sort keys</span>
        </label>
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="btn-ghost text-xs" onClick={validate}>Validate</button>
          <button className="btn-ghost text-xs" onClick={minify}>
            <Minimize2 size={12} />
            Minify
          </button>
          <button className="btn-primary text-xs" onClick={format}>
            <Maximize2 size={12} />
            Format
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={
            <CodeEditor
              value={input}
              onChange={setInput}
              placeholder='Paste JSON here… e.g. {"key": "value"}'
              minHeight="100%"
            />
          }
          outputPanel={
            <CodeEditor
              value={output}
              onChange={() => {}}
              readOnly
              placeholder="Formatted JSON appears here…"
              minHeight="100%"
              className="text-emerald-300"
            />
          }
          outputText={output}
          outputStatus={status}
          errorMessage={error}
          onClear={() => { setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
          onSwap={() => { if (output) setInput(output); }}
        />
      </div>
    </div>
  );
}