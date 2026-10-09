'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { TOOLS } from '@/data/tools';

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof TOOLS>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setOpen(true);
  }, [query]);

  const handleSelect = () => {
    setQuery('');
    setOpen(false);
  };

  return (
    <div
      className="relative max-w-xl"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search tools by name or task…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          aria-label="Search developer tools"
          aria-expanded={open}
          aria-controls="tool-search-results"
        />
        <span className="kbd absolute right-3.5 top-1/2 -translate-y-1/2">/</span>
      </div>

      {open && query.trim() && (
        <div
          id="tool-search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-card-hover fade-in"
        >
          {results.length > 0 ? (
            results.map((tool) => (
              <Link
                key={tool.id}
                href={`/tool-workspace?tool=${tool.id}`}
                onClick={handleSelect}
                className="flex items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors duration-100 last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-muted">
                  <span className="font-mono text-xs text-muted-foreground">{tool.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{tool.name}</span>
                    {tool.isNew && (
                      <span className="tool-category-badge border border-primary/20 bg-primary/10 text-primary">New</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No matching tools. Try a different name or keyword.
            </p>
          )}
        </div>
      )}
    </div>
  );
}