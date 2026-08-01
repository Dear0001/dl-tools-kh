'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { Copy, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type UuidVersion = 'v4';

export default function UuidPanel({ tool }: { tool: Tool }) {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);

  const generate = () => {
    // Backend integration point: crypto.randomUUID()
    const generated = Array.from({ length: count }, () => {
      let id = crypto.randomUUID();
      if (!hyphens) id = id.replace(/-/g, '');
      if (uppercase) id = id.toUpperCase();
      return id;
    });
    setUuids(generated);
  };

  const copyOne = async (uuid: string) => {
    await navigator.clipboard.writeText(uuid);
    setCopiedId(uuid);
    toast.success('UUID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(uuids.join('\n'));
    toast.success(`${uuids.length} UUIDs copied`);
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto">
        {/* Config */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground font-medium mb-1.5">Count</label>
              <select className="select-input w-full" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[1, 5, 10, 20, 50, 100].map((n) => (
                  <option key={`count-${n}`} value={n}>{n} UUID{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground font-medium mb-1.5">Version</label>
              <select className="select-input w-full" disabled>
                <option>UUID v4 (random)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
              <span className="text-xs text-muted-foreground">Uppercase</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
              <span className="text-xs text-muted-foreground">Include hyphens</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mb-4">
          <button className="btn-primary" onClick={generate}>
            <RefreshCw size={13} />
            Generate
          </button>
          {uuids.length > 0 && (
            <>
              <button className="btn-ghost" onClick={copyAll}>
                <Copy size={13} />
                Copy All
              </button>
              <button className="btn-ghost" onClick={() => setUuids([])}>
                <Trash2 size={13} />
                Clear
              </button>
            </>
          )}
        </div>

        {/* Results */}
        {uuids.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <RefreshCw size={20} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No UUIDs generated yet</p>
            <p className="text-xs">Configure options above and click Generate to create UUID v4 values.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {uuids.map((uuid, i) => (
              <div
                key={`uuid-result-${i}`}
                className="group flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-4 py-2.5 hover:border-primary/30 transition-all duration-150"
              >
                <span className="font-mono text-sm text-foreground tabular-nums">{uuid}</span>
                <button
                  className={`btn-icon flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${copiedId === uuid ? 'text-primary' : ''}`}
                  onClick={() => copyOne(uuid)}
                  aria-label={`Copy UUID ${uuid}`}
                >
                  {copiedId === uuid ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}