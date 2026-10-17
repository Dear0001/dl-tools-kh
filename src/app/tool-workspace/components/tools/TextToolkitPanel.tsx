'use client';

import { useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';

type Mode = 'analyze' | 'case' | 'lists' | 'lorem';
const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

function changeCase(text: string, mode: string) {
  const words = text.trim().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (mode === 'upper') return text.toLocaleUpperCase();
  if (mode === 'lower') return text.toLocaleLowerCase();
  if (mode === 'title') return text.toLocaleLowerCase().replace(/(^|\s)[\p{L}]/gu, (match) => match.toLocaleUpperCase());
  if (mode === 'camel') return words.map((word, index) => index ? word[0].toLocaleUpperCase() + word.slice(1).toLocaleLowerCase() : word.toLocaleLowerCase()).join('');
  const parts = words.map((word) => word.toLocaleLowerCase());
  if (mode === 'pascal') return parts.map((word) => word[0]?.toLocaleUpperCase() + word.slice(1)).join('');
  if (mode === 'snake') return parts.join('_');
  if (mode === 'kebab') return parts.join('-');
  return parts.join('_').toLocaleUpperCase();
}

export default function TextToolkitPanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>('analyze');
  const [input, setInput] = useState('Developer tools help teams inspect, format, and transform data.');
  const [caseMode, setCaseMode] = useState('camel');
  const [count, setCount] = useState(3);
  const output = useMemo(() => {
    if (mode === 'case') return changeCase(input, caseMode);
    if (mode === 'lorem') return Array.from({ length: Math.max(1, Math.min(50, count)) }, () => LOREM).join('\n\n');
    if (mode === 'lists') {
      const [leftText = '', rightText = ''] = input.split(/\n\s*\n/, 2);
      const left = new Set(leftText.split('\n').map((line) => line.trim()).filter(Boolean));
      const right = new Set(rightText.split('\n').map((line) => line.trim()).filter(Boolean));
      const onlyA = [...left].filter((item) => !right.has(item));
      const onlyB = [...right].filter((item) => !left.has(item));
      const common = [...left].filter((item) => right.has(item));
      return `Only in List A (${onlyA.length})\n${onlyA.join('\n')}\n\nOnly in List B (${onlyB.length})\n${onlyB.join('\n')}\n\nIn both (${common.length})\n${common.join('\n')}`;
    }
    const words = input.trim() ? input.trim().split(/\s+/u).length : 0;
    const lines = input ? input.split(/\r\n|\r|\n/u).length : 0;
    return `Characters: ${Array.from(input).length}\nCharacters (excluding spaces): ${Array.from(input).filter((character) => !/\s/u.test(character)).length}\nWords: ${words}\nLines: ${lines}\nUTF-8 bytes: ${new TextEncoder().encode(input).length}`;
  }, [input, mode, caseMode, count]);

  return <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
      <select className="select-input" value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option value="analyze">Text analyzer</option><option value="case">Case converter</option><option value="lists">List comparer</option><option value="lorem">Lorem Ipsum</option></select>
      {mode === 'case' && <select className="select-input" value={caseMode} onChange={(event) => setCaseMode(event.target.value)}><option value="camel">camelCase</option><option value="pascal">PascalCase</option><option value="snake">snake_case</option><option value="kebab">kebab-case</option><option value="constant">CONSTANT_CASE</option><option value="title">Title Case</option><option value="upper">UPPERCASE</option><option value="lower">lowercase</option></select>}
      {mode === 'lists' && <span className="text-xs text-muted-foreground">Separate List A and List B with a blank line.</span>}
      {mode === 'lorem' && <label className="text-xs text-muted-foreground ml-auto">Paragraphs <input className="input-code w-16 p-1 ml-1" type="number" min={1} max={50} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>}
    </div>
    <div className="flex-1 min-h-0 p-4"><PanelLayout inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder={mode === 'lists' ? 'List A items…\n\nList B items…' : 'Enter text…'} />} outputPanel={<CodeOutput value={output} language="text" placeholder="Result appears here…" />} outputText={output} outputStatus={output ? 'success' : 'idle'} onClear={() => setInput('')} />
    </div>
  </div>;
}
