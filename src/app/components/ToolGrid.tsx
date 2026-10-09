'use client';
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ToolCard from './ToolCard';
import { TOOLS, ToolCategory, CATEGORIES } from '@/data/tools';

function ToolGridInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat') as ToolCategory | null;
  const category = CATEGORIES.find((item) => item.id === cat);
  const filtered = category ? TOOLS.filter((tool) => tool.category === category.id) : cat ? [] : TOOLS;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-start rounded-xl border border-dashed border-border bg-card/50 px-5 py-8">
        <h3 className="text-base font-semibold text-foreground">No tools found in this collection</h3>
        <p className="mt-1 text-sm text-muted-foreground">Choose another collection or view all tools.</p>
        <button type="button" onClick={() => router.push('/')} className="btn-primary mt-4">
          Show all tools
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium tabular-nums text-foreground">{filtered.length}</span>
        {category ? ` ${category.label.toLowerCase()} tools` : ' tools'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </>
  );
}

export default function ToolGrid() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`skeleton-tool-${i}`} className="animate-pulse bg-card border border-border rounded-xl h-40" />
        ))}
      </div>
    }>
      <ToolGridInner />
    </Suspense>
  );
}