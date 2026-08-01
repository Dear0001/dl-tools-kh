import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import HeroSearch from './components/HeroSearch';
import CategoryFilters from './components/CategoryFilters';
import ToolGrid from './components/ToolGrid';
import RecentTools from './components/RecentTools';
import Toast from '@/components/ui/Toast';

export default function HomePage() {
  return (
    <AppLayout>
      <Toast />
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-10">
        {/* Hero section */}
        <section className="mb-10">
          <div className="relative rounded-2xl overflow-hidden bg-grid-pattern border border-border p-8 md:p-12 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="tool-category-badge bg-primary/10 text-primary border border-primary/20">
                  100% Client-Side
                </span>
                <span className="tool-category-badge bg-muted text-muted-foreground border border-border">
                  No Login Required
                </span>
                <span className="tool-category-badge bg-accent/10 text-accent border border-accent/20">
                  29 Tools
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
                Developer Tools,{' '}
                <span className="text-primary text-primary-glow">Right in Your Browser</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed mb-6">
                Format, diff, convert, generate, and inspect — zero install, zero signup, zero data leaving your machine.
              </p>
              <HeroSearch />
            </div>
          </div>

          {/* Recent tools strip */}
          <RecentTools />
        </section>

        {/* Category filters + tool grid */}
        <section>
          <Suspense fallback={
            <div className="flex flex-wrap gap-2 mb-6">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={`cat-skeleton-${i}`} className="animate-pulse h-8 w-24 rounded-full bg-muted border border-border" />
              ))}
            </div>
          }>
            <CategoryFilters />
          </Suspense>
          <ToolGrid />
        </section>
      </div>
    </AppLayout>
  );
}