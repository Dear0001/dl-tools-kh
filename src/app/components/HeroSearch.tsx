'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { TOOLS } from '@/data/tools';

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof TOOLS>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
    ).slice(0, 6);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [query]);

  const handleSelect = (toolId: string) => {
    setQuery('');
    setOpen(false);
    router.push(`/tool-workspace?tool=${toolId}`);
  };

  return (
    <div className="relative max-w-xl">
      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search tools… or press / to focus"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label="Search developer tools"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <span className="kbd absolute right-3.5 top-1/2 -translate-y-1/2">/</span>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-card-hover z-50 overflow-hidden fade-in">
          {results.map((tool) => (
            <button
              key={tool.id}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors duration-100 border-b border-border last:border-b-0"
              onMouseDown={() => handleSelect(tool.id)}
            >
              <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded bg-muted flex-shrink-0">
                <span className="text-xs text-muted-foreground font-mono">{tool.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{tool.name}</span>
                  {tool.isNew && (
                    <span className="tool-category-badge bg-primary/10 text-primary border border-primary/20">New</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}