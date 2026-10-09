'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

type CodeLanguage = 'css' | 'html' | 'java' | 'javascript' | 'json' | 'sql' | 'typescript' | 'xml' | 'yaml';

interface CodeOutputProps {
  value: string;
  placeholder: string;
  language: CodeLanguage;
}

const TOKEN_PATTERN =
  /<!--.*?-->|\/\*.*?\*\/|\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[\w:-]+|\/?>|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[A-Za-z_$][\w$-]*|[{}()\[\],.:;=<>!?+*\/%&|^~@#-]/g;

const KEYWORDS: Record<CodeLanguage, Set<string>> = {
  css: new Set(['important', 'from', 'to']),
  html: new Set(),
  java: new Set([
    'abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue',
    'default', 'do', 'double', 'else', 'extends', 'final', 'finally', 'float', 'for', 'if',
    'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
    'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'val', 'var',
  ]),
  javascript: new Set([
    'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if',
    'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'of', 'package',
    'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw',
    'try', 'type', 'typeof', 'var', 'void', 'while', 'yield',
  ]),
  json: new Set(['false', 'null', 'true']),
  sql: new Set([
    'all', 'alter', 'and', 'as', 'asc', 'between', 'by', 'case', 'count', 'create', 'delete',
    'desc', 'distinct', 'drop', 'else', 'end', 'from', 'group', 'having', 'in', 'insert', 'into',
    'is', 'join', 'left', 'like', 'limit', 'not', 'null', 'offset', 'on', 'or', 'order', 'outer',
    'right', 'select', 'set', 'sum', 'table', 'then', 'union', 'update', 'values', 'when', 'where',
  ]),
  typescript: new Set([
    'any', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue',
    'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from',
    'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new',
    'number', 'of', 'package', 'private', 'protected', 'public', 'readonly', 'return', 'static',
    'string', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'void', 'while',
    'yield',
  ]),
  xml: new Set(),
  yaml: new Set(['false', 'no', 'null', 'true', 'yes']),
};

function renderHighlightedLine(line: string, language: CodeLanguage, lineIndex: number) {
  const parts: React.ReactNode[] = [];
  const pattern = new RegExp(TOKEN_PATTERN.source, 'g');
  let cursor = 0;
  let inMarkup = false;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) {
      parts.push(line.slice(cursor, match.index));
    }

    const token = match[0];
    const next = line.slice(pattern.lastIndex);
    let color = 'code-token-default';
    const isMarkupLanguage = language === 'html' || language === 'xml';
    const isString = token.startsWith('"') || token.startsWith("'") || token.startsWith('`');

    if (token.startsWith('//') || token.startsWith('/*') || token.startsWith('<!--')) {
      color = 'code-token-comment';
    } else if (isString) {
      const isKey =
        (language === 'json' || language === 'yaml') && next.trimStart().startsWith(':');
      color = isKey ? 'code-token-key' : 'code-token-string';
    } else if (isMarkupLanguage && token.startsWith('<')) {
      inMarkup = true;
      color = 'code-token-markup';
    } else if (isMarkupLanguage && (token === '>' || token === '/>')) {
      color = 'code-token-punctuation';
      inMarkup = false;
    } else if (/^\d/.test(token)) {
      color = 'code-token-number';
    } else if (inMarkup && /^[\w:-]+$/.test(token)) {
      color = 'code-token-tag-name';
    } else if (KEYWORDS[language].has(token.toLowerCase())) {
      color = language === 'json' || language === 'yaml' ? 'code-token-literal' : 'code-token-keyword';
    } else if (
      (language === 'css' && next.trimStart().startsWith(':')) ||
      ((language === 'javascript' || language === 'typescript' || language === 'java') &&
        next.trimStart().startsWith('('))
    ) {
      color = 'code-token-function';
    } else if (/^[{}()[\],.:;=<>!?+*/%&|^~@#-]+$/.test(token)) {
      color = 'code-token-punctuation';
    }

    parts.push(
      <span className={color} key={`${lineIndex}-${match.index}`}>
        {token}
      </span>,
    );
    cursor = pattern.lastIndex;
  }

  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts;
}

export default function CodeOutput({ value, placeholder, language }: CodeOutputProps) {
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const lines = value.split('\n');

  const copyLine = async (line: string, lineNumber: number) => {
    try {
      await navigator.clipboard.writeText(line);
      setCopiedLine(lineNumber);
      toast.success(`Line ${lineNumber} copied`);
      window.setTimeout(() => setCopiedLine(null), 1600);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard access was denied.';
      toast.error(`Could not copy line: ${message}`);
    }
  };

  if (!value) {
    return (
      <div className="flex h-full items-start p-4 font-mono-code text-[13px] leading-6 text-muted-foreground">
        {placeholder}
      </div>
    );
  }

  return (
    <div
      className="scrollbar-thin h-full overflow-auto bg-background py-3 font-mono-code text-[13px] leading-6 text-foreground"
      role="region"
      aria-label="Code output"
    >
      <div className="w-max min-w-full">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isCopied = copiedLine === lineNumber;

          return (
            <div
              className="group flex min-h-6 w-max min-w-full items-start gap-3 px-3 transition-colors hover:bg-muted/50"
              key={lineNumber}
              role="group"
              aria-label={`Line ${lineNumber}`}
            >
              <span
                className="sticky left-0 w-8 shrink-0 select-none bg-background pr-1 text-right text-[11px] tabular-nums text-muted-foreground"
                aria-hidden="true"
              >
                {lineNumber}
              </span>
              <span className="whitespace-pre text-foreground">
                {line ? renderHighlightedLine(line, language, index) : ' '}
              </span>
              <button
                className="sticky right-0 z-10 ml-auto mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary group-hover:opacity-100 group-focus-within:opacity-100"
                onClick={() => copyLine(line, lineNumber)}
                type="button"
                title={`Copy line ${lineNumber}`}
                aria-label={`Copy line ${lineNumber}`}
              >
                {isCopied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
