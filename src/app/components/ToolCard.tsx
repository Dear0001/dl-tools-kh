'use client';
import React from 'react';
import Link from 'next/link';
import {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
  ArrowRight, Star, Zap
} from 'lucide-react';
import { Tool, CATEGORY_COLORS, CATEGORIES } from '@/data/tools';

const ICON_MAP: Record<string, React.ElementType> = {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
};

export default function ToolCard({ tool }: { tool: Tool }) {
  const colors = CATEGORY_COLORS[tool.category];
  const IconComponent = ICON_MAP[tool.icon] || Braces;
  const categoryLabel = CATEGORIES.find((category) => category.id === tool.category)?.label ?? tool.category;

  return (
    <Link
      href={`/tool-workspace?tool=${tool.id}`}
      className="group relative flex min-h-44 flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open ${tool.name}`}
    >
      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${colors.bg} ${colors.border}`}>
          <IconComponent size={17} className={colors.text} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {tool.popular && (
            <span className="tool-category-badge bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Star size={8} />
              Popular
            </span>
          )}
          {tool.isNew && (
            <span className="tool-category-badge bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Zap size={8} />
              New
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="mb-1.5 text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {tool.name}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className={`tool-category-badge border ${colors.bg} ${colors.text} ${colors.border}`}>
          {categoryLabel}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 group-hover:text-primary">
          Open
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-150" />
        </span>
      </div>
    </Link>
  );
}