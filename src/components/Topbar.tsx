'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, X, Zap, HandCoins, LogIn, LogOut, ChevronDown, CircleUserRound, Heart } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CATEGORIES, TOOLS } from '@/data/tools';
import { getToolName, useLocale } from '@/i18n/LocaleProvider';

type Theme = 'light' | 'dark' | 'nord' | 'monokai';
const THEMES: Theme[] = ['light', 'dark', 'nord', 'monokai'];

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
    nord: 'Nord',
    monokai: 'Monokai',
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
    nord: 'ន័រដ៍',
    monokai: 'ម៉ូណូកៃ',
    language: 'ភាសា',
    free: 'ឥតគិតថ្លៃ',
    support: 'ជួយគាំទ្រ',
    supportTitle: 'អរគុណចំពោះការជួយគាំទ្រ',
    supportMessage: 'ប្រសិនបើអ្នកចង់ជួយគាំទ្រគម្រោងនេះដោយការបរិច្ចាគតិចតួច សូមស្កេន QR ខាងក្រោម។',
    supportCta: 'ការបរិច្ចាគណាមួយក៏ទទួលបានអំណរគុណ',
  },
};

export default function Topbar() {
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();
  const { locale, setLocale, t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [supportOpen, setSupportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem('devtoolkit-theme');
      if (THEMES.includes(storedTheme as Theme)) setTheme(storedTheme as Theme);
    } catch {
      // ignore localStorage errors in unsupported environments
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (authStatus !== 'authenticated' || !userId) return;

    let active = true;
    fetch('/api/user/preferences')
      .then(async (response) => {
        const result = (await response.json()) as { theme?: string; locale?: string; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load your saved preferences.');
        return result;
      })
      .then((preferences) => {
        if (!active) return;
        if (THEMES.includes(preferences.theme as Theme)) {
          setTheme(preferences.theme as Theme);
          window.localStorage.setItem('devtoolkit-theme', preferences.theme as Theme);
        }
        if (preferences.locale === 'en' || preferences.locale === 'kh') setLocale(preferences.locale);
        setPreferencesLoadedFor(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Could not load your saved preferences.';
        toast.error(message);
      });

    return () => {
      active = false;
    };
  }, [authStatus, session?.user?.id]);

  const texts = i18n[locale];
  const navLinks = [
    { label: t('toolHub'), href: '/', key: 'nav-hub', menu: 'hub' },
    { label: t('workspace'), href: '/tool-workspace', key: 'nav-workspace', menu: 'workspace' },
  ];
  const categoryNames: Record<string, string> = {
    formatters: locale === 'kh' ? 'កម្មវិធីរៀបចំទ្រង់ទ្រាយ' : 'Formatters',
    diff: locale === 'kh' ? 'ប្រៀបធៀប' : 'Diff & Compare',
    qr: locale === 'kh' ? 'QR និង KHQR' : 'QR & KHQR',
    image: locale === 'kh' ? 'រូបភាព និង Base64' : 'Image & Base64',
    utilities: locale === 'kh' ? 'ឧបករណ៍ប្រើប្រាស់' : 'Utilities',
    generators: locale === 'kh' ? 'កម្មវិធីបង្កើត' : 'Generators',
    documents: locale === 'kh' ? 'ឯកសារ' : 'Documents',
  };
  const workspaceTools = TOOLS.filter((tool) => tool.popular || tool.id === 'tool-pdf-word-converter');
  const userName = session?.user?.name?.trim() || session?.user?.email || (locale === 'kh' ? 'គណនីរបស់អ្នក' : 'Your account');
  const userInitial = userName.charAt(0).toLocaleUpperCase();

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme !== 'light');
  }, [theme]);

  const savePreference = async (preference: { theme?: Theme; locale?: 'en' | 'kh' }) => {
    if (authStatus !== 'authenticated' || !session?.user?.id || preferencesLoadedFor !== session.user.id) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not sync your preferences.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sync your preferences.';
      toast.error(message);
    }
  };

  const handleThemeChange = (next: Theme) => {
    setTheme(next);
    try {
      window.localStorage.setItem('devtoolkit-theme', next);
    } catch {
      toast.error('Could not save the theme on this device.');
    }
    void savePreference({ theme: next });
  };

  const handleLocaleChange = (value: 'en' | 'kh') => {
    setLocale(value);
    void savePreference({ locale: value });
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="flex h-14 items-center justify-between gap-3">
            {/* Logo */}
            <Link href="/" className="group flex min-w-0 items-center gap-2.5">
              <div className="rounded-full border border-border/70 bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5">
                <AppLogo size={28} className="rounded-full overflow-hidden" />
              </div>
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 group-hover:text-primary sm:text-base">
                ឧបករណ៍​កម្ពុជា
              </span>
              <span className="hidden items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-primary lg:inline-flex">
                <Zap size={9} />
                {texts.free}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks?.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                return (
                          <div
                            key={link.key}
                            className="group relative"
                            onMouseEnter={() => setOpenMenu(link.menu)}
                            onMouseLeave={() => setOpenMenu(null)}
                            onFocus={() => setOpenMenu(link.menu)}
                          >
                            <div
                              data-active={isActive}
                              data-open={openMenu === link.menu}
                              className={`nav-liquid-control flex items-center rounded-lg text-sm font-medium transition-colors ${
                                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Link href={link.href} className="px-3 py-1.5">{link.label}</Link>
                              <button
                                type="button"
                                className="mr-1 rounded p-1 hover:bg-muted"
                                aria-label={`${link.label} ${locale === 'kh' ? 'ឧបករណ៍' : 'tools'}`}
                                aria-expanded={openMenu === link.menu}
                                aria-haspopup="true"
                                onClick={() => setOpenMenu((current) => current === link.menu ? null : link.menu)}
                              >
                                <ChevronDown size={13} aria-hidden="true" />
                              </button>
                            </div>
                            <div className={`invisible absolute left-1/2 top-full z-[60] w-[min(92vw,46rem)] -translate-x-1/2 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
                              openMenu === link.menu ? 'visible opacity-100' : ''
                            }`}>
                              <div className="nav-liquid-glass nav-tools-dropdown max-h-[min(70vh,34rem)] overflow-y-auto rounded-xl p-4">
                                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                                  {link.menu === 'hub' ? t('allTools') : t('popularTools')}
                                </p>
                                {link.menu === 'hub' ? (
                                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {CATEGORIES.map((category) => (
                                      <section key={category.id}>
                                        <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                          {categoryNames[category.id] ?? category.label}
                                        </h3>
                                        <ul className="space-y-0.5">
                                          {TOOLS.filter((tool) => tool.category === category.id).map((tool) => (
                                            <li key={tool.id}>
                                              <Link
                                                href={`/tool-workspace?tool=${encodeURIComponent(tool.id)}`}
                                                onClick={() => setOpenMenu(null)}
                                                className="block rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted hover:text-primary"
                                              >
                                                {getToolName(tool.id, tool.name, locale)}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </section>
                                    ))}
                                  </div>
                                ) : (
                                  <ul className="grid gap-1 sm:grid-cols-2">
                                    {workspaceTools.map((tool) => (
                                      <li key={tool.id}>
                                        <Link
                                          href={`/tool-workspace?tool=${encodeURIComponent(tool.id)}`}
                                          onClick={() => setOpenMenu(null)}
                                          className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary"
                                        >
                                          {getToolName(tool.id, tool.name, locale)}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
            </nav>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                className="nav-liquid-control nav-support-control btn-ghost hidden rounded-lg px-3 py-1.5 text-sm font-medium lg:inline-flex"
                onClick={() => setSupportOpen(true)}
                aria-label={texts.support}
              >
                <HandCoins size={14} />
                {texts.support}
              </button>
              <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    ref={profileTriggerRef}
                    className="nav-liquid-control flex h-9 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setProfileMenuOpen((open) => !open)}
                    aria-label={locale === 'kh' ? 'បើកម៉ឺនុយគណនី' : 'Open profile menu'}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' && !profileMenuOpen) {
                        event.preventDefault();
                        setProfileMenuOpen(true);
                        requestAnimationFrame(() => profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                      }
                    }}
                  >
                    {authStatus === 'authenticated' && session.user?.image ? (
                      <Image src={session.user.image} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-full object-cover" />
                    ) : authStatus === 'authenticated' ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{userInitial}</span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"><CircleUserRound size={23} strokeWidth={1.7} /></span>
                    )}
                    <span className="hidden max-w-32 truncate md:inline">{authStatus === 'authenticated' ? userName : (locale === 'kh' ? 'គណនី' : 'Profile')}</span>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {profileMenuOpen && (
                    <div className="nav-liquid-glass absolute right-0 top-full z-[70] mt-2 w-72 overflow-hidden rounded-xl p-2" role="menu" aria-label={locale === 'kh' ? 'ម៉ឺនុយគណនី' : 'Account menu'}>
                      {authStatus === 'authenticated' ? (
                        <>
                          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
                            {session.user?.image ? (
                              <Image src={session.user.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{userInitial}</span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                              {session.user?.email && session.user.name && <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>}
                              <p className="mt-0.5 text-[11px] text-primary">{locale === 'kh' ? 'បានចូលគណនី' : 'Signed in with Google'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="menuitem"
                            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              void signOut({ callbackUrl: '/' });
                            }}
                          >
                            <LogOut size={15} />
                            {t('signOut')}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><CircleUserRound size={30} strokeWidth={1.5} /></span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{locale === 'kh' ? 'អ្នកប្រើប្រាស់ភ្ញៀវ' : 'Guest profile'}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{authStatus === 'loading' ? (locale === 'kh' ? 'កំពុងផ្ទៀងផ្ទាត់…' : 'Checking sign-in…') : (locale === 'kh' ? 'ចូលគណនីដើម្បីធ្វើសមកាលកម្មទិន្នន័យ' : 'Sign in to sync your saved data')}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="menuitem"
                            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              void signIn('google');
                            }}
                            disabled={authStatus === 'loading'}
                          >
                            <LogIn size={15} />
                            {t('signInGoogle')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
              </div>
              <select
                className="nav-liquid-control hidden rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary lg:inline-flex"
                onChange={(event) => handleThemeChange(event.target.value as Theme)}
                value={theme}
                aria-label={texts.theme}
              >
                {THEMES.map((option) => <option key={option} value={option}>{texts[option]}</option>)}
              </select>
              <select
                value={locale}
                onChange={(event) => handleLocaleChange(event.target.value as 'en' | 'kh')}
                className="nav-liquid-control hidden rounded-lg px-3 py-1.5 text-sm text-foreground outline-none md:inline-flex"
                aria-label={texts.language}
              >
                <option value="en">EN</option>
                <option value="kh">KH</option>
              </select>
              <a
                href="https://github.com/Dear0001"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-liquid-control btn-icon hidden rounded-lg lg:flex"
                aria-label="View on GitHub"
              >
                <GithubIcon size={16} />
              </a>
              <span className="nav-liquid-control hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground xl:flex">
                <span className="status-dot-success" />
                {texts.allClient}
              </span>
              <button
                type="button"
                className="nav-liquid-control btn-icon rounded-lg md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t('toggleMenu')}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {supportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="support-modal-title" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl slide-up">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500" aria-hidden="true">
                  <Heart size={18} />
                </span>
                <h3 id="support-modal-title" className="text-base font-semibold tracking-normal text-foreground">{texts.support}</h3>
              </div>
              <button type="button" className="btn-icon rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setSupportOpen(false)} aria-label={locale === 'kh' ? 'បិទ' : 'Close support modal'}>
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-6 sm:px-8">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{texts.supportTitle}</p>
                <p className={`mx-auto mt-2 max-w-sm text-sm text-muted-foreground ${locale === 'kh' ? 'leading-8' : 'leading-6'}`}>
                  {texts.supportMessage}
                </p>
              </div>
              <div className="mx-auto mt-6 w-full max-w-[300px] rounded-2xl border border-border bg-white p-2 shadow-lg">
                <Image
                  src="/assets/images/qr-code.jpg"
                  alt="Support QR code"
                  width={300}
                  height={300}
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>
              <p className={`mt-5 text-center text-sm font-medium text-foreground ${locale === 'kh' ? 'leading-8' : 'leading-6'}`}>
                {texts.supportCta}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div id="mobile-navigation" className="absolute top-14 left-0 right-0 flex flex-col gap-3 border-b border-border bg-card p-4 fade-in">
            {navLinks?.map((link) => {
              const isActive = pathname === link?.href;
              return (
                <section key={link.key}>
                  <div className="flex items-center gap-1">
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                    <button
                      type="button"
                      className="btn-icon h-10 w-10"
                      aria-label={`${link.label} ${locale === 'kh' ? 'ឧបករណ៍' : 'tools'}`}
                      aria-expanded={openMenu === link.menu}
                      onClick={() => setOpenMenu((current) => current === link.menu ? null : link.menu)}
                    >
                      <ChevronDown size={15} className={`transition-transform ${openMenu === link.menu ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {openMenu === link.menu && (
                    <ul className="mt-1 grid grid-cols-2 gap-1 px-2 pb-2">
                      {(link.menu === 'hub' ? TOOLS.slice(0, 8) : workspaceTools).map((tool) => (
                        <li key={tool.id}>
                          <Link
                            href={`/tool-workspace?tool=${encodeURIComponent(tool.id)}`}
                            onClick={() => {
                              setMobileOpen(false);
                              setOpenMenu(null);
                            }}
                            className="block rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-primary"
                          >
                            {getToolName(tool.id, tool.name, locale)}
                          </Link>
                        </li>
                      ))}
                      {link.menu === 'hub' && (
                        <li className="col-span-2">
                          <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-xs font-medium text-primary">
                            {t('allTools')}
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              {authStatus === 'authenticated' ? (
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-3">
                    {session.user?.image ? (
                      <Image src={session.user.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{userInitial}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                      {session.user?.email && session.user.name && <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>}
                      <p className="mt-0.5 text-[11px] text-primary">{locale === 'kh' ? 'បានចូលគណនី' : 'Signed in'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost mt-3 w-full justify-center rounded-md px-4 py-2 text-sm font-medium"
                    onClick={() => {
                      setMobileOpen(false);
                      void signOut({ callbackUrl: '/' });
                    }}
                  >
                    <LogOut size={14} />
                    {t('signOut')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-ghost w-full px-4 py-2 rounded-md text-left text-sm font-medium"
                  onClick={() => {
                    setMobileOpen(false);
                    void signIn('google');
                  }}
                  disabled={authStatus === 'loading'}
                >
                  <LogIn size={14} />
                  {t('signInGoogle')}
                </button>
              )}
              <button
                type="button"
                className="nav-liquid-control nav-support-control btn-ghost w-full px-4 py-2 rounded-md text-left text-sm font-medium"
                onClick={() => {
                  setSupportOpen(true);
                  setMobileOpen(false);
                }}
              >
                <HandCoins size={14} />
                {texts.support}
              </button>
              <label className="nav-liquid-control flex items-center justify-between gap-3 rounded-md px-4 py-2 text-sm text-foreground">
                <span>{texts.theme}</span>
                <select
                  value={theme}
                  onChange={(event) => handleThemeChange(event.target.value as Theme)}
                  className="bg-transparent text-sm text-foreground outline-none"
                  aria-label={texts.theme}
                >
                  {THEMES.map((option) => <option key={option} value={option}>{texts[option]}</option>)}
                </select>
              </label>
              <label className="nav-liquid-control flex items-center justify-between gap-3 px-4 py-2 rounded-md text-sm text-foreground">
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
