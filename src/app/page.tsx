import React, { Suspense } from 'react';
import Link from 'next/link';
import HeroSearch from './components/HeroSearch';
import CategoryFilters from './components/CategoryFilters';
import ToolGrid from './components/ToolGrid';
import RecentTools from './components/RecentTools';
import Toast from '@/components/ui/Toast';

export default function HomePage() {
  return (
    <>
      <Toast />
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-10">
        <section className="grid gap-10 lg:grid-cols-[1fr_0.95fr] items-center py-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> 100% browser-native toolkit
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
              Build, inspect, and format code with a powerful browser toolkit.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg leading-8 text-muted-foreground">
              DevToolkit brings developer utilities directly to your browser. No installs, no accounts, no backend processing.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/tool-workspace" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-background shadow-lg shadow-primary/15 transition hover:bg-primary/90">
                Open workspace
              </Link>
              <Link href="#features" className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
                Discover features
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5">
            <div className="grid gap-5">
              <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Quick launch</span>
                  <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Fast</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Search tools instantly and start editing with zero setup.
                </p>
                <div className="mt-5">
                  <HeroSearch />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Privacy</p>
                  <p className="mt-3 text-base font-semibold text-foreground">Your data stays in the browser.</p>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Instant</p>
                  <p className="mt-3 text-base font-semibold text-foreground">Tools are ready immediately, with no backend latency.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-8 py-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Designed for developers</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Tools for everyday code work: formatting, validation, encoding, and quick inspections.</p>
            </div>
            <div className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">No login required</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Start using the toolkit instantly without accounts, registrations, or cloud dependencies.</p>
            </div>
            <div className="rounded-[2rem] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">Responsive experience</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Works smoothly across desktop and mobile browsers.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Featured tools</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">Powerful utilities, zero setup.</h2>
            </div>
            <Link href="/tool-workspace" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
              Open workspace
            </Link>
          </div>
          <div className="mt-8">
            <Suspense fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-28 rounded-[1.5rem] bg-muted/40 animate-pulse" />
                ))}
              </div>
            }>
              <CategoryFilters />
            </Suspense>
            <ToolGrid />
          </div>
        </section>

        <section className="mt-10">
          <RecentTools />
        </section>
      </div>
    </>
  );
}
