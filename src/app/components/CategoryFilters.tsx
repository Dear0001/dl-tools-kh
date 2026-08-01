'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Braces, GitCompare, QrCode, ImageIcon, Wrench, Sparkles, LayoutGrid } from 'lucide-react';
import { CATEGORIES, ToolCategory } from '../../data/tools';

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
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setCategory('all')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
          active === 'all' ?'bg-foreground text-background border-foreground' :'bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
        }`}
      >
        <LayoutGrid size={13} />
        All Tools
        <span className="tabular-nums text-xs opacity-60 ml-0.5">29</span>
      </button>

      {CATEGORIES.map((cat) => {
        const isActive = active === cat.id;
        return (
          <button
            key={`cat-filter-${cat.id}`}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              isActive
                ? `bg-muted border-border text-foreground`
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            <span className={isActive ? cat.color : ''}>{ICON_MAP[cat.icon]}</span>
            {cat.label}
            <span className="tabular-nums text-xs opacity-60 ml-0.5">{cat.count}</span>
          </button>
        );
      })}
    </div>
  );
}