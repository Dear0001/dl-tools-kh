'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowDownToLine, ArrowLeftRight, Check, FileText, Files, LoaderCircle, Upload, X } from 'lucide-react';
import type { Tool } from '@/data/tools';
import { useLocale } from '@/i18n/LocaleProvider';
import type { Paragraph as DocxParagraph } from 'docx';
import type { jsPDF as JsPdfDocument } from 'jspdf';

type ConversionMode = 'pdf-to-docx' | 'docx-to-pdf' | 'image-to-pdf' | 'image-to-docx';
type ConversionResult = { url: string; previewUrl: string; filename: string; type: 'application/pdf' | 'docx' };

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function loadBrowserImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };
    image.src = imageUrl;
  });
}

function sanitizeDocumentHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUP', 'SUB', 'BR', 'IMG']);
  const clean = (parent: ParentNode) => {
    for (const child of Array.from(parent.childNodes)) {
      if (!(child instanceof HTMLElement)) continue;
      if (!allowed.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG'].includes(child.tagName)) child.remove();
        else {
          clean(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      const source = child.tagName === 'IMG' ? child.getAttribute('src') : null;
      const alt = child.tagName === 'IMG' ? child.getAttribute('alt') : null;
      for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      if (child.tagName === 'IMG') {
        if (!source || !/^data:image\/(png|jpeg|gif|bmp);base64,/i.test(source)) {
          child.remove();
          continue;
        }
        child.setAttribute('src', source);
        if (alt) child.setAttribute('alt', alt);
        child.setAttribute('style', 'max-width:100%;height:auto');
      }
      clean(child);
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

export default function DocumentConverterPanel({ tool: _tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const [mode, setMode] = useState<ConversionMode>(() =>
    _tool.id === 'tool-image-to-pdf' ? 'image-to-pdf' : _tool.id === 'tool-image-to-word' ? 'image-to-docx' : 'pdf-to-docx',
  );
  const isImageMode = mode === 'image-to-pdf' || mode === 'image-to-docx';
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] ?? null;
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [sourcePreviewUrls, setSourcePreviewUrls] = useState<Array<{ name: string; url: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const localResultUrlRef = useRef('');

  useEffect(() => {
    if (files.length === 0 || mode === 'docx-to-pdf') {
      setSourcePreviewUrls([]);
      return;
    }
    const previews = files.map((sourceFile) => ({ name: sourceFile.name, url: URL.createObjectURL(sourceFile) }));
    setSourcePreviewUrls(previews);
    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files, mode]);

  useEffect(() => () => {
    if (localResultUrlRef.current) URL.revokeObjectURL(localResultUrlRef.current);
  }, []);

  const clearResult = () => {
    if (localResultUrlRef.current) {
      URL.revokeObjectURL(localResultUrlRef.current);
      localResultUrlRef.current = '';
    }
    setResult(null);
    setError('');
  };

  const convertImagesToPdf = async () => {
    const { jsPDF } = await import('jspdf');
    let pdf: JsPdfDocument | null = null;
    const margin = 10;

    for (const [index, sourceFile] of files.entries()) {
      setProgress(Math.round((index / files.length) * 90));
      const image = await loadBrowserImage(sourceFile);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the image for PDF conversion.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.94);
      const orientation = image.naturalWidth >= image.naturalHeight ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
      else pdf.addPage('a4', orientation);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const scale = Math.min((pageWidth - margin * 2) / image.naturalWidth, (pageHeight - margin * 2) / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      pdf.addImage(imageData, 'JPEG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST');
      setProgress(Math.round(((index + 1) / files.length) * 90));
    }

    if (!pdf) throw new Error(t('invalidFile'));
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    localResultUrlRef.current = url;
    const baseName = file?.name.replace(/\.[^.]+$/, '') || 'images';
    setResult({ url, previewUrl: url, filename: `${baseName}${files.length > 1 ? '-images' : ''}.pdf`, type: 'application/pdf' });
  };

  const convertImagesToWord = async () => {
    const { Document, ImageRun, Packer, Paragraph } = await import('docx');
    const paragraphs: DocxParagraph[] = [];
    for (const [index, sourceFile] of files.entries()) {
      setProgress(Math.round((index / files.length) * 85));
      const image = await loadBrowserImage(sourceFile);
      const maxWidth = 600;
      const maxHeight = 700;
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the image for Word conversion.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const imageData = canvas.toDataURL('image/png');
      paragraphs.push(new Paragraph({
        children: [new ImageRun({
          data: imageData,
          type: 'png',
          transformation: { width, height },
          altText: { name: sourceFile.name, title: sourceFile.name, description: `Original image: ${sourceFile.name}` },
        })],
        pageBreakBefore: index > 0,
      }));
      setProgress(Math.round(((index + 1) / files.length) * 85));
    }

    const documentFile = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(documentFile);
    const url = URL.createObjectURL(blob);
    localResultUrlRef.current = url;
    const baseName = file?.name.replace(/\.[^.]+$/, '') || 'images';
    setResult({ url, previewUrl: '', filename: `${baseName}${files.length > 1 ? '-images' : ''}.docx`, type: 'docx' });
  };

  const convertPdfToWord = async () => {
    const [{ getDocument, GlobalWorkerOptions }, { Document, Packer, Paragraph }] = await Promise.all([
      import('pdfjs-dist'),
      import('docx'),
    ]);
    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const pdf = await getDocument({ data: new Uint8Array(await file!.arrayBuffer()) }).promise;
    if (pdf.numPages > 100) throw new Error(t('tooManyPdfPages'));
    const paragraphs: DocxParagraph[] = [];
    let extractedCharacters = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setProgress(Math.round((pageNumber / pdf.numPages) * 80));
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is typeof item & { str: string; transform: number[]; width: number } => 'str' in item && 'transform' in item && 'width' in item);
      const rows: Array<{ y: number; items: typeof items }> = [];
      for (const item of items) {
        const y = item.transform[5];
        let row = rows.find((candidate) => Math.abs(candidate.y - y) < 3);
        if (!row) {
          row = { y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }
      rows.sort((a, b) => b.y - a.y);
      rows.forEach((row, rowIndex) => {
        row.items.sort((a, b) => a.transform[4] - b.transform[4]);
        let line = '';
        let previousEnd = 0;
        row.items.forEach((item, itemIndex) => {
          const x = item.transform[4];
          if (itemIndex > 0 && x - previousEnd > Math.max(2, Math.abs(item.transform[0]) * 0.25)) line += ' ';
          line += item.str;
          previousEnd = x + item.width;
        });
        if (line.trim()) {
          extractedCharacters += line.trim().length;
          paragraphs.push(new Paragraph({ text: line, pageBreakBefore: rowIndex === 0 && pageNumber > 1 }));
        }
      });
    }
    await pdf.destroy();
    if (extractedCharacters === 0) throw new Error(t('pdfNeedsOcr'));
    const blob = await Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }));
    const url = URL.createObjectURL(blob);
    localResultUrlRef.current = url;
    setResult({ url, previewUrl: '', filename: `${file!.name.replace(/\.pdf$/i, '') || 'converted'}.docx`, type: 'docx' });
  };

  const convertWordToPdf = async () => {
    const [{ default: mammoth }, html2canvasModule, { jsPDF }] = await Promise.all([
      import('mammoth'),
      import('html2canvas'),
      import('jspdf'),
    ]);
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: await file!.arrayBuffer() });
    setProgress(35);
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:0;top:0;width:794px;padding:48px;box-sizing:border-box;background:#fff;color:#111;font:16px/1.5 Arial,sans-serif;z-index:-1;';
    container.innerHTML = sanitizeDocumentHtml(htmlResult.value);
    container.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,table').forEach((element) => {
      (element as HTMLElement).style.margin = '0 0 12px';
      (element as HTMLElement).style.wordBreak = 'break-word';
    });
    container.querySelectorAll('table').forEach((table) => {
      (table as HTMLElement).style.cssText += 'width:100%;border-collapse:collapse;';
    });
    document.body.append(container);
    try {
      await Promise.all(Array.from(container.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const canvas = await html2canvasModule.default(container, { scale: 1.25, backgroundColor: '#ffffff', useCORS: false, logging: false });
      setProgress(55);
      if (canvas.height > 30_000) throw new Error(t('documentTooLong'));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const sliceHeight = Math.floor(canvas.width * pageHeight / pageWidth);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageContext = pageCanvas.getContext('2d');
      if (!pageContext) throw new Error(t('conversionFailed'));
      for (let offset = 0, pageIndex = 0; offset < canvas.height; offset += sliceHeight, pageIndex += 1) {
        setProgress(Math.min(90, Math.round((offset / canvas.height) * 90)));
        const height = Math.min(sliceHeight, canvas.height - offset);
        pageCanvas.height = height;
        pageContext.clearRect(0, 0, pageCanvas.width, height);
        pageContext.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        if (pageIndex > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight * height / sliceHeight, undefined, 'FAST');
      }
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      localResultUrlRef.current = url;
      setResult({ url, previewUrl: url, filename: `${file!.name.replace(/\.docx$/i, '') || 'converted'}.pdf`, type: 'application/pdf' });
    } finally {
      container.remove();
    }
  };

  const selectFiles = (nextFiles?: File[]) => {
    clearResult();
    setProgress(0);
    if (!nextFiles || nextFiles.length === 0) {
      setFiles([]);
      return;
    }
    const selectedFiles = isImageMode ? nextFiles : nextFiles.slice(0, 1);
    const validFiles = selectedFiles.every((nextFile) => {
      const filename = nextFile.name.toLowerCase();
      const validImage = /\.(jpe?g|png|webp|bmp|gif)$/.test(filename) && nextFile.type.startsWith('image/');
      const validDocument = mode === 'pdf-to-docx' ? filename.endsWith('.pdf') : filename.endsWith('.docx');
      return isImageMode ? validImage : validDocument;
    });
    if (!validFiles) {
      setError(t('invalidFile'));
      return;
    }
    if (selectedFiles.length > 20) {
      setError(t('tooManyImages'));
      return;
    }
    if (selectedFiles.reduce((total, selected) => total + selected.size, 0) > MAX_FILE_SIZE) {
      setError(t('fileTooLarge'));
      return;
    }
    setError('');
    setFiles(selectedFiles);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    selectFiles(isImageMode && files.length > 0 ? [...files, ...nextFiles] : nextFiles);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const nextFiles = Array.from(event.dataTransfer.files);
    selectFiles(isImageMode && files.length > 0 ? [...files, ...nextFiles] : nextFiles);
  };

  const changeMode = (nextMode: ConversionMode) => {
    if (busy) return;
    setMode(nextMode);
    setFiles([]);
    clearResult();
    setError('');
    setProgress(0);
  };

  const convert = async () => {
    if (!file || files.length === 0 || busy) return;
    setBusy(true);
    setProgress(0);
    setError('');

    try {
      setProgress(5);
      if (mode === 'pdf-to-docx') await convertPdfToWord();
      else if (mode === 'docx-to-pdf') await convertWordToPdf();
      else if (mode === 'image-to-pdf') await convertImagesToPdf();
      else await convertImagesToWord();
      setProgress(100);
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : t('conversionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBusy(false);
    setFiles([]);
    setProgress(0);
    clearResult();
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    clearResult();
    setProgress(0);
    setError('');
  };

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
      : 'image/jpeg,image/png,image/webp,image/bmp,image/gif';
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
            {isImageMode ? t('localImagePrivacy') : t('localDocumentPrivacy')}
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
              <input ref={inputRef} type="file" accept={accepted} multiple={isImageMode} className="sr-only" onChange={onInputChange} />
              {files.length > 0 ? (
                <div className="w-full max-w-lg space-y-2 text-left">
                  {files.map((selectedFile, index) => (
                    <div key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                      <FileText size={20} className="shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{files.length > 1 ? `${t('selectedFile')} ${index + 1}` : t('selectedFile')}</p>
                        <p className="truncate text-sm font-medium text-foreground" title={selectedFile.name}>{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button type="button" className="btn-icon" onClick={() => removeFile(index)} aria-label={locale === 'kh' ? `ដក ${selectedFile.name}` : `Remove ${selectedFile.name}`}>
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {isImageMode && files.length < 20 && (
                    <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => inputRef.current?.click()}>
                      {t('addImages')}
                    </button>
                  )}
                  {isImageMode && <p className="text-xs text-muted-foreground">{files.length} {t('imagesSelected')} · {(files.reduce((sum, selected) => sum + selected.size, 0) / (1024 * 1024)).toFixed(2)} MB</p>}
                </div>
              ) : (
                <>
                  <div className="mb-3 rounded-full border border-border bg-card p-3 text-primary">
                    <Upload size={20} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{isImageMode ? t('dropImages') : t('dropFile')}</p>
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
                <span>{t('converting')}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(progress, 5)}%` }}
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
              ) : sourcePreviewUrls.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <p className="border-b border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground">{isImageMode ? mode === 'image-to-docx' ? t('wordSourceImages') : t('imagePreview') : t('sourcePreview')}</p>
                  {isImageMode ? (
                    <div className="grid max-h-[min(65vh,48rem)] grid-cols-2 gap-3 overflow-auto bg-background/40 p-3 sm:grid-cols-3">
                      {sourcePreviewUrls.map((preview, index) => (
                        <figure key={`${preview.name}-${index}`} className="min-w-0 rounded-lg border border-border bg-card p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview.url} alt={preview.name} className="h-36 w-full rounded object-contain" />
                          <figcaption className="mt-2 truncate text-xs text-muted-foreground" title={preview.name}>{preview.name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <iframe title={t('sourcePreview')} src={sourcePreviewUrls[0].url} className="h-[min(65vh,48rem)] w-full bg-white" />
                  )}
                </div>
              ) : null}

              <p className="text-xs leading-5 text-muted-foreground">
                {mode === 'image-to-docx' ? t('localOcrNote') : mode === 'pdf-to-docx' ? t('localPdfNote') : mode === 'docx-to-pdf' ? t('localWordNote') : t('layoutNote')}
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
          {isImageMode ? t('localOcrNote') : mode === 'pdf-to-docx' ? t('localPdfNote') : t('localWordNote')}
        </p>
      </div>
    </div>
  );
}
