'use client';

import { useState } from 'react';
import type { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';

type Mode = 'html' | 'hex' | 'gzip';
type Direction = 'encode' | 'decode';

async function gzip(text: string, direction: Direction): Promise<string> {
  if (direction === 'encode') {
    if (typeof CompressionStream === 'undefined') throw new Error('Gzip compression is not supported in this browser.');
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  if (typeof DecompressionStream === 'undefined') throw new Error('Gzip decompression is not supported in this browser.');
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export default function EncodingToolkitPanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>('html');
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState('<div title="hello">A & B</div>');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const process = async () => {
    try {
      let result = '';
      if (mode === 'html') {
        if (direction === 'encode') result = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        else { const element = document.createElement('textarea'); element.innerHTML = input; result = element.value; }
      } else if (mode === 'hex') {
        if (direction === 'encode') result = Array.from(new TextEncoder().encode(input), (byte) => byte.toString(16).padStart(2, '0')).join(' ');
        else {
          const cleaned = input.replace(/0x/gi, '').replace(/[\s,:-]/g, '');
          if (!/^(?:[0-9a-f]{2})*$/i.test(cleaned)) throw new Error('Enter complete hexadecimal byte pairs.');
          result = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(cleaned.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16)));
        }
      } else result = await gzip(input, direction);
      setOutput(result); setError('');
    } catch (cause) { setOutput(''); setError(cause instanceof Error ? cause.message : 'Could not process this input.'); }
  };

  return <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
      <select className="select-input" value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="html">HTML entities</option><option value="hex">UTF-8 hex</option><option value="gzip">Gzip</option></select>
      <select className="select-input" value={direction} onChange={(event) => setDirection(event.target.value as Direction)}><option value="encode">Encode</option><option value="decode">Decode</option></select>
      <button className="btn-primary text-xs ml-auto" onClick={process}>{mode === 'gzip' ? 'Compress / decompress' : direction === 'encode' ? 'Encode' : 'Decode'}</button>
    </div>
    <div className="flex-1 min-h-0 p-4"><PanelLayout inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder="Input text…" />} outputPanel={<CodeOutput value={output} language="text" placeholder="Result appears here…" />} outputText={output} outputStatus={error ? 'error' : output ? 'success' : 'idle'} errorMessage={error} onClear={() => { setInput(''); setOutput(''); setError(''); }} /></div>
  </div>;
}
