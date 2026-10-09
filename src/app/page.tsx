import React, { Suspense } from 'react';
import HeroSearch from './components/HeroSearch';
import CategoryFilters from './components/CategoryFilters';
import ToolGrid from './components/ToolGrid';
import RecentTools from './components/RecentTools';
import Toast from '@/components/ui/Toast';
import { TOOLS, CATEGORIES } from '@/data/tools';

export default function HomePage() {
  return (
    <>
      <Toast />
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:px-8 xl:px-10 2xl:px-16">
        <section className="grid items-center gap-8 border-b border-border pb-10 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:pb-12">
          <div>
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="h-px w-6 bg-primary" />
              Developer tools, ready when you are
            </p>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
              Find the right tool.
              <span className="block text-muted-foreground">Get back to building.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Format, compare, convert, and inspect code or data—right in your browser, with no account or upload.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span><strong className="font-semibold text-foreground">{TOOLS.length}</strong> tools</span>
              <span><strong className="font-semibold text-foreground">{CATEGORIES.length}</strong> collections</span>
              <span><strong className="font-semibold text-foreground">0</strong> files uploaded</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Find a tool</h2>
                <p className="mt-1 text-sm text-muted-foreground">Search by name or what you need to do.</p>
              </div>
            </div>
            <HeroSearch />
            <p className="mt-3 text-xs text-muted-foreground">
              Your data stays on this device while you work.
            </p>
          </div>
        </section>

        <section className="border-b border-border py-7" aria-label="Recently used tools">
          <RecentTools />
        </section>

        <section className="pt-9" aria-labelledby="browse-tools-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tool library</p>
              <h2 id="browse-tools-heading" className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Browse all tools
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">Choose a collection, then open the tool you need.</p>
          </div>
          <Suspense fallback={
            <div className="mb-5 flex flex-wrap gap-2" aria-hidden="true">
              {Array.from({ length: CATEGORIES.length + 1 }).map((_, index) => (
                <div key={index} className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />
              ))}
            </div>
          }>
            <CategoryFilters />
          </Suspense>
          <ToolGrid />
        </section>

        <footer className="mt-12 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Useful utilities, without getting in your way.</p>
          <p>Runs in your browser · No account required</p>
        </footer>
      </div>
    </>
  );
}
