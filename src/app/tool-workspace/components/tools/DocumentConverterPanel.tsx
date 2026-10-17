'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowDownToLine, ArrowLeftRight, Check, FileText, Files, LoaderCircle, Upload, X } from 'lucide-react';
import type { Tool } from '@/data/tools';
import { useLocale } from '@/i18n/LocaleProvider';

type ConversionMode = 'pdf-to-docx' | 'docx-to-pdf' | 'image-to-pdf' | 'image-to-docx';
type ConversionResult = { url: string; previewUrl: string; filename: string; type: 'application/pdf' | 'docx' };
type JsonObject = Record<string, unknown>;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResponseError(
  response: Response,
  fallback: string,
  translate: (key: 'rateLimited' | 'fileTooLarge' | 'serviceUnavailable') => string,
): string {
  if (response.status === 429) return translate('rateLimited');
  if (response.status === 413) return translate('fileTooLarge');
  if (response.status === 503 || response.status === 502) return translate('serviceUnavailable');
  return fallback;
}

export default function DocumentConverterPanel({ tool: _tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const [mode, setMode] = useState<ConversionMode>(() =>
    _tool.id === 'tool-image-to-pdf' ? 'image-to-pdf' : _tool.id === 'tool-image-to-word' ? 'image-to-docx' : 'pdf-to-docx',
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const conversionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file || mode === 'docx-to-pdf') {
      setSourcePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setSourcePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, mode]);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
      requestControllerRef.current?.abort();
    };
  }, []);

  const clearResult = () => {
    setResult(null);
    setError('');
  };

  const selectFile = (nextFile?: File) => {
    clearResult();
    setProgress(0);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const filename = nextFile.name.toLowerCase();
    const isImageMode = mode === 'image-to-pdf' || mode === 'image-to-docx';
    const validImage = /\.(jpe?g|png|tiff?|webp|bmp|gif)$/.test(filename);
    const validDocument = mode === 'pdf-to-docx' ? filename.endsWith('.pdf') : filename.endsWith('.docx');
    if (isImageMode ? !validImage || !nextFile.type.startsWith('image/') : !validDocument) {
      setFile(null);
      setError(t('invalidFile'));
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(t('fileTooLarge'));
      return;
    }
    setError('');
    setFile(nextFile);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const changeMode = (nextMode: ConversionMode) => {
    if (busy) return;
    setMode(nextMode);
    setFile(null);
    clearResult();
    setError('');
    setProgress(0);
  };

  const cancelJob = async (token: string) => {
    try {
      const response = await fetch('/api/converter/jobs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) console.error(`Could not cancel conversion job (${response.status}).`);
    } catch (cancelError) {
      console.error('Could not cancel conversion job.', cancelError);
    }
  };

  const convert = async () => {
    if (!file || busy) return;
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setBusy(true);
    setProgress(0);
    setError('');

    try {
      const startResponse = await fetch('/api/converter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, filename: file.name, size: file.size }),
        signal: controller.signal,
      });
      if (!startResponse.ok) throw new Error(getResponseError(startResponse, t('conversionFailed'), (key) => t(key)));

      const startPayload: unknown = await startResponse.json();
      if (
        !isObject(startPayload) ||
        typeof startPayload.token !== 'string' ||
        !isObject(startPayload.upload) ||
        typeof startPayload.upload.url !== 'string' ||
        !isObject(startPayload.upload.parameters)
      ) {
        throw new Error(t('serviceUnavailable'));
      }
      const token = startPayload.token;
      const uploadUrl = startPayload.upload.url;
      const parameters = startPayload.upload.parameters;
      if (
        !/^[a-f0-9]{64}$/i.test(token) ||
        Object.values(parameters).some((value) => typeof value !== 'string')
      ) {
        throw new Error(t('serviceUnavailable'));
      }
      conversionTokenRef.current = token;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', uploadUrl);
        xhr.timeout = 240_000;
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.min(45, Math.round((event.loaded / event.total) * 45)));
        };
        xhr.onload = () => {
          xhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(t('conversionFailed')));
        };
        xhr.onerror = () => {
          xhrRef.current = null;
          reject(new Error(t('serviceUnavailable')));
        };
        xhr.ontimeout = () => {
          xhrRef.current = null;
          reject(new Error(t('conversionFailed')));
        };
        xhr.onabort = () => {
          xhrRef.current = null;
          reject(new DOMException('Upload aborted.', 'AbortError'));
        };
        controller.signal.addEventListener('abort', () => xhr.abort(), { once: true });

        const uploadData = new FormData();
        for (const [name, value] of Object.entries(parameters)) {
          if (typeof value === 'string') uploadData.append(name, value);
        }
        uploadData.append('file', file, file.name);
        xhr.send(uploadData);
      });
      setProgress(45);

      const deadline = Date.now() + 8 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = window.setTimeout(resolve, 2000);
          controller.signal.addEventListener(
            'abort',
            () => {
              window.clearTimeout(timeoutId);
              reject(new DOMException('Conversion cancelled.', 'AbortError'));
            },
            { once: true },
          );
        });
        const statusResponse = await fetch('/api/converter/jobs', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!statusResponse.ok) {
          throw new Error(getResponseError(statusResponse, t('conversionFailed'), (key) => t(key)));
        }

        const statusPayload: unknown = await statusResponse.json();
        if (!isObject(statusPayload) || typeof statusPayload.status !== 'string') {
          throw new Error(t('serviceUnavailable'));
        }
        if (statusPayload.status === 'error') throw new Error(t('conversionFailed'));
        if (statusPayload.status === 'finished') {
          if (
            typeof statusPayload.filename !== 'string' ||
            typeof statusPayload.downloadUrl !== 'string' ||
            typeof statusPayload.previewUrl !== 'string'
          ) {
            throw new Error(t('serviceUnavailable'));
          }
          setProgress(100);
          setResult({
            url: statusPayload.downloadUrl,
            previewUrl: statusPayload.previewUrl,
            filename: statusPayload.filename,
            type: mode === 'docx-to-pdf' || mode === 'image-to-pdf' ? 'application/pdf' : 'docx',
          });
          return;
        }
        if (statusPayload.status !== 'waiting' && statusPayload.status !== 'processing') {
          throw new Error(t('serviceUnavailable'));
        }
        setProgress(70);
      }
      throw new Error(t('conversionFailed'));
    } catch (conversionError) {
      if (!controller.signal.aborted) {
        setError(conversionError instanceof Error ? conversionError.message : t('conversionFailed'));
        const token = conversionTokenRef.current;
        conversionTokenRef.current = null;
        if (token) void cancelJob(token);
      }
    } finally {
      setBusy(false);
      requestControllerRef.current = null;
      xhrRef.current = null;
    }
  };

  const reset = () => {
    const token = conversionTokenRef.current;
    conversionTokenRef.current = null;
    requestControllerRef.current?.abort();
    xhrRef.current?.abort();
    if (token) void cancelJob(token);
    setBusy(false);
    setFile(null);
    setProgress(0);
    clearResult();
    setError('');
  };

  const isImageMode = mode === 'image-to-pdf' || mode === 'image-to-docx';
  const targetLabel = mode === 'pdf-to-docx'
    ? t('pdfToWord')
    : mode === 'docx-to-pdf'
      ? t('wordToPdf')
      : mode === 'image-to-pdf'
        ? t('imageToPdf')
        : t('imageToWord');
  const accepted = mode === 'pdf-to-docx'
    ? '.pdf,application/pdf'
    : mode === 'docx-to-pdf'
      ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'image/jpeg,image/png,image/tiff,image/webp,image/bmp,image/gif';
  const title = isImageMode ? t('imageConversion') : t('fileConversion');

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400">
              <Files size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
                {locale === 'kh' ? 'ឯកសារ · អង់គ្លេស + ខ្មែរ' : 'DOCUMENTS · ENGLISH + KHMER'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{isImageMode ? t('imageConverterSubtitle') : t('converterSubtitle')}</p>
            </div>
          </div>
          <p className="relative mt-5 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            {t('privacyNotice')}
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-label={title}>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-background p-1.5">
            {([
              ['pdf-to-docx', t('pdfToWord')],
              ['docx-to-pdf', t('wordToPdf')],
              ['image-to-pdf', t('imageToPdf')],
              ['image-to-docx', t('imageToWord')],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                aria-pressed={mode === value}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ArrowLeftRight size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {!result && (
            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) setDragging(false);
              }}
              onDrop={onDrop}
              className={`mt-5 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-background/40'
              }`}
            >
              <input ref={inputRef} type="file" accept={accepted} className="sr-only" onChange={onInputChange} />
              {file ? (
                <div className="flex w-full max-w-lg items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
                  <FileText size={20} className="shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{t('selectedFile')}</p>
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button type="button" className="btn-icon" onClick={() => selectFile(undefined)} aria-label={locale === 'kh' ? 'ដកឯកសារ' : 'Remove file'}>
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 rounded-full border border-border bg-card p-3 text-primary">
                    <Upload size={20} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t('dropFile')}</p>
                  <p className="my-1 text-xs text-muted-foreground">{t('or')}</p>
                  <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => inputRef.current?.click()}>
                    {t('chooseFile')}
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {isImageMode ? t('acceptedImage') : mode === 'pdf-to-docx' ? t('acceptedPdf') : t('acceptedDocx')}
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          {busy && (
            <div className="mt-4 space-y-2" aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle size={15} className="animate-spin text-primary" aria-hidden="true" />
                <span>{progress < 45 ? t('uploading') : t('converting')}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full bg-primary transition-all duration-300 ${progress >= 45 ? 'w-full animate-pulse opacity-60' : ''}`}
                  style={progress < 45 ? { width: `${Math.max(progress, 5)}%` } : undefined}
                />
              </div>
            </div>
          )}

          {result ? (
            <div className="mt-5 space-y-5">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Check size={18} className="shrink-0 text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t('conversionReady')}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('resultFile')}: {result.filename}</p>
                  </div>
                </div>
                <a
                  href={result.url}
                  className="btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm"
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  {t('download')}
                </a>
              </div>

              {result.type === 'application/pdf' ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <p className="border-b border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground">{t('resultPreview')}</p>
                  <iframe title={t('resultPreview')} src={result.previewUrl} className="h-[min(65vh,48rem)] w-full bg-white" />
                </div>
              ) : sourcePreviewUrl ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <p className="border-b border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground">{isImageMode ? t('imagePreview') : t('sourcePreview')}</p>
                  {isImageMode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sourcePreviewUrl} alt={t('imagePreview')} className="mx-auto max-h-[min(65vh,48rem)] w-auto max-w-full object-contain" />
                  ) : (
                    <iframe title={t('sourcePreview')} src={sourcePreviewUrl} className="h-[min(65vh,48rem)] w-full bg-white" />
                  )}
                </div>
              ) : null}

              <p className="text-xs leading-5 text-muted-foreground">
                {mode === 'pdf-to-docx' ? `${t('layoutNote')} ${t('scannedPdf')}` : t('layoutNote')}
              </p>
              <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={reset}>
                {t('convertAnother')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={convert}
              disabled={!file || busy}
              className="btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
              {busy ? t('converting') : `${t('convert')} · ${targetLabel}`}
            </button>
          )}
        </section>

        <p className="px-1 text-xs leading-5 text-muted-foreground">
          {locale === 'kh'
            ? 'រូបភាពទៅ Word និង PDF ដែលបានស្កេនប្រើ OCR របស់សេវាបម្លែង។ លទ្ធផលអាចខុសគ្នាតាមគុណភាពរូបភាព ភាសា និងប្លង់។'
            : 'Image to Word and scanned PDF conversions use provider OCR. Results vary with image quality, language, and layout.'}
        </p>
      </div>
    </div>
  );
}
