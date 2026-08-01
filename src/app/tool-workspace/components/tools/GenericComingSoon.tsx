'use client';
import React from 'react';
import { Tool } from '@/data/tools';
import { Wrench, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_COLORS } from '@/data/tools';

export default function GenericComingSoon({ tool }: { tool: Tool }) {
  const colors = CATEGORY_COLORS[tool.category];
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${colors.bg} border ${colors.border}`}>
        <Wrench size={28} className={colors.text} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{tool.name}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{tool.description}</p>
      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
        <span className="text-amber-400 text-xs font-medium">This tool panel is being built — check back soon.</span>
      </div>
      <Link href="/" className="btn-ghost text-xs">
        <ArrowLeft size={13} />
        Back to Tool Hub
      </Link>
    </div>
  );
}