'use client';
import React, { useMemo, useState } from 'react';
import { Tool } from '@/data/tools';
import { Copy, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}<>?/';

function generatePassword(options: PasswordOptions) {
  const pool = [
    options.lowercase ? LOWER : '',
    options.uppercase ? UPPER : '',
    options.numbers ? NUMBERS : '',
    options.symbols ? SYMBOLS : '',
  ].join('');

  if (!pool) {
    return '';
  }

  const values = Array.from({ length: options.length }, () => {
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  });

  if (!options.lowercase && !options.uppercase && !options.numbers && !options.symbols) {
    return '';
  }

  return values.join('');
}

export default function PasswordGeneratorPanel({ tool }: { tool: Tool }) {
  const [passwords, setPasswords] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    return options.lowercase || options.uppercase || options.numbers || options.symbols;
  }, [options]);

  const generate = () => {
    const generated = Array.from({ length: count }, () => generatePassword({ ...options, length }));
    setPasswords(generated.filter(Boolean));
  };

  const copyOne = async (password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedValue(password);
    toast.success('Password copied');
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(passwords.join('\n'));
    toast.success(`${passwords.length} passwords copied`);
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground font-medium mb-1.5">Count</label>
              <select className="select-input w-full" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[1, 5, 10, 20, 50].map((n) => (
                  <option key={`count-${n}`} value={n}>{n} password{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground font-medium mb-1.5">Length</label>
              <input
                type="number"
                min={8}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="select-input w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'lowercase', label: 'Lowercase' },
              { key: 'uppercase', label: 'Uppercase' },
              { key: 'numbers', label: 'Numbers' },
              { key: 'symbols', label: 'Symbols' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(options[item.key as keyof PasswordOptions])}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button className="btn-primary" onClick={generate} disabled={!canGenerate}>
            <RefreshCw size={13} />
            Generate
          </button>
          {passwords.length > 0 && (
            <>
              <button className="btn-ghost" onClick={copyAll}>
                <Copy size={13} />
                Copy All
              </button>
              <button className="btn-ghost" onClick={() => setPasswords([])}>
                <Trash2 size={13} />
                Clear
              </button>
            </>
          )}
        </div>

        {passwords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <RefreshCw size={20} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No passwords generated yet</p>
            <p className="text-xs">Choose your character set and click Generate to create secure passwords.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {passwords.map((password, i) => (
              <div
                key={`password-${i}`}
                className="group flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-4 py-2.5 hover:border-primary/30 transition-all duration-150"
              >
                <span className="font-mono text-sm text-foreground tabular-nums break-all">{password}</span>
                <button
                  className={`btn-icon flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${copiedValue === password ? 'text-primary' : ''}`}
                  onClick={() => copyOne(password)}
                  aria-label={`Copy password ${password}`}
                >
                  {copiedValue === password ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
