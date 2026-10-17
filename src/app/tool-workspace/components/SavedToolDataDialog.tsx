'use client';

import { useEffect, useState } from 'react';
import { BookmarkPlus, Check, Copy, Database, LogIn, Trash2, X } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';
import { getToolName, translateText, useLocale } from '@/i18n/LocaleProvider';

interface SavedItem {
  id: string;
  toolId: string;
  title: string;
  content?: string;
  contentPreview?: string;
  updatedAt: string;
}

export default function SavedToolDataDialog({ tool }: { tool: Tool }) {
  const { locale } = useLocale();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || status !== 'authenticated') return;

    let active = true;
    setLoading(true);
    fetch(`/api/user/saved-data?toolId=${encodeURIComponent(tool.id)}`)
      .then(async (response) => {
        const result = (await response.json()) as { items?: SavedItem[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load saved data.');
        return result;
      })
      .then((result) => {
        if (active) setItems(result.items ?? []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Could not load saved data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, status, tool.id]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/saved-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: tool.id, title, content }),
      });
      const result = (await response.json()) as { item?: SavedItem; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not save this data.');
      const item = result.item;
      if (!item) throw new Error('The server did not return the saved item.');
      setItems((current) => [item, ...current]);
      setTitle('');
      setContent('');
      toast.success(locale === 'kh' ? 'បានរក្សាទុកទិន្នន័យក្នុងគណនីរបស់អ្នក' : 'Data saved to your account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this data.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (item: SavedItem) => {
    try {
      let content = item.content;
      if (content === undefined) {
        const response = await fetch(`/api/user/saved-data/${encodeURIComponent(item.id)}`);
        const result = (await response.json()) as { item?: { content: string }; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load saved data.');
        if (!result.item) throw new Error('The server did not return the saved data.');
        content = result.item.content;
      }
      await navigator.clipboard.writeText(content);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1500);
      toast.success('Saved data copied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clipboard access was denied.');
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/user/saved-data/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this saved item.');
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success('Saved data deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this saved item.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost px-3 py-1.5 text-xs"
        aria-haspopup="dialog"
      >
        <Database size={14} />
        {translateText('Saved data', locale)}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-tool-data-title"
            className="flex max-h-[min(88vh,54rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="saved-tool-data-title" className="text-base font-semibold text-foreground">
                  {translateText('Saved data', locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{getToolName(tool.id, tool.name, locale)} · {translateText('Synced to your account', locale)}</p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label={locale === 'kh' ? 'បិទទិន្នន័យដែលបានរក្សាទុក' : 'Close saved data'}>
                <X size={15} />
              </button>
            </header>

            {status === 'authenticated' ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
                <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {translateText('Name', locale)}
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={100}
                      className="input-code w-full"
                      placeholder={translateText('e.g. Production config', locale)}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {translateText('Text or tool data', locale)}
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      maxLength={1_000_000}
                      rows={5}
                      className="input-code w-full resize-y"
                      placeholder={translateText('Paste the result or data you want to keep…', locale)}
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {translateText('Stored as text in the database, not automatically collected. Don’t save secrets.', locale)}
                    </p>
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      onClick={save}
                      disabled={saving || !title.trim() || !content.trim()}
                    >
                      <BookmarkPlus size={13} />
                      {translateText(saving ? 'Saving…' : 'Save data', locale)}
                    </button>
                  </div>
                </div>

                <section aria-label="Previously saved data" className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {translateText('Previously saved', locale)}
                  </h3>
                  {loading ? (
                    <p className="py-4 text-sm text-muted-foreground">{translateText('Loading saved data…', locale)}</p>
                  ) : items.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">{translateText('Nothing saved for this tool yet.', locale)}</p>
                  ) : (
                    items.map((item) => (
                      <article key={item.id} className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-medium text-foreground">{item.title}</h4>
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                              {item.contentPreview ?? (item.content && item.content.length > 500
                                ? `${item.content.slice(0, 500)}…`
                                : item.content)}
                            </p>
                            <time className="mt-2 block text-[10px] text-muted-foreground">
                              {translateText('Updated', locale)} {new Date(item.updatedAt).toLocaleString(locale === 'kh' ? 'km-KH' : 'en-US')}
                            </time>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              className="btn-icon h-8 w-8"
                              onClick={() => void copy(item)}
                              aria-label={`${locale === 'kh' ? 'ចម្លង' : 'Copy'} ${item.title}`}
                              title={translateText('Copy saved data', locale)}
                            >
                              {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <button
                              type="button"
                              className="btn-icon h-8 w-8"
                              onClick={() => void remove(item.id)}
                              aria-label={`${locale === 'kh' ? 'លុប' : 'Delete'} ${item.title}`}
                              title={translateText('Delete saved data', locale)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </section>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  {translateText('Sign in with Google to save and sync data for this tool across devices.', locale)}
                </p>
                <button type="button" className="btn-primary text-xs" onClick={() => void signIn('google')}>
                  <LogIn size={14} />
                  {locale === 'kh' ? 'ចូលដោយប្រើ Google' : 'Sign in with Google'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
