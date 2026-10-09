'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { CATEGORIES, type Tool } from '@/data/tools';
import { BarChart3, X } from 'lucide-react';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';
const isEnabled =
  process.env.NODE_ENV === 'production' && /^G-[A-Z0-9]+$/i.test(measurementId);
const consentStorageKey = 'devtoolkit-analytics-consent';

type Gtag = (command: string, ...parameters: unknown[]) => void;
type AnalyticsConsent = 'unknown' | 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

let configuredMeasurementId = '';
let analyticsConsentGranted = false;

function configureGoogleAnalytics(): Gtag | null {
  if (!isEnabled || !analyticsConsentGranted || typeof window === 'undefined') return null;

  if (configuredMeasurementId !== measurementId) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...parameters) => {
      window.dataLayer?.push(parameters);
    };
    window.gtag('consent', 'default', { analytics_storage: 'denied' });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });
    configuredMeasurementId = measurementId;
  }

  return window.gtag ?? null;
}

export function trackToolOpen(tool: Tool) {
  configureGoogleAnalytics()?.('event', 'tool_open', {
    tool_id: tool.id,
    tool_name: tool.name,
    tool_category: tool.category,
  });
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPagePath = useRef('');
  const category = CATEGORIES.find(({ id }) => id === searchParams.get('cat'))?.id;
  const pagePath = category
    ? `${pathname}?cat=${encodeURIComponent(category)}`
    : pathname ?? '';

  useEffect(() => {
    const gtag = configureGoogleAnalytics();
    if (!gtag || !pagePath || lastPagePath.current === pagePath) return;

    lastPagePath.current = pagePath;
    gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: document.title,
    });
  }, [pagePath]);

  return null;
}

export default function GoogleAnalytics() {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown');
  const [consentReady, setConsentReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    if (!isEnabled) return;

    try {
      const savedConsent = window.localStorage.getItem(consentStorageKey);
      if (savedConsent === 'granted' || savedConsent === 'denied') {
        analyticsConsentGranted = savedConsent === 'granted';
        setConsent(savedConsent);
        setShowPrompt(false);
      }
    } catch {
      setStorageWarning('Your browser could not save this choice. It will apply for this visit only.');
    } finally {
      setConsentReady(true);
    }
  }, []);

  const chooseConsent = (nextConsent: Exclude<AnalyticsConsent, 'unknown'>) => {
    analyticsConsentGranted = nextConsent === 'granted';
    setConsent(nextConsent);
    setShowPrompt(false);
    setStorageWarning('');

    if (!analyticsConsentGranted) {
      window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    } else {
      window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
      configureGoogleAnalytics();
    }

    try {
      window.localStorage.setItem(consentStorageKey, nextConsent);
    } catch {
      setStorageWarning('Your browser could not save this choice. It will apply for this visit only.');
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      {consentReady && consent === 'granted' && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
        </>
      )}
      {consentReady && (
        <>
          {!showPrompt && (
            <button
              type="button"
              onClick={() => setShowPrompt(true)}
              className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg transition-colors hover:text-foreground"
              aria-label="Open analytics privacy settings"
            >
              <BarChart3 size={14} />
              Privacy settings
            </button>
          )}
          {showPrompt && (
            <section
              className="fixed bottom-4 left-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl"
              aria-labelledby="analytics-consent-title"
              role="dialog"
              aria-modal="false"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="analytics-consent-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BarChart3 size={15} className="text-primary" />
                    Help improve DevToolkit
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Allow Google Analytics to count visits and tool opens. Your tool inputs and outputs are never sent.
                  </p>
                </div>
                {consent !== 'unknown' && (
                  <button
                    type="button"
                    onClick={() => setShowPrompt(false)}
                    className="btn-icon -mr-2 -mt-2"
                    aria-label="Close privacy settings"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => chooseConsent('denied')}
                  className="btn-ghost text-xs"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => chooseConsent('granted')}
                  className="btn-primary text-xs"
                >
                  Allow analytics
                </button>
              </div>
              {storageWarning && (
                <p className="mt-3 text-xs text-amber-400" role="status">
                  {storageWarning}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
