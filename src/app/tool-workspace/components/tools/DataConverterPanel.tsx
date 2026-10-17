'use client';

import { useState } from 'react';
import type { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';

type Format = 'json' | 'yaml' | 'csv' | 'xml';

const SAMPLE = `[{"name":"Dara","role":"developer"},{"name":"Sophea","role":"designer"}]`;

function xmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function xmlName(value: string) {
  return value.replace(/[^\w.-]/g, '_').replace(/^[^A-Za-z_]/, '_$&') || 'item';
}

function toXml(value: unknown, tag = 'root'): string {
  if (Array.isArray(value)) return `<${xmlName(tag)}>${value.map((item) => toXml(item, 'item')).join('')}</${xmlName(tag)}>`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const attributes = entries.filter(([key]) => key.startsWith('@')).map(([key, item]) => ` ${xmlName(key.slice(1))}="${xmlEscape(item == null ? '' : String(item))}"`).join('');
    const body = entries.filter(([key]) => !key.startsWith('@') && key !== '#text').map(([key, item]) => {
      return toXml(item, xmlName(key));
    }).join('');
    return `<${xmlName(tag)}${attributes}>${xmlEscape(String((value as Record<string, unknown>)['#text'] ?? ''))}${body}</${xmlName(tag)}>`;
  }
  return `<${xmlName(tag)}>${xmlEscape(value == null ? '' : String(value))}</${xmlName(tag)}>`;
}

function fromXml(element: Element): unknown {
  const children = Array.from(element.children);
  const text = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? '').join('').trim();
  if (!children.length && !element.attributes.length) return element.textContent ?? '';
  const result: Record<string, unknown> = Object.fromEntries(Array.from(element.attributes).map((attribute) => [`@${attribute.name}`, attribute.value]));
  for (const child of children) {
    const value = fromXml(child);
    if (Object.prototype.hasOwnProperty.call(result, child.tagName)) {
      const previous = result[child.tagName];
      result[child.tagName] = Array.isArray(previous) ? [...previous, value] : [previous, value];
    } else result[child.tagName] = value;
  }
  if (text) result['#text'] = text;
  return result;
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  if (cell || row.length || source.endsWith(',')) { row.push(cell); rows.push(row); }
  return rows;
}

function toCsv(value: unknown): string {
  if (!Array.isArray(value)) throw new Error('CSV output needs a JSON array.');
  if (!value.length) return '';
  const headers = Array.from(new Set(value.flatMap((item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.keys(item) : [])));
  if (!headers.length) return ['value', ...value.map((item) => csvCell(item))].join('\n');
  return [headers, ...value.map((item) => headers.map((key) => item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : ''))]
    .map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvToJson(source: string): unknown {
  const rows = parseCsv(source);
  if (!rows.length) return [];
  const [headers, ...data] = rows;
  if (headers.some((header) => !header)) throw new Error('CSV header names cannot be empty.');
  if (data.some((row) => row.length !== headers.length)) throw new Error('Each CSV row must have the same number of columns as the header.');
  return data.map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
}

export default function DataConverterPanel({ tool: _tool }: { tool: Tool }) {
  const [inputFormat, setInputFormat] = useState<Format>('json');
  const [outputFormat, setOutputFormat] = useState<Format>('yaml');
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const convert = async () => {
    try {
      let value: unknown;
      if (inputFormat === 'json') value = JSON.parse(input);
      else if (inputFormat === 'yaml') value = (await import('js-yaml')).load(input);
      else if (inputFormat === 'csv') value = csvToJson(input);
      else {
        const document = new DOMParser().parseFromString(input, 'application/xml');
        const parseError = document.querySelector('parsererror');
        if (parseError) throw new Error('Invalid XML: check the document syntax.');
        value = fromXml(document.documentElement);
      }

      if (outputFormat === 'json') setOutput(JSON.stringify(value, null, 2));
      else if (outputFormat === 'yaml') setOutput((await import('js-yaml')).dump(value, { noRefs: true, lineWidth: 120 }));
      else if (outputFormat === 'csv') setOutput(toCsv(value));
      else setOutput(`<?xml version="1.0" encoding="UTF-8"?>\n${toXml(value)}`);
      setError('');
    } catch (cause) {
      setOutput('');
      setError(cause instanceof Error ? cause.message : 'Could not convert this data.');
    }
  };

  return <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
      <label className="text-xs text-muted-foreground">From <select className="select-input ml-1" value={inputFormat} onChange={(event) => setInputFormat(event.target.value as Format)}>{['json', 'yaml', 'csv', 'xml'].map((format) => <option key={format}>{format}</option>)}</select></label>
      <span className="text-muted-foreground">→</span>
      <label className="text-xs text-muted-foreground">To <select className="select-input ml-1" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as Format)}>{['json', 'yaml', 'csv', 'xml'].map((format) => <option key={format}>{format}</option>)}</select></label>
      <button className="btn-primary text-xs ml-auto" onClick={convert}>Convert</button>
    </div>
    <div className="flex-1 min-h-0 p-4"><PanelLayout
      inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder="Paste JSON, YAML, CSV, or XML…" />}
      outputPanel={<CodeOutput value={output} language={outputFormat === 'yaml' ? 'yaml' : outputFormat === 'json' ? 'json' : 'text'} placeholder="Converted data appears here…" />}
      outputText={output} outputStatus={error ? 'error' : output ? 'success' : 'idle'} errorMessage={error}
      onClear={() => { setInput(''); setOutput(''); setError(''); }}
    /></div>
  </div>;
}
