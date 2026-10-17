'use client';
import React, { useState } from 'react';
import { Copy, Download, Trash2, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { localizeControlContent, translateText, useLocale } from '@/i18n/LocaleProvider';

interface PanelLayoutProps {
  inputPanel: React.ReactNode;
  outputPanel: React.ReactNode;
  inputLabel?: string;
  outputLabel?: string;
  inputActions?: React.ReactNode;
  outputActions?: React.ReactNode;
  outputText?: string;
  onSwap?: () => void;
  onClear?: () => void;
  outputStatus?: 'idle' | 'success' | 'error';
  errorMessage?: string;
  vertical?: boolean;
}

export default function PanelLayout({
  inputPanel,
  outputPanel,
  inputLabel = 'Input',
  outputLabel = 'Output',
  inputActions,
  outputActions,
  outputText,
  onSwap,
  onClear,
  outputStatus = 'idle',
  errorMessage,
  vertical = false,
}: PanelLayoutProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);

  const copyOutput = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast.success(translateText('Copied to clipboard', locale));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard access was denied.';
      toast.error(locale === 'kh' ? 'មិនអាចចម្លងលទ្ធផលបានទេ។ សូមអនុញ្ញាតការចូលប្រើក្ដារតម្បៀតខ្ទាស់។' : `Could not copy output: ${message}`);
    }
  };

  const downloadOutput = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(translateText('Copied output.txt', locale));
  };

  const containerClass = vertical
    ? 'flex flex-col h-full' :'flex flex-col lg:flex-row h-full';

  const panelClass = vertical ? 'flex-1 flex flex-col min-h-0' : 'flex-1 flex flex-col min-w-0 min-h-0';

  return (
    <div className={containerClass}>
      {/* Input panel */}
      <div className={panelClass}>
        <div className="panel-header flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="status-dot-idle" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{translateText(inputLabel, locale)}</span>
          </div>
          <div className="flex items-center gap-1">
            {localizeControlContent(inputActions, locale)}
            {onSwap && (
              <button className="btn-icon" onClick={onSwap} title={translateText('Swap input and output', locale)} aria-label={translateText('Swap input and output', locale)}>
                <ArrowLeftRight size={13} />
              </button>
            )}
            {onClear && (
              <button className="btn-icon" onClick={onClear} title={translateText('Clear input', locale)} aria-label={translateText('Clear input', locale)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-input border-x border-b border-border rounded-b-lg">
          {localizeControlContent(inputPanel, locale)}
        </div>
      </div>

      {/* Divider */}
      <div className={vertical ? 'h-2 flex-shrink-0' : 'w-2 flex-shrink-0 hidden lg:block'} />

      {/* Output panel */}
      <div className={panelClass}>
        <div className="panel-header flex-shrink-0">
          <div className="flex items-center gap-2">
            {outputStatus === 'success' && <span className="status-dot-success" />}
            {outputStatus === 'error' && <span className="status-dot-error" />}
            {outputStatus === 'idle' && <span className="status-dot-idle" />}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{translateText(outputLabel, locale)}</span>
            {errorMessage && (
              <span className="text-xs text-red-400 font-mono truncate max-w-xs">{errorMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {localizeControlContent(outputActions, locale)}
            <button
              className={`btn-icon ${copied ? 'text-primary' : ''}`}
              onClick={copyOutput}
              title={translateText('Copy output', locale)}
              aria-label={translateText('Copy output', locale)}
              disabled={!outputText}
            >
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            </button>
            <button
              className="btn-icon"
              onClick={downloadOutput}
              title={translateText('Download output', locale)}
              aria-label={translateText('Download output', locale)}
              disabled={!outputText}
            >
              <Download size={13} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-background border-x border-b border-border rounded-b-lg">
          {localizeControlContent(outputPanel, locale)}
        </div>
      </div>
    </div>
  );
}