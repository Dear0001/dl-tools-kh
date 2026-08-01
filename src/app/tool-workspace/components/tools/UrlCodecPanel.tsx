'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_DECODED = 'https://api.devtoolkit.io/v2/search?query=json formatter&category=formatters&lang=en&sort=popular&page=1&limit=20&tags=json,format,validate';

export default function UrlCodecPanel({ tool }: { tool: Tool }) {
  const [decoded, setDecoded] = useState(SAMPLE_DECODED);
  const [encoded, setEncoded] = useState('');
  const [error, setError] = useState('');

  const encode = () => {
    try {
      setEncoded(encodeURIComponent(decoded));
      setError('');
    } catch (e: unknown) {
      setError('Encode error');
    }
  };

  const decode = () => {
    try {
      setDecoded(decodeURIComponent(encoded));
      setError('');
    } catch (e: unknown) {
      setError('Decode error — invalid percent-encoded string');
    }
  };

  const copyEncoded = async () => {
    if (!encoded) return;
    await navigator.clipboard.writeText(encoded);
    toast.success('Encoded URL copied');
  };

  const copyDecoded = async () => {
    if (!decoded) return;
    await navigator.clipboard.writeText(decoded);
    toast.success('Decoded URL copied');
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Decoded */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decoded / Plain URL</label>
            <button className="btn-icon" onClick={copyDecoded} title="Copy decoded">
              <ArrowUp size={13} />
            </button>
          </div>
          <textarea
            value={decoded}
            onChange={(e) => setDecoded(e.target.value)}
            className="input-code w-full"
            rows={4}
            placeholder="https://example.com/path?query=value&other=hello world"
            spellCheck={false}
          />
          <button className="btn-primary mt-3 text-xs" onClick={encode}>
            <ArrowDown size={12} />
            Encode →
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">{error}</div>
        )}

        {/* Encoded */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Encoded / Percent-Encoded</label>
            <button className="btn-icon" onClick={copyEncoded} title="Copy encoded">
              <ArrowUp size={13} />
            </button>
          </div>
          <textarea
            value={encoded}
            onChange={(e) => setEncoded(e.target.value)}
            className="input-code w-full text-emerald-300"
            rows={4}
            placeholder="https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue%26other%3Dhello%20world"
            spellCheck={false}
          />
          <button className="btn-ghost mt-3 text-xs" onClick={decode}>
            <ArrowUp size={12} />
            ← Decode
          </button>
        </div>

        {/* Quick reference */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Common Encodings</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { char: 'Space', enc: '%20' },
              { char: '/', enc: '%2F' },
              { char: '?', enc: '%3F' },
              { char: '&', enc: '%26' },
              { char: '=', enc: '%3D' },
              { char: '#', enc: '%23' },
              { char: '+', enc: '%2B' },
              { char: '@', enc: '%40' },
              { char: ':', enc: '%3A' },
            ].map((item) => (
              <div key={`enc-${item.char}`} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-violet-400 w-12">{item.char}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-400">{item.enc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}