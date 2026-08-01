'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ToolCard from './ToolCard';
import { TOOLS, ToolCategory } from '@/data/tools';

function ToolGridInner() {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat') as ToolCategory | null;

  const filtered = cat ? TOOLS.filter((t) => t.category === cat) : TOOLS;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No tools in this category</h3>
        <p className="text-sm text-muted-foreground">Try selecting a different category or clearing the filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {filtered.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
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