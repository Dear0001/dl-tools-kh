'use client';
import React, { useState, useMemo } from 'react';
import { Tool } from '@/data/tools';
import * as Diff from 'diff';
import { GitCompare } from 'lucide-react';

const SAMPLE_LEFT = `{
  "name": "DevToolkit",
  "version": "1.0.0",
  "description": "Browser developer tools",
  "config": {
    "theme": "dark",
    "autosave": true,
    "maxHistory": 50
  }
}`;

const SAMPLE_RIGHT = `{
  "name": "DevToolkit",
  "version": "2.0.0",
  "description": "Browser-based developer tools suite",
  "config": {
    "theme": "dark",
    "autosave": false,
    "maxHistory": 100,
    "language": "en"
  },
  "author": "devtoolkit"
}`;

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNum: number;
}

export default function DiffPanel({ tool }: { tool: Tool }) {
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);
  const [mode, setMode] = useState<'split' | 'unified'>('split');

  const diffLines = useMemo((): DiffLine[] => {
    const changes = Diff.diffLines(left, right);
    const lines: DiffLine[] = [];
    let lineNum = 1;
    for (const part of changes) {
      const partLines = part.value.split('\n').filter((_, i, a) => i < a.length - 1 || part.value.endsWith('\n') || i < a.length - 1);
      const rawLines = part.value.split('\n');
      for (let i = 0; i < rawLines.length; i++) {
        if (i === rawLines.length - 1 && rawLines[i] === '') continue;
        lines.push({
          type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
          value: rawLines[i],
          lineNum: lineNum++,
        });
      }
    }
    return lines;
  }, [left, right]);

  const stats = useMemo(() => ({
    added: diffLines.filter((l) => l.type === 'added').length,
    removed: diffLines.filter((l) => l.type === 'removed').length,
    unchanged: diffLines.filter((l) => l.type === 'unchanged').length,
  }), [diffLines]);

  return (
    <div className="h-full flex flex-col">
      {/* Config */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">View</label>
          <select className="select-input" value={mode} onChange={(e) => setMode(e.target.value as 'split' | 'unified')}>
            <option value="split">Split</option>
            <option value="unified">Unified</option>
          </select>
        </div>
        <div className="flex items-center gap-3 ml-auto text-xs font-mono">
          <span className="text-emerald-400">+{stats.added} added</span>
          <span className="text-red-400">-{stats.removed} removed</span>
          <span className="text-muted-foreground">{stats.unchanged} unchanged</span>
        </div>
      </div>

      {/* Split input area */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-px bg-border border-b border-border" style={{ height: '35%' }}>
        <div className="flex flex-col bg-input">
          <div className="panel-header rounded-none border-0 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Original (A)</span>
          </div>
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            className="input-code flex-1 resize-none border-0 rounded-none bg-transparent focus:ring-0"
            spellCheck={false}
            placeholder="Paste original content here…"
          />
        </div>
        <div className="flex flex-col bg-input">
          <div className="panel-header rounded-none border-0 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modified (B)</span>
          </div>
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            className="input-code flex-1 resize-none border-0 rounded-none bg-transparent focus:ring-0"
            spellCheck={false}
            placeholder="Paste modified content here…"
          />
        </div>
      </div>

      {/* Diff output */}
      <div className="flex-1 overflow-auto scrollbar-thin bg-[#111118] p-0">
        <div className="font-mono text-xs leading-relaxed">
          {diffLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <GitCompare size={24} />
              <span>Paste content in both panels to see the diff</span>
            </div>
          ) : diffLines.map((line, i) => (
            <div
              key={`diff-line-${i}-${line.type}`}
              className={`flex items-start px-4 py-0.5 ${
                line.type === 'added' ? 'diff-added' : line.type === 'removed' ? 'diff-removed' : ''
              }`}
            >
              <span className="w-8 flex-shrink-0 text-muted-foreground select-none tabular-nums text-right mr-4">{line.lineNum}</span>
              <span className={`flex-shrink-0 w-4 ${line.type === 'added' ? 'text-emerald-400' : line.type === 'removed' ? 'text-red-400' : 'text-muted-foreground'}`}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span className={line.type === 'added' ? 'text-emerald-300' : line.type === 'removed' ? 'text-red-300' : 'text-foreground'}>
                {line.value || ' '}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}