'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { format as sqlFormat } from 'sql-formatter';

const SAMPLE = `SELECT u.id,u.name,u.email,u.created_at,p.plan_name,p.price,COUNT(o.id) AS order_count,SUM(o.total_amount) AS lifetime_value FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id LEFT JOIN plans p ON p.id=s.plan_id LEFT JOIN orders o ON o.user_id=u.id WHERE u.created_at>='2026-01-01' AND u.status='active' GROUP BY u.id,u.name,u.email,u.created_at,p.plan_name,p.price HAVING COUNT(o.id)>0 ORDER BY lifetime_value DESC LIMIT 100;`;

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'bigquery' | 'tsql';
type Status = 'idle' | 'success' | 'error';

export default function SqlFormatterPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [dialect, setDialect] = useState<Dialect>('postgresql');
  const [indent, setIndent] = useState(2);
  const [uppercase, setUppercase] = useState(true);
  const [error, setError] = useState('');

  const format = () => {
    try {
      // Backend integration point: sql-formatter library
      const formatted = sqlFormat(input, {
        language: dialect,
        tabWidth: indent,
        keywordCase: uppercase ? 'upper' : 'lower',
        linesBetweenQueries: 2,
      });
      setOutput(formatted);
      setStatus('success');
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'SQL format error';
      setStatus('error');
      setError(msg);
      setOutput('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Dialect</label>
          <select className="select-input" value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)}>
            <option value="sql">Standard SQL</option>
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="sqlite">SQLite</option>
            <option value="bigquery">BigQuery</option>
            <option value="tsql">T-SQL</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Indent</label>
          <select className="select-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
          <span className="text-xs text-muted-foreground">Uppercase keywords</span>
        </label>
        <div className="ml-auto">
          <button className="btn-primary text-xs" onClick={format}>Format SQL</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder="Paste SQL query here…" minHeight="100%" />}
          outputPanel={<CodeOutput value={output} language="sql" placeholder="Formatted SQL appears here…" />}
          outputText={output}
          outputStatus={status}
          errorMessage={error}
          onClear={() => { setInput(''); setOutput(''); setStatus('idle'); setError(''); }}
          onSwap={() => { if (output) setInput(output); }}
        />
      </div>
    </div>
  );
}