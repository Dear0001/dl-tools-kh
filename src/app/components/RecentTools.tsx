'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { CATEGORY_COLORS } from '@/data/tools';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { getToolName, useLocale } from '@/i18n/LocaleProvider';

export default function RecentTools() {
  const { locale, t } = useLocale();
  const { data: session, status: authStatus } = useSession();
  const [recents, setRecents] = useState<string[] | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let localRecents: string[] = [];
    try {
      const stored = localStorage.getItem('devtoolkit-recent');
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        localRecents = parsed.filter(
          (id): id is string => typeof id === 'string' && TOOLS.some((tool) => tool.id === id),
        ).slice(0, 8);
      }
    } catch {
      toast.error('Could not read recent tools from this device.');
    }
    setRecents(localRecents);

    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setSynced(false);
      return;
    }

    let active = true;
    const loadRecents = async () => {
      try {
        if (localRecents.length > 0) {
          const syncResponse = await fetch('/api/user/recents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolIds: localRecents }),
          });
          if (!syncResponse.ok) {
            const result = (await syncResponse.json()) as { error?: string };
            throw new Error(result.error ?? 'Could not sync recent tools.');
          }
        }

        const response = await fetch('/api/user/recents');
        const result = (await response.json()) as { toolIds?: string[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load recent tools.');
        if (active) {
          setRecents(result.toolIds ?? []);
          setSynced(true);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Could not sync recent tools.';
        toast.error(message);
        setSynced(false);
      }
    };
    void loadRecents();

    return () => {
      active = false;
    };
  }, [authStatus, session?.user?.id]);

  const remove = async (id: string) => {
    const next = (recents ?? []).filter((recentId) => recentId !== id);
    try {
      if (synced) {
        const response = await fetch(`/api/user/recents/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? 'Could not remove this recent tool.');
        }
      }
      localStorage.setItem('devtoolkit-recent', JSON.stringify(next));
      setRecents(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove this recent tool.';
      toast.error(message);
    }
  };

  const tools = (recents ?? [])
    .map((id) => TOOLS.find((tool) => tool.id === id))
    .filter((tool): tool is (typeof TOOLS)[number] => Boolean(tool));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{t('recentTools')}</h2>
      </div>
      {recents === null ? (
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted/50" aria-label={t('recentTools')} />
      ) : tools.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => {
            const colors = CATEGORY_COLORS[tool.category];
            return (
              <div key={`recent-${tool.id}`} className="group flex items-center rounded-md border border-border bg-card">
                <Link
                  href={`/tool-workspace?tool=${tool.id}`}
                  className="rounded-l-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {getToolName(tool.id, tool.name, locale)}
                </Link>
                <span className={`mx-1 h-1.5 w-1.5 rounded-full ${colors.bg}`} aria-hidden="true" />
                <button
                  onClick={() => remove(tool.id)}
                  className="btn-icon h-8 w-8 rounded-l-none"
                  aria-label={`${locale === 'kh' ? 'ដក' : 'Remove'} ${getToolName(tool.id, tool.name, locale)} ${locale === 'kh' ? 'ចេញពីឧបករណ៍ថ្មីៗ' : 'from recent tools'}`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('recentEmpty')}
        </p>
      )}
    </div>
  );
}