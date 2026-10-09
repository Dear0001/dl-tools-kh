'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Braces, GitCompare, QrCode, ImageIcon, Wrench, Sparkles, LayoutGrid } from 'lucide-react';
import { CATEGORIES, TOOLS, ToolCategory } from '../../data/tools';

const ICON_MAP: Record<string, React.ReactNode> = {
  FileCode2: <Braces size={14} />,
  GitCompare: <GitCompare size={14} />,
  QrCode: <QrCode size={14} />,
  ImageIcon: <ImageIcon size={14} />,
  Wrench: <Wrench size={14} />,
  Sparkles: <Sparkles size={14} />,
};

export default function CategoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get('cat') || 'all') as ToolCategory | 'all';

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === 'all') {
      params.delete('cat');
    } else {
      params.set('cat', cat);
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div role="group" aria-label="Filter tools by collection" className="mb-5 flex flex-wrap gap-2">
      <button
        onClick={() => setCategory('all')}
        aria-pressed={active === 'all'}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          active === 'all' ?'border-foreground bg-foreground text-background' :'border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground'
        }`}
      >
        <LayoutGrid size={13} />
        All Tools
        <span className="ml-0.5 tabular-nums text-xs opacity-60">{TOOLS.length}</span>
      </button>

      {CATEGORIES.map((cat) => {
        const isActive = active === cat.id;
        const count = TOOLS.filter((tool) => tool.category === cat.id).length;
        return (
          <button
            key={`cat-filter-${cat.id}`}
            onClick={() => setCategory(cat.id)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? `bg-muted border-border text-foreground`
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            <span className={isActive ? cat.color : ''}>{ICON_MAP[cat.icon]}</span>
            {cat.label}
            <span className="ml-0.5 tabular-nums text-xs opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}