'use client';

import React, { Suspense, useRef } from 'react';
import Link from 'next/link';
import HeroSearch from './components/HeroSearch';
import CategoryFilters from './components/CategoryFilters';
import ToolGrid from './components/ToolGrid';
import RecentTools from './components/RecentTools';
import Toast from '@/components/ui/Toast';
import { TOOLS, CATEGORIES } from '@/data/tools';
import { getToolName, useLocale } from '@/i18n/LocaleProvider';

const DRIZZLE_DROPS = [
  ['4%', '10.5s', '-7s', '0.56', '14px', '0.11'], ['9%', '12s', '-2s', '0.72', '19px', '0.14'],
  ['14%', '9.5s', '-5s', '0.5', '12px', '0.1'], ['19%', '13s', '-10s', '0.82', '22px', '0.16'],
  ['24%', '11s', '-3s', '0.62', '16px', '0.12'], ['29%', '14s', '-8s', '0.9', '24px', '0.15'],
  ['34%', '10s', '-1s', '0.58', '15px', '0.11'], ['39%', '12.5s', '-9s', '0.76', '20px', '0.14'],
  ['44%', '9s', '-4s', '0.52', '13px', '0.1'], ['49%', '13.5s', '-6s', '0.84', '23px', '0.16'],
  ['54%', '10.5s', '-11s', '0.6', '16px', '0.12'], ['59%', '12s', '-5s', '0.74', '18px', '0.14'],
  ['64%', '9.5s', '-8s', '0.54', '13px', '0.1'], ['69%', '14s', '-2s', '0.88', '25px', '0.16'],
  ['74%', '11s', '-7s', '0.64', '17px', '0.12'], ['79%', '13s', '-4s', '0.8', '21px', '0.15'],
  ['84%', '10s', '-10s', '0.57', '15px', '0.11'], ['89%', '12.5s', '-1s', '0.7', '19px', '0.13'],
  ['94%', '9.5s', '-6s', '0.52', '12px', '0.1'],
] as const;

export default function HomePage() {
  const { t, locale } = useLocale();
  const isKhmer = locale === 'kh';
  const heroRef = useRef<HTMLElement>(null);

  const moveHeroBackground = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    const hero = heroRef.current;
    hero?.style.setProperty('--pointer-x', `${horizontal * 24}px`);
    hero?.style.setProperty('--pointer-y', `${vertical * 18}px`);
    hero?.style.setProperty('--pointer-rotate', `${horizontal * 1.4}deg`);
  };

  const resetHeroBackground = () => {
    const hero = heroRef.current;
    hero?.style.setProperty('--pointer-x', '0px');
    hero?.style.setProperty('--pointer-y', '0px');
    hero?.style.setProperty('--pointer-rotate', '0deg');
  };

  return (
    <>
      <Toast />
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:px-8 xl:px-10 2xl:px-16">
        <section
          ref={heroRef}
          onPointerMove={moveHeroBackground}
          onPointerLeave={resetHeroBackground}
          className="landing-section-enter relative isolate overflow-hidden rounded-3xl border border-border bg-card/60 px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
        >
          <div className="landing-aurora pointer-events-none absolute -inset-[18%] -z-10" aria-hidden="true" />
          <div className="landing-rain pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            {DRIZZLE_DROPS.map(([left, duration, delay, scale, drift, opacity], index) => (
              <span
                key={`drizzle-${index}`}
                className="landing-rain-drop"
                style={{
                  left,
                  animationDuration: duration,
                  animationDelay: delay,
                  '--drop-scale': scale,
                  '--drop-drift': drift,
                  '--drop-opacity': opacity,
                } as React.CSSProperties}
              >
                <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden="true">
                  <path d="M12 1.5C9.1 6.2 3.7 12.4 3.7 19a8.3 8.3 0 1 0 16.6 0c0-6.6-5.4-12.8-8.3-17.5Z" />
                </svg>
              </span>
            ))}
          </div>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className={`landing-enter mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 font-semibold text-primary ${isKhmer ? 'text-sm tracking-normal' : 'text-xs uppercase tracking-[0.14em]'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" aria-hidden="true" />
              {t('heroEyebrow')}
            </p>
            <h1 className={`landing-enter landing-delay-1 max-w-4xl text-balance font-semibold text-foreground ${isKhmer ? 'text-3xl leading-[1.45] sm:text-4xl sm:leading-[1.4]' : 'text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl'}`}>
              {t('heroFirstLine')}
              <span className="mt-1 block text-primary">{t('heroSecondLine')}</span>
            </h1>
            <p className={`landing-enter landing-delay-2 mt-5 max-w-2xl text-muted-foreground ${isKhmer ? 'text-base leading-8 sm:text-lg sm:leading-9' : 'text-base leading-7 sm:text-lg sm:leading-8'}`}>
              {t('heroDescription')}
            </p>

            <div className="landing-enter landing-delay-3 landing-search-card mt-8 w-full max-w-2xl rounded-2xl border border-border bg-background/80 p-3 text-left shadow-xl shadow-black/5 backdrop-blur sm:p-4">
              <div className="mb-3 px-1 sm:px-2">
                <h2 className="text-sm font-semibold text-foreground">{t('findTool')}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{t('searchHelp')}</p>
              </div>
              <HeroSearch />
              <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground sm:px-2">
                {t('devicePrivacy')}
              </p>
            </div>

            <nav className="landing-enter landing-delay-4 mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2" aria-label={t('popular')}>
              <span className="mr-1 text-xs font-medium text-muted-foreground">{t('popular')}:</span>
              {TOOLS.filter((tool) => tool.popular).slice(0, 4).map((tool) => (
                <Link
                  key={`hero-popular-${tool.id}`}
                  href={`/tool-workspace?tool=${encodeURIComponent(tool.id)}`}
                  className="rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none"
                >
                  {getToolName(tool.id, tool.name, locale)}
                </Link>
              ))}
            </nav>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:gap-x-8">
              <span><strong className="font-semibold text-foreground">{TOOLS.length}</strong> {t('tools')}</span>
              <span><strong className="font-semibold text-foreground">{CATEGORIES.length}</strong> {t('collections')}</span>
            </div>
          </div>
        </section>

        <section className="landing-section-enter border-b border-border py-7" aria-label={t('recentTools')}>
          <RecentTools />
        </section>

        <section className="landing-section-enter landing-delay-1 pt-9" aria-labelledby="browse-tools-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t('toolLibrary')}</p>
              <h2 id="browse-tools-heading" className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {t('browseTools')}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('browseHelp')}</p>
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
          <p>{t('usefulTools')}</p>
          <p>{t('clientTools')}</p>
        </footer>
      </div>
    </>
  );
}
