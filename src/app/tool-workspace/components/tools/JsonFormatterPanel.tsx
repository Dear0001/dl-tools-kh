'use client';
import React, { useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import { Minimize2, ImageIcon } from 'lucide-react';

type Status = 'idle' | 'success' | 'error';

interface PreviewItem {
  path: string;
  value: string;
  previewUrl?: string;
  kind: 'image' | 'text';
}

/**
 * Recursively parses any string values inside objects/arrays that represent valid JSON strings.
 */
function deepParseJsonStrings(value: unknown, depth = 0, maxDepth = 10): unknown {
  if (depth >= maxDepth) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;

    const tryParseCandidate = (candidate: string): unknown | null => {
      try {
        return deepParseJsonStrings(JSON.parse(candidate), depth + 1, maxDepth);
      } catch {
        return null;
      }
    };

    // Only attempt to parse strings that actually look like JSON objects or arrays.
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = tryParseCandidate(trimmed);
      return parsed ?? value;
    }

    // Also support JSON values that arrive wrapped in quotes, such as "{...}".
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const inner = trimmed.slice(1, -1).trim();
      if ((inner.startsWith('{') && inner.endsWith('}')) || (inner.startsWith('[') && inner.endsWith(']'))) {
        const parsed = tryParseCandidate(inner);
        return parsed ?? value;
      }
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepParseJsonStrings(item, depth, maxDepth));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, child]) => {
      acc[key] = deepParseJsonStrings(child, depth, maxDepth);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return value;
}

function unquoteJsonString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function cleanJsonFragment(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed === '{' || trimmed === '}' || trimmed === '[' || trimmed === ']') {
    return trimmed;
  }

  const withoutTrailingComma = trimmed.replace(/,\s*$/, '');
  const unquoted = unquoteJsonString(withoutTrailingComma);

  if (unquoted !== withoutTrailingComma) {
    return cleanJsonFragment(unquoted);
  }

  try {
    return deepParseJsonStrings(JSON.parse(withoutTrailingComma));
  } catch {
    return withoutTrailingComma;
  }
}

function normalizeParsedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeParsedJson);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, child]) => {
      const normalizedKey = unquoteJsonString(key);
      acc[normalizedKey] = normalizeParsedJson(child);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return cleanJsonFragment(value);
}

function reconstructJsonFromFragments(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reconstructJsonFromFragments);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, child]) => {
      acc[key] = reconstructJsonFromFragments(child);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return value;
}

function hasJsonFragmentMarkers(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasJsonFragmentMarkers);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasJsonFragmentMarkers);
  }

  return typeof value === 'string' && ['{', '}', '[', ']'].includes(value.trim());
}

function parseLineBasedJson(lines: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current: any = root;
  const stack: any[] = [root];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^(.+?)\s*[:=]\s*(.+)$/);
    if (!match) continue;

    const rawKey = match[1].trim();
    let rawVal = match[2].trim().replace(/,\s*$/, '');
    const key = unquoteJsonString(rawKey);
    const value = cleanJsonFragment(rawVal);

    if (typeof value === 'string' && (value === '{' || value === '[')) {
      const nextContainer = value === '{' ? {} : [];
      if (Array.isArray(current)) {
        current.push(nextContainer);
      } else {
        current[key] = nextContainer;
      }
      stack.push(current);
      current = nextContainer;
      continue;
    }

    if (typeof value === 'string' && (value === '}' || value === ']')) {
      stack.pop();
      current = stack[stack.length - 1] ?? root;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
    } else {
      current[key] = value;
    }
  }

  return root;
}

function parseJsonLike(input: string): unknown {
  const text = input.trim();

  if (!text) {
    throw new Error('Input is empty');
  }

  // ---------------------------------------
  // 1. Try normal JSON + normalization & Deep Parsing nested JSON strings
  // ---------------------------------------
  try {
    const parsed = JSON.parse(text);
    const deepParsed = deepParseJsonStrings(parsed);
    const normalized = normalizeParsedJson(deepParsed);
    if (hasJsonFragmentMarkers(normalized)) {
      return reconstructJsonFromFragments(normalized);
    }
    return normalized;
  } catch {}

  // ---------------------------------------
  // 2. Try a JSON string wrapping
  // ---------------------------------------
  try {
    const parsedString = JSON.parse(text);
    if (typeof parsedString === 'string') {
      return parseJsonLike(parsedString);
    }
  } catch {}

  // ---------------------------------------
  // 3. Parse key=value / key:value with nested fragments
  // ---------------------------------------
  const lines = text.split(/\r?\n/);
  const parsed = parseLineBasedJson(lines);

  if (Object.keys(parsed).length > 0) {
    return deepParseJsonStrings(parsed);
  }

  throw new Error('Unable to parse input');
}

function looksLikeBase64(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  if (!compact) return false;
  if (compact.startsWith('data:')) return compact.includes('base64,');
  if (compact.length < 32) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return false;
  return compact.length % 4 === 0 || compact.length % 4 === 2;
}

function flattenValues(value: unknown, path = 'root'): Array<{ path: string; value: unknown }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenValues(item, `${path}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenValues(child, path === 'root' ? key : `${path}.${key}`),
    );
  }

  return [{ path, value }];
}

function describeBase64Preview(value: string): { previewUrl?: string; kind: 'image' | 'text' } | null {
  if (typeof window === 'undefined') return null;

  const compact = value.replace(/\s+/g, '');
  const payload = compact.startsWith('data:') ? compact.split('base64,')[1] ?? '' : compact;
  if (!payload) return null;

  try {
    const bytes = Uint8Array.from(window.atob(payload), (char) => char.charCodeAt(0));
    if (bytes.length === 0) return null;

    const header = Array.from(bytes.slice(0, 8))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    if (header.startsWith('89504e47')) {
      return { previewUrl: `data:image/png;base64,${payload}`, kind: 'image' };
    }
    if (header.startsWith('ffd8ff')) {
      return { previewUrl: `data:image/jpeg;base64,${payload}`, kind: 'image' };
    }
    if (header.startsWith('47494638')) {
      return { previewUrl: `data:image/gif;base64,${payload}`, kind: 'image' };
    }
    if (header.startsWith('52494646') && bytes.length >= 12) {
      const webpHeader = Array.from(bytes.slice(8, 12))
        .map((byte) => String.fromCharCode(byte))
        .join('');
      if (webpHeader === 'WEBP') {
        return { previewUrl: `data:image/webp;base64,${payload}`, kind: 'image' };
      }
    }
  } catch {
    return null;
  }

  return { kind: 'text' };
}

function collectBase64Previews(value: unknown): PreviewItem[] {
  return flattenValues(value).reduce<PreviewItem[]>((acc, entry) => {
    if (typeof entry.value !== 'string' || !looksLikeBase64(entry.value)) {
      return acc;
    }

    const preview = describeBase64Preview(entry.value);
    if (!preview) {
      return acc;
    }

    acc.push({
      path: entry.path,
      value: entry.value.length > 80 ? `${entry.value.slice(0, 80)}…` : entry.value,
      previewUrl: preview.previewUrl,
      kind: preview.kind,
    });

    return acc;
  }, []);
}

export default function JsonFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);

  const formatJson = (value: unknown) => {
    const sorted =
      sortKeys && value && typeof value === 'object' && !Array.isArray(value)
        ? JSON.parse(JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort()))
        : value;
    return JSON.stringify(sorted, null, indent);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    try {
      const parsed = parseJsonLike(value);
      setOutput(formatJson(parsed));
      setStatus('success');
      setError('');
      setPreviews([]);
    } catch {
      setOutput('');
      setStatus('idle');
      setError('');
      setPreviews([]);
    }
  };

  const previewImages = () => {
    try {
      const parsed = parseJsonLike(input);
      const collected = collectBase64Previews(parsed);
      setOutput(formatJson(parsed));
      setPreviews(collected);
      setStatus('success');
      setError('');

      if (collected.length === 0) {
        if (typeof window !== 'undefined') {
          window.alert('JSON has no Base64 image data');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setOutput('');
      setPreviews([]);
      setStatus('error');
      setError(msg);
    }
  };

  const minify = () => {
    try {
      const parsed = parseJsonLike(input);
      setOutput(JSON.stringify(parsed));
      setPreviews(collectBase64Previews(parsed));
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setStatus('error');
      setError(msg);
      setPreviews([]);
    }
  };

  const validate = () => {
    try {
      parseJsonLike(input);
      setStatus('success');
      setError('');
      setOutput('✓ Valid JSON');
      setPreviews([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      setStatus('error');
      setError(msg);
      setOutput('✗ ' + msg);
      setPreviews([]);
    }
  };

  useEffect(() => {
    handleInputChange(input);
  }, []);

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
          <button className="btn-ghost text-xs" onClick={validate}>
            Validate
          </button>
          <button className="btn-ghost text-xs" onClick={minify}>
            <Minimize2 size={12} />
            Minify
          </button>
          <button className="btn-primary text-xs" onClick={previewImages}>
            <ImageIcon size={12} />
            Preview image
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={
            <CodeEditor
              value={input}
              onChange={handleInputChange}
              placeholder='Paste JSON here… e.g. {"key": "value"}'
              minHeight="100%"
            />
          }
          outputPanel={
            <div className="flex h-full flex-col">
              <div className="flex-1 min-h-0">
                <CodeEditor
                  value={output}
                  onChange={() => {}}
                  readOnly
                  placeholder="Formatted JSON appears here…"
                  minHeight="100%"
                  className="text-emerald-300"
                />
              </div>
              {previews.length > 0 && (
                <div className="border-t border-border bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ImageIcon size={12} />
                    Base64 previews
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {previews.map((preview) => (
                      <div key={preview.path} className="rounded-lg border border-border/70 bg-background/60 p-2">
                        <div className="mb-2 text-[11px] font-mono text-muted-foreground">{preview.path}</div>
                        {preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={preview.path}
                            className="max-h-32 w-full rounded-md border border-border object-contain bg-black/20"
                          />
                        ) : (
                          <div className="rounded-md border border-dashed border-border/60 p-2 text-[11px] text-muted-foreground">
                            {preview.value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
          outputText={output}
          outputStatus={status}
          errorMessage={error}
          onClear={() => {
            setInput('');
            setOutput('');
            setStatus('idle');
            setError('');
            setPreviews([]);
          }}
          onSwap={() => {
            if (output) setInput(output);
          }}
        />
      </div>
    </div>
  );
}