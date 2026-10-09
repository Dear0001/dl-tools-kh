'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { CATEGORY_COLORS } from '@/data/tools';

export default function RecentTools() {
  const [recents, setRecents] = useState<string[] | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('devtoolkit-recent');
    setRecents(stored ? JSON.parse(stored) : []);
  }, []);

  const remove = (id: string) => {
    const next = (recents ?? []).filter((recentId) => recentId !== id);
    setRecents(next);
    localStorage.setItem('devtoolkit-recent', JSON.stringify(next));
  };

  const tools = (recents ?? [])
    .map((id) => TOOLS.find((tool) => tool.id === id))
    .filter((tool): tool is (typeof TOOLS)[number] => Boolean(tool));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Recently opened</h2>
      </div>
      {recents === null ? (
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted/50" aria-label="Loading recent tools" />
      ) : tools.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => {
            const colors = CATEGORY_COLORS[tool.category];
            return (
              <div key={`recent-${tool.id}`} className="group flex items-center rounded-md border border-border bg-card">
                <Link
                  href={`/tool-workspace?tool=${tool.id}`}
                  className="rounded-l-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {tool.name}
                </Link>
                <span className={`mx-1 h-1.5 w-1.5 rounded-full ${colors.bg}`} aria-hidden="true" />
                <button
                  onClick={() => remove(tool.id)}
                  className="btn-icon h-8 w-8 rounded-l-none"
                  aria-label={`Remove ${tool.name} from recent tools`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tools you open will appear here for quick access.
        </p>
      )}
    </div>
  );
}