'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import JsonToTS from 'json-to-ts';

const SAMPLE = `{
  "user": {
    "id": "usr-12345",
    "name": "Sophea Chan",
    "email": "sophea@devtoolkit.io",
    "role": "admin",
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": true
    },
    "tools": ["json-formatter", "sql-formatter", "jwt-decoder"],
    "createdAt": "2026-01-15T08:00:00Z",
    "lastSeen": "2026-08-01T16:00:00Z"
  },
  "subscription": {
    "plan": "pro",
    "expiresAt": "2027-01-15",
    "features": ["unlimited-history", "export", "api-access"]
  }
}`;

type Status = 'idle' | 'success' | 'error';

export default function JsonToTsPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [rootName, setRootName] = useState('RootObject');
  const [useInterface, setUseInterface] = useState(true);

  const convert = () => {
    try {
      const parsed = JSON.parse(input);
      // Backend integration point: json-to-ts library
      const interfaces = JsonToTS(parsed, { rootName });
      const result = useInterface
        ? interfaces.join('\n\n')
        : interfaces.map((i) => i.replace(/^interface /gm, 'type ').replace(/ \{/g, ' = {')).join('\n\n');
      setOutput(result);
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Conversion error';
      setStatus('error');
      setError(msg);
      setOutput('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Root name</label>
          <input
            type="text"
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            className="input-code py-1 px-2 text-xs w-32"
          />
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={useInterface} onChange={(e) => setUseInterface(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
          <span className="text-xs text-muted-foreground">Use interface (vs type)</span>
        </label>
        <div className="ml-auto">
          <button className="btn-primary text-xs" onClick={convert}>Generate TypeScript</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder='Paste JSON here… {"key": "value"}' minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="typescript" placeholder="TypeScript interfaces appear here…" />}
          outputText={output}
          outputStatus={status}
          errorMessage={error}
          onClear={() => { setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
        />
      </div>
    </div>
  );
}