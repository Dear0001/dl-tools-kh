'use client';

import { useState } from 'react';
import type { Tool } from '@/data/tools';

const SAMPLE_HEADERS = '{\n  "Accept": "application/json"\n}';
export default function ApiTesterPanel({ tool: _tool }: { tool: Tool }) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headers, setHeaders] = useState(SAMPLE_HEADERS);
  const [body, setBody] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setResult(''); setStatus('Sending…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    const started = performance.now();
    try {
      const parsedHeaders = JSON.parse(headers || '{}');
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') throw new Error('Headers must be a JSON object.');
      const response = await fetch(url, { method, headers: parsedHeaders as Record<string, string>, ...(method === 'GET' || method === 'HEAD' ? {} : { body }), signal: controller.signal });
      const text = await response.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep response text */ }
      const responseHeaders = Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n');
      setResult(`${responseHeaders ? `Response headers\n${responseHeaders}\n\n` : ''}${formatted}`);
      setStatus(`${response.status} ${response.statusText} · ${Math.round(performance.now() - started)} ms`);
    } catch (cause) {
      const message = cause instanceof Error && cause.name === 'AbortError' ? 'Request timed out after 30 seconds.' : cause instanceof Error ? cause.message : 'Request failed.';
      setResult(message); setStatus('Request failed');
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  return <div className="h-full overflow-auto p-4 space-y-3">
    <div className="flex gap-2"><select className="select-input" value={method} onChange={(event) => setMethod(event.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((item) => <option key={item}>{item}</option>)}</select><input className="input-code flex-1 px-3" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/resource" /><button className="btn-primary text-xs" disabled={busy || !url.trim()} onClick={send}>{busy ? 'Sending…' : 'Send'}</button></div>
    <div className="grid md:grid-cols-2 gap-3"><label className="text-xs text-muted-foreground">Headers (JSON)<textarea className="input-code w-full h-28 p-2 mt-1 resize-y" value={headers} onChange={(event) => setHeaders(event.target.value)} spellCheck={false} /></label><label className="text-xs text-muted-foreground">Request body<textarea className="input-code w-full h-28 p-2 mt-1 resize-y" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} placeholder="Used for POST, PUT, and PATCH" /></label></div>
    <section className="border border-border rounded-lg overflow-hidden"><div className="px-3 py-2 bg-secondary/30 text-xs font-semibold">{status || 'Response'}</div><pre className="p-3 text-xs whitespace-pre-wrap break-words max-h-[45vh] overflow-auto">{result || 'Response body and readable headers will appear here.'}</pre></section>
    <p className="text-xs text-muted-foreground">Requests run from your browser. Cross-origin requests require the API to allow CORS. Never send secrets to an endpoint you do not trust.</p>
  </div>;
}
