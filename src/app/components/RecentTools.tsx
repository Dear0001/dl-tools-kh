'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { CATEGORY_COLORS } from '@/data/tools';

const DEFAULT_RECENT = ['tool-json-formatter', 'tool-uuid', 'tool-jwt-decoder', 'tool-sql-formatter', 'tool-json-to-ts'];

export default function RecentTools() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    // Backend integration point: load from localStorage or user session
    const stored = localStorage.getItem('devtoolkit-recent');
    setRecents(stored ? JSON.parse(stored) : DEFAULT_RECENT);
  }, []);

  const remove = (id: string) => {
    const next = recents.filter((r) => r !== id);
    setRecents(next);
    localStorage.setItem('devtoolkit-recent', JSON.stringify(next));
  };

  const tools = recents.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean) as typeof TOOLS;

  if (tools.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <History size={13} />
        Recent:
      </div>
      {tools.map((tool) => {
        const colors = CATEGORY_COLORS[tool.category];
        return (
          <div key={`recent-${tool.id}`} className="group flex items-center gap-1">
            <Link
              href={`/tool-workspace?tool=${tool.id}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} hover:brightness-110 transition-all duration-150`}
            >
              {tool.name}
            </Link>
            <button
              onClick={() => remove(tool.id)}
              className="opacity-0 group-hover:opacity-100 btn-icon p-0.5 transition-opacity duration-150"
              aria-label={`Remove ${tool.name} from recent`}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}