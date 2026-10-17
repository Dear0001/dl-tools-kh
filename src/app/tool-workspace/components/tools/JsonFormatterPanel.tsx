'use client';
import React, { useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { Minimize2, ImageIcon, QrCode, CheckCircle2, Copy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { getEmvQrDetails } from './emvQr';
import {
  detectInputFormat,
  findJsonFragments,
  formatContentOutput,
  type DetectedInputFormat,
  type InputFormatOption,
  type JsonFragment,
  type OutputFormatOption,
} from './jsonContent';

type Status = 'idle' | 'success' | 'error';
type ProcessingAction = 'format' | 'minify' | 'validate';

interface PreviewItem {
  path: string;
  value: string;
  previewUrl?: string;
  kind: 'image' | 'text';
}

interface ContentAnalysis {
  format: Exclude<DetectedInputFormat, 'empty' | 'invalid-json'>;
  value?: unknown;
  fragments: JsonFragment[];
  error?: string;
}

interface DecodedQrItem {
  path: string;
  previewUrl: string;
  payload?: string;
  currencyCode?: string;
  currencyName?: string;
  hasDualCurrency?: boolean;
  merchantAccountCount?: number;
  crcValid?: boolean | null;
  error?: string;
}

/**
 * Recursively parses any string values inside objects/arrays that represent valid JSON strings.
 * This version prevents double-parsing by tracking which strings have already been parsed.
 */
function deepParseJsonStrings(value: unknown, depth = 0, maxDepth = 15, parsedSet = new Set<string>()): unknown {
  if (depth >= maxDepth) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;

    // Check if we've already parsed this exact string to prevent infinite recursion
    if (parsedSet.has(trimmed)) return value;
    
    // Only attempt to parse if it looks like JSON
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                          (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (!looksLikeJson) return value;

    try {
      // Mark this string as being parsed
      parsedSet.add(trimmed);
      const parsed = JSON.parse(trimmed);
      // Recursively parse the result
      return deepParseJsonStrings(parsed, depth + 1, maxDepth, parsedSet);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepParseJsonStrings(item, depth + 1, maxDepth, parsedSet));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      // Don't re-parse strings that are already valid JSON objects
      if (typeof child === 'string' && 
          (child.trim().startsWith('{') || child.trim().startsWith('[')) &&
          parsedSet.has(child.trim())) {
        result[key] = child;
      } else {
        result[key] = deepParseJsonStrings(child, depth + 1, maxDepth, parsedSet);
      }
    }
    return result;
  }

  return value;
}

/**
 * Specifically handles the apiResponse format where responseObj contains nested JSON
 */
function parseApiResponseWithNestedJson(input: string): unknown {
  try {
    const parsed = JSON.parse(input);
    
    // Helper to process an object and its children
    function processObject(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => processObject(item));
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          // Only parse if it looks like a JSON object or array
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              // Parse the string once
              const parsedValue = JSON.parse(trimmed);
              // Recursively process the parsed value
              result[key] = processObject(parsedValue);
              continue;
            } catch {
              // If parsing fails, keep as string
              result[key] = value;
              continue;
            }
          }
        }
        // Recursively process nested objects
        result[key] = processObject(value);
      }
      return result;
    }
    
    // Process the entire parsed object
    return processObject(parsed);
  } catch {
    return null;
  }
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

function repairEscapedBase64Padding(input: string): string {
  return input.replace(
    /(?<=[A-Za-z0-9+/])(?:\\=){1,2}(?=\\")/g,
    (padding) => padding.replace(/\\=/g, '='),
  );
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
  const text = repairEscapedBase64Padding(input.trim());

  if (!text) {
    throw new Error('Input is empty');
  }

  // ---------------------------------------
  // 1. Try the specialized API response parser first
  // ---------------------------------------
  const apiResult = parseApiResponseWithNestedJson(text);
  if (apiResult !== null) {
    return apiResult;
  }

  // ---------------------------------------
  // 2. Try normal JSON with deep parsing
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
  // 3. Try a JSON string wrapping
  // ---------------------------------------
  try {
    const parsedString = JSON.parse(text);
    if (typeof parsedString === 'string') {
      return parseJsonLike(parsedString);
    }
  } catch {}

  // ---------------------------------------
  // 4. Parse key=value / key:value with nested fragments
  // ---------------------------------------
  const lines = text.split(/\r?\n/);
  const parsed = parseLineBasedJson(lines);

  if (Object.keys(parsed).length > 0) {
    return deepParseJsonStrings(parsed);
  }

  throw new Error('Unable to parse input');
}

function looksLikeLegacyJsonInput(input: string): boolean {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.every((line) => /^[^:=]+?\s*[:=]\s*.+$/.test(line) || /^[{}\[\],]+$/.test(line));
  }
  const line = input.trim();
  return (
    /^[A-Za-z_$][\w$.-]*\s*=\s*.+$/.test(line) ||
    (/^[A-Za-z_$][\w$.-]*\s*:\s*(?!\/\/).+$/.test(line) && !line.includes('://'))
  );
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

function decodeQrImage(previewUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not read image pixels.'));
          return;
        }

        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (!code) {
          reject(new Error('No QR code detected in this image.'));
          return;
        }

        resolve(code.data);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Could not decode this image.'));
      }
    };
    image.onerror = () => reject(new Error('Could not load this image.'));
    image.src = previewUrl;
  });
}

export default function JsonFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [inputFormat, setInputFormat] = useState<InputFormatOption>('auto');
  const [outputFormat, setOutputFormat] = useState<OutputFormatOption>('auto');
  const [detectedFormat, setDetectedFormat] = useState<DetectedInputFormat>('empty');
  const [outputLanguage, setOutputLanguage] = useState<'json' | 'text'>('json');
  const [processingAction, setProcessingAction] = useState<ProcessingAction>('format');
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [showImagePreviews, setShowImagePreviews] = useState(false);
  const [decodedQrItems, setDecodedQrItems] = useState<DecodedQrItem[]>([]);
  const [decodingQr, setDecodingQr] = useState(false);
  const [copiedPayloadPath, setCopiedPayloadPath] = useState<string | null>(null);
  const [copiedImagePath, setCopiedImagePath] = useState<string | null>(null);
  const decodedEmvQrItems = decodedQrItems.filter((item) => item.hasDualCurrency !== undefined);
  const hasDualCurrency = decodedEmvQrItems.some((item) => item.hasDualCurrency);
  const dualCurrencySummary =
    decodedEmvQrItems.length === 0
      ? 'Could not determine'
      : hasDualCurrency
        ? 'Yes · tag 40 detected'
        : 'No · single account';

  const formatJson = (value: unknown) => {
    const sorted =
      sortKeys && value && typeof value === 'object' && !Array.isArray(value)
        ? JSON.parse(JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort()))
        : value;
    return JSON.stringify(sorted, null, indent);
  };

  const analyzeContent = (value: string, selectedFormat = inputFormat): ContentAnalysis => {
    if (!value.trim()) {
      return { format: 'string', value, fragments: [] };
    }

    // Some API clients escape Base64 padding as \= inside otherwise valid JSON.
    // Normalize it before strict format detection so parseJsonLike can repair the
    // response instead of rejecting the whole document as invalid JSON.
    const parseableValue = repairEscapedBase64Padding(value);

    if (selectedFormat === 'string') {
      return { format: 'string', value, fragments: [] };
    }

    const fragments = findJsonFragments(parseableValue);
    if (selectedFormat === 'mixed') {
      return { format: 'mixed', fragments };
    }

    const detected = detectInputFormat(parseableValue);
    if (selectedFormat === 'auto' && detected.format === 'invalid-json') {
      return { format: 'json', fragments: [], error: detected.error };
    }
    if (selectedFormat === 'auto' && detected.format === 'mixed') {
      return { format: 'mixed', fragments };
    }
    if (selectedFormat === 'auto' && detected.format === 'string') {
      if (!looksLikeLegacyJsonInput(value)) {
        return { format: 'string', value, fragments: [] };
      }
      try {
        return { format: 'json', value: parseJsonLike(parseableValue), fragments: [] };
      } catch {
        return { format: 'string', value, fragments: [] };
      }
    }

    if (detected.format === 'invalid-json') {
      return { format: 'json', fragments: [], error: detected.error };
    }

    try {
      return { format: 'json', value: parseJsonLike(parseableValue), fragments: [] };
    } catch (parseError) {
      const message =
        selectedFormat === 'json'
          ? `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Could not parse the input.'}`
          : 'Invalid JSON';
      return { format: 'json', fragments: [], error: message };
    }
  };

  const processContent = (
    value: string,
    action: ProcessingAction,
    selectedInput = inputFormat,
    selectedOutput = outputFormat,
  ) => {
    if (!value.trim()) {
      setDetectedFormat('empty');
      setOutput('');
      setStatus(action === 'format' ? 'idle' : 'error');
      setError(action === 'format' ? '' : 'Input is empty.');
      setOutputLanguage('text');
      return;
    }

    const analysis = analyzeContent(value, selectedInput);
    const detected =
      selectedInput === 'string'
        ? 'string'
        : selectedInput === 'mixed'
          ? 'mixed'
          : analysis.error
            ? 'invalid-json'
            : analysis.format;
    setDetectedFormat(detected);
    setOutputLanguage(
      selectedOutput === 'json' || (selectedOutput === 'auto' && analysis.format === 'json') ? 'json' : 'text',
    );

    if (analysis.error) {
      setOutput('');
      setStatus('error');
      setError(analysis.error);
      return;
    }

    if (action === 'validate') {
      const message =
        analysis.format === 'json'
          ? '✓ Valid JSON / JSON-like input'
          : analysis.format === 'mixed'
            ? `✓ Mixed content · ${analysis.fragments.length} valid JSON fragment${analysis.fragments.length === 1 ? '' : 's'}`
            : 'Plain string detected · JSON validation does not apply';
      setOutput(message);
      setStatus('success');
      setError('');
      return;
    }

    setOutput(
      formatContentOutput(
        value,
        analysis.format,
        analysis.value,
        analysis.fragments,
        selectedOutput,
        indent,
        action === 'minify',
        formatJson,
      ),
    );
    setStatus('success');
    setError('');
  };

  const changeInputFormat = (value: InputFormatOption) => {
    setInputFormat(value);
    setProcessingAction('format');
    setPreviews([]);
    setDecodedQrItems([]);
    setShowImagePreviews(false);
    processContent(input, 'format', value);
  };

  const changeOutputFormat = (value: OutputFormatOption) => {
    setOutputFormat(value);
    setProcessingAction('format');
    setShowImagePreviews(false);
    processContent(input, 'format', inputFormat, value);
  };

  const copyDecodedPayload = async (item: DecodedQrItem) => {
    if (!item.payload) return;

    try {
      await navigator.clipboard.writeText(item.payload);
      setCopiedPayloadPath(item.path);
      toast.success('Decoded EMV® payload copied');
      window.setTimeout(() => setCopiedPayloadPath(null), 1600);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard access was denied.';
      toast.error(`Could not copy decoded payload: ${message}`);
    }
  };

  const copyPreviewImage = async (preview: PreviewItem) => {
    if (!preview.previewUrl) return;

    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Image clipboard access is not supported in this browser.');
      }

      const response = await fetch(preview.previewUrl);
      if (!response.ok) {
        throw new Error('Could not load the preview image.');
      }

      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        throw new Error('Could not prepare the image for copying.');
      }

      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not convert the image for copying.'));
        }, 'image/png');
      });

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopiedImagePath(preview.path);
      toast.success('Image copied to clipboard');
      window.setTimeout(() => setCopiedImagePath(null), 1600);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard access was denied.';
      toast.error(`Could not copy image: ${message}`);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setProcessingAction('format');
    setShowImagePreviews(false);
    setPreviews([]);
    setDecodedQrItems([]);
    processContent(value, 'format');
  };

  const previewImages = () => {
    if (!input.trim()) {
      processContent(input, 'validate');
      setShowImagePreviews(false);
      return;
    }

    const analysis = analyzeContent(input);
    setProcessingAction('format');
    setDetectedFormat(analysis.error ? 'invalid-json' : analysis.format);
    setDecodedQrItems([]);
    if (analysis.error) {
      setOutput('');
      setPreviews([]);
      setShowImagePreviews(false);
      setStatus('error');
      setError(analysis.error);
      return;
    }

    const collected =
      analysis.format === 'json'
        ? collectBase64Previews(analysis.value)
        : analysis.format === 'mixed'
          ? analysis.fragments.flatMap((fragment, index) =>
              collectBase64Previews(fragment.value).map((preview) => ({
                ...preview,
                path: `fragment ${index + 1}.${preview.path}`,
              })),
            )
          : [];
    setOutput(
      formatContentOutput(
        input,
        analysis.format,
        analysis.value,
        analysis.fragments,
        outputFormat,
        indent,
        false,
        formatJson,
      ),
    );
    setOutputLanguage(outputFormat === 'json' || (outputFormat === 'auto' && analysis.format === 'json') ? 'json' : 'text');
    setPreviews(collected);
    setShowImagePreviews(collected.length > 0);
    setStatus('success');
    setError('');
    if (collected.length === 0) {
      toast.error(
        analysis.format === 'string'
          ? 'Image preview requires JSON or mixed content containing a Base64 image'
          : 'No Base64 images found in the input',
      );
    }
  };

  const decodeQrImages = async () => {
    const images = previews.filter(
      (preview): preview is PreviewItem & { previewUrl: string } => Boolean(preview.previewUrl),
    );
    if (images.length === 0) {
      toast.error('No supported Base64 images to scan');
      return;
    }

    setDecodingQr(true);
    setDecodedQrItems([]);
    try {
      const decodedItems = await Promise.all(
        images.map(async (preview): Promise<DecodedQrItem> => {
          try {
            const payload = await decodeQrImage(preview.previewUrl);
            const details = getEmvQrDetails(payload);
            if (!details.isEmvQr) {
              return {
                path: preview.path,
                previewUrl: preview.previewUrl,
                payload,
                error: 'QR decoded, but no EMV® currency tag was found.',
              };
            }

            return {
              path: preview.path,
              previewUrl: preview.previewUrl,
              payload,
              currencyCode: details.currencyCode ?? undefined,
              currencyName: details.currencyName ?? undefined,
              hasDualCurrency: details.hasDualCurrency ?? undefined,
              merchantAccountCount: details.merchantAccountCount,
              crcValid: details.crcValid,
            };
          } catch (error) {
            return {
              path: preview.path,
              previewUrl: preview.previewUrl!,
              error: error instanceof Error ? error.message : 'Could not decode this image.',
            };
          }
        }),
      );

      setDecodedQrItems(decodedItems);
      const emvCount = decodedItems.filter((item) => item.currencyCode).length;
      if (emvCount > 0) {
        toast.success(`${emvCount} EMV® QR code${emvCount === 1 ? '' : 's'} decoded`);
      } else {
        toast.error('No EMV® QR codes found in the detected images');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected decoding error.';
      toast.error(`Could not decode the detected images: ${message}`);
    } finally {
      setDecodingQr(false);
    }
  };

  const minify = () => {
    setProcessingAction('minify');
    setShowImagePreviews(false);
    setPreviews([]);
    setDecodedQrItems([]);
    processContent(input, 'minify');
  };

  const validate = () => {
    setProcessingAction('validate');
    setPreviews([]);
    setShowImagePreviews(false);
    setDecodedQrItems([]);
    processContent(input, 'validate');
  };

  useEffect(() => {
    processContent(input, processingAction);
  }, [sortKeys, indent]);

  return (
    <div className="h-full flex flex-col">
      {/* Config bar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <label htmlFor="json-input-format" className="text-xs text-muted-foreground font-medium">Input</label>
          <select
            id="json-input-format"
            className="select-input"
            value={inputFormat}
            onChange={(event) => changeInputFormat(event.target.value as InputFormatOption)}
          >
            <option value="auto">Auto detect</option>
            <option value="string">Plain string</option>
            <option value="json">JSON / JSON-like</option>
            <option value="mixed">JSON + string</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Detected: <span className="font-medium text-foreground">
            {detectedFormat === 'empty'
              ? 'Waiting for input'
              : detectedFormat === 'json'
                ? 'JSON'
                : detectedFormat === 'string'
                  ? 'Plain string'
                  : detectedFormat === 'mixed'
                    ? 'Mixed content'
                    : 'Invalid JSON'}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="json-output-format" className="text-xs text-muted-foreground font-medium">Output</label>
          <select
            id="json-output-format"
            className="select-input"
            value={outputFormat}
            onChange={(event) => changeOutputFormat(event.target.value as OutputFormatOption)}
          >
            <option value="auto">Match input</option>
            <option value="string">Plain string</option>
            <option value="json">JSON</option>
          </select>
        </div>
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
              placeholder={'Paste plain text, JSON, or text containing JSON…\n{"key": "value"}'}
              minHeight="100%"
            />
          }
          outputPanel={
            <div className="flex h-full flex-col">
              {!showImagePreviews && (
                <div key="formatted-output" className="flex-1 min-h-0">
                  <CodeOutput
                    value={output}
                    language={outputLanguage}
                    placeholder="Formatted output appears here…"
                  />
                </div>
              )}
              {showImagePreviews && previews.length > 0 && (
                <div key="image-previews" className="flex-1 min-h-0 overflow-auto bg-secondary/20 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ImageIcon size={12} />
                    Base64 previews
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => setShowImagePreviews(false)}
                    >
                      Show formatted JSON
                    </button>
                    {previews.some((preview) => preview.previewUrl) && (
                      <button
                        className="btn-ghost text-xs"
                        onClick={decodeQrImages}
                        disabled={decodingQr}
                      >
                        <QrCode size={13} />
                        {decodingQr ? 'Decoding QR codes…' : 'Decode EMV® QR Codes'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                    {previews.map((preview) => (
                      <div key={preview.path} className="rounded-lg border border-border/70 bg-background/60 p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[11px] font-mono text-muted-foreground" title={preview.path}>
                            {preview.path}
                          </div>
                          {preview.previewUrl && (
                            <button
                              type="button"
                              className="btn-ghost flex-shrink-0 text-[11px]"
                              onClick={() => copyPreviewImage(preview)}
                              title={`Copy image from ${preview.path}`}
                            >
                              {copiedImagePath === preview.path ? (
                                <CheckCircle2 size={13} className="text-primary" />
                              ) : (
                                <Copy size={13} />
                              )}
                              {copiedImagePath === preview.path ? 'Copied' : 'Copy image'}
                            </button>
                          )}
                        </div>
                        {preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={preview.path}
                            className="h-56 w-full rounded-md border border-border object-contain bg-muted/50 md:h-72"
                          />
                        ) : (
                          <div className="rounded-md border border-dashed border-border/60 p-2 text-[11px] text-muted-foreground">
                            {preview.value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {decodedQrItems.length > 0 && (
                    <section className="space-y-3 border-t border-border pt-3" aria-labelledby="emv-qr-heading">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 id="emv-qr-heading" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          EMV® QR Codes
                        </h3>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5">
                          {hasDualCurrency ? (
                            <CheckCircle2 size={14} className="text-primary" />
                          ) : (
                            <XCircle size={14} className="text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">Dual-currency indicator:</span>
                          <span className={`text-xs font-semibold ${hasDualCurrency ? 'text-primary' : 'text-foreground'}`}>
                            {dualCurrencySummary}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {decodedQrItems.map((item) => (
                          <article
                            key={item.path}
                            className="grid gap-3 rounded-xl border border-border bg-background/50 p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                          >
                            <img
                              src={item.previewUrl}
                              alt={`Decoded QR image from ${item.path}`}
                              className="mx-auto max-h-28 w-28 rounded-lg bg-white object-contain p-1"
                            />
                            <div className="min-w-0 space-y-2">
                              <p className="truncate text-[11px] font-mono text-muted-foreground" title={item.path}>
                                {item.path}
                              </p>
                              {item.currencyName ? (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                  <span className="font-semibold text-foreground">{item.currencyName} ({item.currencyCode})</span>
                                  {item.crcValid !== null && item.crcValid !== undefined && (
                                    <span className={item.crcValid ? 'text-primary' : 'text-red-400'}>
                                      CRC {item.crcValid ? 'valid' : 'mismatch'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-400">{item.error}</p>
                              )}
                              {item.hasDualCurrency !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  {item.hasDualCurrency ? 'Dual currency · tag 40' : 'Single account · no tag 40'}
                                  {item.merchantAccountCount !== undefined &&
                                    ` · ${item.merchantAccountCount} merchant account template${item.merchantAccountCount === 1 ? '' : 's'}`}
                                </p>
                              )}
                              {item.payload && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Decoded EMV® payload
                                  </summary>
                                  <button
                                    type="button"
                                    className="btn-ghost mt-2 text-xs"
                                    onClick={() => copyDecodedPayload(item)}
                                  >
                                    {copiedPayloadPath === item.path ? (
                                      <CheckCircle2 size={13} className="text-primary" />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                    {copiedPayloadPath === item.path ? 'Copied' : 'Copy payload'}
                                  </button>
                                  <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 font-mono text-[11px] text-foreground">
                                    {item.payload}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
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
            setDetectedFormat('empty');
            setProcessingAction('format');
            setOutputLanguage('text');
            setPreviews([]);
            setShowImagePreviews(false);
            setDecodedQrItems([]);
          }}
          onSwap={() => {
            if (output) handleInputChange(output);
          }}
        />
      </div>
    </div>
  );
}
