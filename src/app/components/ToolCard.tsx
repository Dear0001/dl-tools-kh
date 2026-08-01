'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
  ArrowRight, Star, Zap
} from 'lucide-react';
import { Tool, CATEGORY_COLORS } from '@/data/tools';

const ICON_MAP: Record<string, React.ElementType> = {
  Braces, FileCode2, Code2, Palette, Database, AlignLeft, FileText,
  GitCompare, FileDiff, Code, QrCode, ShieldCheck, ScanLine,
  ImageIcon, Minimize2, PenTool, Fingerprint, Hash, Key,
  Link2, SearchCode, Clock, Sparkles, FileCode, Terminal, TableProperties,
};

export default function ToolCard({ tool }: { tool: Tool }) {
  const router = useRouter();
  const colors = CATEGORY_COLORS[tool.category];
  const IconComponent = ICON_MAP[tool.icon] || Braces;

  const launch = () => {
    router.push(`/tool-workspace?tool=${tool.id}`);
  };

  return (
    <div
      className="group relative bg-card border border-border rounded-xl p-5 flex flex-col gap-3 cursor-pointer card-glow-hover"
      onClick={launch}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && launch()}
      aria-label={`Open ${tool.name}`}
    >
      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} border ${colors.border}`}>
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
        <h3 className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-150">
          {tool.name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className={`tool-category-badge ${colors.bg} ${colors.text} border ${colors.border}`}>
          {tool.category}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors duration-150">
          Open
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-150" />
        </span>
      </div>
    </div>
  );
}