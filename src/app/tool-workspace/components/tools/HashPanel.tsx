'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { Copy, CheckCircle2, Hash } from 'lucide-react';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALGORITHMS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

export default function HashPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState('DevToolkit — browser developer tools 2026');
  const [results, setResults] = useState<Record<Algorithm, string>>({} as Record<Algorithm, string>);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [hmacKey, setHmacKey] = useState('');
  const [useHmac, setUseHmac] = useState(false);

  const compute = () => {
    if (!input.trim()) return;
    // Backend integration point: crypto-js hashing
    const compute = (algo: Algorithm): string => {
      let result: string;
      if (useHmac && hmacKey) {
        switch (algo) {
          case 'MD5': result = CryptoJS.HmacMD5(input, hmacKey).toString(); break;
          case 'SHA-1': result = CryptoJS.HmacSHA1(input, hmacKey).toString(); break;
          case 'SHA-256': result = CryptoJS.HmacSHA256(input, hmacKey).toString(); break;
          case 'SHA-512': result = CryptoJS.HmacSHA512(input, hmacKey).toString(); break;
          default: result = '';
        }
      } else {
        switch (algo) {
          case 'MD5': result = CryptoJS.MD5(input).toString(); break;
          case 'SHA-1': result = CryptoJS.SHA1(input).toString(); break;
          case 'SHA-256': result = CryptoJS.SHA256(input).toString(); break;
          case 'SHA-512': result = CryptoJS.SHA512(input).toString(); break;
          default: result = '';
        }
      }
      return uppercase ? result.toUpperCase() : result;
    };

    const newResults = {} as Record<Algorithm, string>;
    for (const algo of ALGORITHMS) {
      newResults[algo] = compute(algo);
    }
    setResults(newResults);
  };

  const copyHash = async (algo: Algorithm, hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedKey(algo);
    toast.success(`${algo} hash copied`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <label className="block text-xs text-muted-foreground font-medium mb-2">Input Text</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-code w-full"
            rows={4}
            placeholder="Enter text to hash…"
          />
        </div>

        {/* Options */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
              <span className="text-xs text-muted-foreground">Uppercase output</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useHmac} onChange={(e) => setUseHmac(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
              <span className="text-xs text-muted-foreground">HMAC mode</span>
            </label>
            {useHmac && (
              <input
                type="text"
                value={hmacKey}
                onChange={(e) => setHmacKey(e.target.value)}
                placeholder="HMAC secret key…"
                className="input-code flex-1 min-w-48 py-1.5 px-3 text-xs"
              />
            )}
          </div>
        </div>

        <button className="btn-primary mb-5 w-full justify-center" onClick={compute}>
          <Hash size={14} />
          Compute Hashes
        </button>

        {/* Results */}
        <div className="flex flex-col gap-3">
          {ALGORITHMS.map((algo) => (
            <div key={`hash-${algo}`} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{algo}</span>
                {results[algo] && (
                  <button
                    className={`btn-icon ${copiedKey === algo ? 'text-primary' : ''}`}
                    onClick={() => copyHash(algo, results[algo])}
                    aria-label={`Copy ${algo} hash`}
                  >
                    {copiedKey === algo ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all min-h-[20px]">
                {results[algo] || <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}