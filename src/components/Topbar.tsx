'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, X, Zap, HandCoins } from 'lucide-react';

// Inline GitHub SVG since brand icons were removed in lucide-react v1
function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const i18n = {
  en: {
    toolHub: 'Tool Hub',
    workspace: 'Workspace',
    allClient: 'All client-side',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    free: 'Free',
    support: 'Support',
    supportTitle: 'Thank you for helping',
    supportMessage: 'If you would like to support this project with a small contribution, please scan the QR code below to thank the person who is receiving payment.',
    supportCta: 'Any amount is appreciated',
  },
  kh: {
    toolHub: 'មជ្ឈមណ្ឌលឧបករណ៍',
    workspace: 'កន្លែងធ្វើការ',
    allClient: 'ទាំងអស់នៅលើ Client',
    theme: 'ប្រធានពណ៌',
    light: 'ស្រាល',
    dark: 'ងងឹត',
    language: 'ភាសា',
    free: 'ឥតគិតថ្លៃ',
    support: 'ជួយគាំទ្រ',
    supportTitle: 'អរគុណចំពោះការជួយគាំទ្រ',
    supportMessage: 'ប្រសិនបើអ្នកចង់គាំទ្រโปรเจកនេះដោយការបរិច្ចាគតិចតួច សូមស្កែន QR ខាងក្រោម។',
    supportCta: 'ការបរិច្ចាគណាមួយក៏ទទួលបានអំណរគុណ',
  },
};

export default function Topbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [locale, setLocale] = useState<'en' | 'kh'>('kh');
  const [userSelectedTheme, setUserSelectedTheme] = useState(false);
  const [userSelectedLocale, setUserSelectedLocale] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem('devtoolkit-theme');
      const storedLocale = window.localStorage.getItem('devtoolkit-locale');

      if (storedTheme === 'dark' || storedTheme === 'light') {
        setTheme(storedTheme);
        setUserSelectedTheme(true);
      }
      if (storedLocale === 'en' || storedLocale === 'kh') {
        setLocale(storedLocale);
        setUserSelectedLocale(true);
      }
    } catch {
      // ignore localStorage errors in unsupported environments
    }
  }, []);

  const texts = i18n[locale];
  const navLinks = [
    { label: texts.toolHub, href: '/', key: 'nav-hub' },
    { label: texts.workspace, href: '/tool-workspace', key: 'nav-workspace' },
  ];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale === 'kh' ? 'km' : 'en';
  }, [locale]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem('devtoolkit-theme', next);
        setUserSelectedTheme(true);
      } catch {
        // ignore localStorage write failures
      }
      return next;
    });
  };

  const handleLocaleChange = (value: 'en' | 'kh') => {
    setLocale(value);
    try {
      window.localStorage.setItem('devtoolkit-locale', value);
      setUserSelectedLocale(true);
    } catch {
      // ignore localStorage write failures
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="rounded-full border border-border/70 bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5">
                <AppLogo size={28} className="rounded-full overflow-hidden" />
              </div>
              <span className="font-semibold text-base tracking-tight text-foreground group-hover:text-primary transition-colors duration-150">
                ឧបករណ៍​កម្ពុជា
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-2xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 tracking-wider uppercase">
                <Zap size={9} />
                {texts.free}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks?.map((link) => {
                const isActive = pathname === link?.href || (link?.href !== '/' && pathname?.startsWith(link?.href));
                return (
                  <Link
                    key={link?.key}
                    href={link?.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {link?.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost hidden sm:inline-flex px-3 py-1.5 rounded-md text-sm font-medium"
                onClick={() => setSupportOpen(true)}
                aria-label={texts.support}
              >
                <HandCoins size={14} className="mr-2" />
                {texts.support}
              </button>
              <button
                type="button"
                className="btn-ghost hidden sm:inline-flex px-3 py-1.5 rounded-md text-sm font-medium"
                onClick={toggleTheme}
                aria-label={texts.theme}
              >
                {texts.theme}: {theme === 'dark' ? texts.dark : texts.light}
              </button>
              <select
                value={locale}
                onChange={(event) => handleLocaleChange(event.target.value as 'en' | 'kh')}
                className="hidden sm:inline-flex text-sm rounded-md border border-border bg-card px-3 py-1.5 text-foreground outline-none"
                aria-label={texts.language}
              >
                <option value="en">EN</option>
                <option value="kh">KH</option>
              </select>
              <a
                href="https://github.com/Dear0001"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon hidden sm:flex"
                aria-label="View on GitHub"
              >
                <GithubIcon size={16} />
              </a>
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="status-dot-success" />
                {texts.allClient}
              </span>
              <button
                className="btn-icon md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {supportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl slide-up">
            <div className="absolute inset-0 overflow-hidden rounded-3xl bg-animated-background opacity-30" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 border-b px-2 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white">
                <div>
                  <h3 className="text-base font-semibold uppercase tracking-[0.2em]">Support</h3>
                </div>
                <button type="button" className="btn-icon text-white transition-transform duration-200 hover:scale-110" onClick={() => setSupportOpen(false)} aria-label="Close support modal">
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="rounded-[32px] border border-border bg-white p-5 shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_70px_rgba(0,212,170,0.08)]">
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">Thank you for supporting us!</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      If you want to send a small thank-you contribution, please scan the QR code below.
                    </p>
                  </div>
                  <div className="relative mx-auto mt-6 flex w-full max-w-[280px] justify-center">
                    <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-red-200/40 via-transparent to-teal-100/30 blur-xl" />
                    <div className="relative flex h-[240px] w-[240px] items-center justify-center overflow-hidden rounded-[28px] border border-border bg-[#f8f8f8] p-3 shadow-lg">
                      <div className="absolute inset-0 rounded-[28px] border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]" />
                      <Image
                        src="/assets/images/qr-code.jpg"
                        alt="Support QR code"
                        width={240}
                        height={240}
                        className="relative h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-foreground text-center">Any amount is appreciated.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 flex flex-col gap-3 fade-in">
            {navLinks?.map((link) => {
              const isActive = pathname === link?.href;
              return (
                <Link
                  key={link?.key}
                  href={link?.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link?.label}
                </Link>
              );
            })}
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              <button
                type="button"
                className="btn-ghost w-full px-4 py-2 rounded-md text-left text-sm font-medium"
                onClick={() => {
                  setSupportOpen(true);
                  setMobileOpen(false);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <HandCoins size={14} />
                  {texts.support}
                </span>
              </button>
              <button
                type="button"
                className="btn-ghost w-full px-4 py-2 rounded-md text-left text-sm font-medium"
                onClick={() => {
                  toggleTheme();
                  setMobileOpen(false);
                }}
              >
                {texts.theme}: {theme === 'dark' ? texts.dark : texts.light}
              </button>
              <label className="flex items-center justify-between gap-3 px-4 py-2 rounded-md border border-border bg-background text-sm text-foreground">
                <span>{texts.language}</span>
                <select
                  value={locale}
                  onChange={(event) => handleLocaleChange(event.target.value as 'en' | 'kh')}
                  className="bg-transparent text-sm text-foreground outline-none"
                >
                  <option value="en">EN</option>
                  <option value="kh">KH</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}