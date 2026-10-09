'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';

const SAMPLE = `name: devtoolkit
version: 1.0.0
description: Browser-based developer tools
config:
  theme: dark
  autosave: true
  maxHistory: 50
tools:
  - id: json-formatter
    category: formatters
    popular: true
  - id: sql-formatter
    category: formatters
    popular: true
server:
  port: 3000
  host: localhost`;

type Status = 'idle' | 'success' | 'error';

export default function YamlFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const validate = async () => {
    try {
      const yaml = await import('js-yaml');
      yaml.load(input);
      setOutput('✓ Valid YAML — no syntax errors detected.');
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'YAML error';
      setStatus('error');
      setError(msg.split('\n')[0]);
      setOutput('✗ ' + msg);
    }
  };

  const format = async () => {
    try {
      const yaml = await import('js-yaml');
      const parsed = yaml.load(input);
      const dumped = yaml.dump(parsed, { indent: 2, lineWidth: 120 });
      setOutput(dumped);
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'YAML error';
      setStatus('error');
      setError(msg.split('\n')[0]);
      setOutput('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="btn-ghost text-xs" onClick={validate}>Validate</button>
          <button className="btn-primary text-xs" onClick={format}>Format YAML</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste YAML here…" minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="yaml" placeholder="Formatted YAML appears here…" />}
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