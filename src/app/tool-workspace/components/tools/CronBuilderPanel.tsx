'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';

const SAMPLE = '*/15 9-17 * * 1-5';
const FIELD_RANGES: Array<[number, number]> = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

function parseField(field: string, index: number): Set<number> {
  const [min, max] = FIELD_RANGES[index];
  const values = new Set<number>();
  for (const part of field.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in ${field}.`);
    let start: number;
    let end: number;
    if (rangePart === '*') { start = min; end = max; }
    else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a > b) throw new Error(`Invalid range in ${field}.`);
      start = a; end = b;
    } else {
      start = Number(rangePart); end = stepPart === undefined ? start : max;
    }
    if (start < min || end > max || start > end) throw new Error(`${field} is outside the valid range ${min}-${max}.`);
    for (let value = start; value <= end; value += step) values.add(index === 4 && value === 7 ? 0 : value);
  }
  if (!values.size) throw new Error(`No values found in ${field}.`);
  return values;
}

function explain(expression: string) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Use five fields: minute hour day-of-month month day-of-week.');
  const sets = fields.map((field, index) => parseField(field, index));
  const anyDayOfMonth = fields[2] === '*';
  const anyDayOfWeek = fields[4] === '*';
  const matches = (date: Date) => sets[0].has(date.getUTCMinutes()) && sets[1].has(date.getUTCHours()) && sets[3].has(date.getUTCMonth() + 1) &&
    (anyDayOfMonth || anyDayOfWeek ? sets[2].has(date.getUTCDate()) && sets[4].has(date.getUTCDay()) : sets[2].has(date.getUTCDate()) || sets[4].has(date.getUTCDay()));

  const next: Date[] = [];
  const cursor = new Date();
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  for (let i = 0; i < 527040 && next.length < 5; i += 1) {
    if (matches(cursor)) next.push(new Date(cursor));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  const descriptions = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];
  return { fields, summary: fields.map((field, index) => `${descriptions[index]}: ${field}`).join('\n'), next };
}

export default function CronBuilderPanel({ tool: _tool }: { tool: Tool }) {
  const [expression, setExpression] = useState(SAMPLE);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const result = useMemo(() => {
    if (!ready) return { fields: [], summary: '', next: [], error: '' };
    try { return { ...explain(expression), error: '' }; }
    catch (cause) { return { fields: [], summary: '', next: [], error: cause instanceof Error ? cause.message : 'Invalid cron expression.' }; }
  }, [expression, ready]);
  return <div className="h-full overflow-auto p-5 space-y-5">
    <label className="block text-xs text-muted-foreground">Start with a schedule preset<select className="select-input mt-1 w-full" defaultValue="custom" onChange={(event) => { if (event.target.value !== 'custom') setExpression(event.target.value); }}><option value="custom">Custom expression</option><option value="* * * * *">Every minute</option><option value="*/5 * * * *">Every 5 minutes</option><option value="0 * * * *">Every hour</option><option value="0 0 * * *">Every day at midnight UTC</option><option value="0 9 * * 1-5">Weekdays at 09:00 UTC</option><option value="0 9 * * 1">Every Monday at 09:00 UTC</option><option value="0 9 1 * *">First day of each month at 09:00 UTC</option></select></label>
    <section><label className="block text-xs text-muted-foreground mb-2">Five-field cron expression</label><input value={expression} onChange={(event) => setExpression(event.target.value)} className="input-code w-full p-3" placeholder="minute hour day-of-month month day-of-week" /><p className="text-xs text-muted-foreground mt-2">Fields use UTC. Supports *, lists, ranges, and steps.</p></section>
    {result.error ? <div className="p-3 rounded-lg border border-red-500/30 text-red-300 text-sm">{result.error}</div> : <>
      <section><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Field breakdown</h3><pre className="p-3 rounded-lg bg-secondary/30 text-sm whitespace-pre-wrap">{result.summary}</pre></section>
      <section><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next run times (UTC)</h3><ol className="space-y-1 text-sm font-mono">{result.next.map((date) => <li key={date.toISOString()}>{date.toISOString().replace('T', ' ').slice(0, 16)}</li>)}</ol>{ready && !result.next.length && <p className="text-sm text-muted-foreground">No run found in the next year.</p>}</section>
    </>}
  </div>;
}
