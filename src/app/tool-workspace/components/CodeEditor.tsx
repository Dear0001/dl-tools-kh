'use client';
import React, { useRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

export default function CodeEditor({
  value,
  onChange,
  placeholder = 'Paste your input here…',
  readOnly = false,
  minHeight = '200px',
  className = '',
}: CodeEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      setTimeout(() => el.setSelectionRange(start + 2, start + 2), 0);
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleTab}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`input-code w-full h-full resize-none border-0 rounded-none bg-transparent focus:ring-0 focus:border-0 focus:shadow-none ${className}`}
      style={{ minHeight }}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
    />
  );
}