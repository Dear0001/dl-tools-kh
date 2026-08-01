'use client';
import React, { useState } from 'react';
import { Copy, Download, Trash2, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [copied, setCopied] = useState(false);

  const copyOutput = async () => {
    if (!outputText) return;
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
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
    toast.success('Downloaded output.txt');
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{inputLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            {inputActions}
            {onSwap && (
              <button className="btn-icon" onClick={onSwap} title="Swap input and output">
                <ArrowLeftRight size={13} />
              </button>
            )}
            {onClear && (
              <button className="btn-icon" onClick={onClear} title="Clear input">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-input border-x border-b border-border rounded-b-lg">
          {inputPanel}
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{outputLabel}</span>
            {errorMessage && (
              <span className="text-xs text-red-400 font-mono truncate max-w-xs">{errorMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {outputActions}
            <button
              className={`btn-icon ${copied ? 'text-primary' : ''}`}
              onClick={copyOutput}
              title="Copy output"
              disabled={!outputText}
            >
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            </button>
            <button
              className="btn-icon"
              onClick={downloadOutput}
              title="Download output"
              disabled={!outputText}
            >
              <Download size={13} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-[#111118] border-x border-b border-border rounded-b-lg">
          {outputPanel}
        </div>
      </div>
    </div>
  );
}