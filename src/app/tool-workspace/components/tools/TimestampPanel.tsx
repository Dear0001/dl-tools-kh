'use client';
import React, { useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Phnom_Penh',
  'Australia/Sydney',
];

export default function TimestampPanel({ tool }: { tool: Tool }) {
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [tz, setTz] = useState('UTC');
  const [nowTs, setNowTs] = useState('');
  const [results, setResults] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const ts = Math.floor(Date.now() / 1000);
    setNowTs(String(ts));
    setTsInput(String(ts));
  }, []);

  const convertFromTs = () => {
    const ts = parseInt(tsInput, 10);
    if (isNaN(ts)) return;
    const ms = tsInput.length >= 13 ? ts : ts * 1000;
    const d = new Date(ms);
    const fmt = (locale: string, options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(d);

    setResults([
      { label: 'ISO 8601', value: d.toISOString() },
      { label: 'UTC String', value: d.toUTCString() },
      { label: 'Local (selected TZ)', value: fmt('en-US', { dateStyle: 'full', timeStyle: 'long' }) },
      { label: 'Date only', value: fmt('en-CA', { dateStyle: 'short' }) },
      { label: 'Time only', value: fmt('en-US', { timeStyle: 'medium' }) },
      { label: 'Unix (seconds)', value: String(Math.floor(ms / 1000)) },
      { label: 'Unix (milliseconds)', value: String(ms) },
      { label: 'Day of week', value: fmt('en-US', { weekday: 'long' }) },
      { label: 'Relative', value: getRelative(d) },
    ]);
  };

  const convertFromDate = () => {
    if (!dateInput) return;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return;
    setTsInput(String(Math.floor(d.getTime() / 1000)));
    convertFromTs();
  };

  const getRelative = (d: Date): string => {
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const sign = diff > 0 ? 'ago' : 'from now';
    if (abs < 60000) return `${Math.floor(abs / 1000)}s ${sign}`;
    if (abs < 3600000) return `${Math.floor(abs / 60000)}m ${sign}`;
    if (abs < 86400000) return `${Math.floor(abs / 3600000)}h ${sign}`;
    return `${Math.floor(abs / 86400000)}d ${sign}`;
  };

  const copyResult = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const useNow = () => {
    const ts = Math.floor(Date.now() / 1000);
    setNowTs(String(ts));
    setTsInput(String(ts));
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Now strip */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-xs text-muted-foreground">Current Unix timestamp:</span>
          <span className="font-mono text-sm text-primary tabular-nums">{nowTs}</span>
          <button className="btn-icon ml-auto" onClick={useNow} title="Use current timestamp">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-xs text-muted-foreground font-medium mb-2">Unix Timestamp</label>
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              className="input-code w-full py-2 mb-3"
              placeholder="1753928000"
            />
            <button className="btn-primary text-xs w-full justify-center" onClick={convertFromTs}>
              Convert Timestamp →
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-xs text-muted-foreground font-medium mb-2">Date / Time String</label>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="input-code w-full py-2 mb-3"
            />
            <button className="btn-ghost text-xs w-full justify-center" onClick={convertFromDate}>
              ← Convert Date
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-xs text-muted-foreground font-medium mb-2">Timezone</label>
          <select className="select-input w-full sm:w-64" value={tz} onChange={(e) => setTz(e.target.value)}>
            {TIMEZONES.map((zone) => (
              <option key={`tz-${zone}`} value={zone}>{zone}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {results.map((r, i) => (
              <div
                key={`ts-result-${i}`}
                className="group flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors duration-100"
              >
                <span className="text-xs text-muted-foreground w-40 flex-shrink-0">{r.label}</span>
                <span className="font-mono text-xs text-foreground flex-1 truncate">{r.value}</span>
                <button
                  className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyResult(r.value)}
                  aria-label={`Copy ${r.label}`}
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}