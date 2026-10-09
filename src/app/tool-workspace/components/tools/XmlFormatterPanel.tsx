'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?><catalog><book id="bk101"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><genre>Computer</genre><price>44.95</price><publish_date>2000-10-01</publish_date></book><book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><genre>Fantasy</genre><price>5.95</price><publish_date>2000-12-16</publish_date></book></catalog>`;

type Status = 'idle' | 'success' | 'error';

function formatXml(xml: string, indent: number): string {
  const INDENT = ' '.repeat(indent);
  let formatted = '';
  let depth = 0;
  const tokens = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n');
  for (const token of tokens) {
    const stripped = token.trim();
    if (!stripped) continue;
    if (stripped.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      formatted += INDENT.repeat(depth) + stripped + '\n';
    } else if (stripped.startsWith('<') && !stripped.startsWith('<?') && !stripped.startsWith('<!') && !stripped.endsWith('/>') && !stripped.includes('</')) {
      formatted += INDENT.repeat(depth) + stripped + '\n';
      depth++;
    } else {
      formatted += INDENT.repeat(depth) + stripped + '\n';
    }
  }
  return formatted.trim();
}

export default function XmlFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');

  const format = () => {
    try {
      // Backend integration point: browser DOMParser for XML validation
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) throw new Error(parseError.textContent || 'XML parse error');
      setOutput(formatXml(input, indent));
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'XML error';
      setStatus('error');
      setError(msg.split('\n')[0].slice(0, 80));
      setOutput('');
    }
  };

  const minify = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) throw new Error('Invalid XML');
      setOutput(input.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim());
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'XML error';
      setStatus('error');
      setError(msg);
    }
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
          <button className="btn-primary text-xs" onClick={format}>Format XML</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste XML here…" minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="xml" placeholder="Formatted XML appears here…" />}
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