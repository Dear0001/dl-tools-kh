'use client';
import React from 'react';
import Link from 'next/link';
import { Wrench, ArrowLeft } from 'lucide-react';
import { TOOLS, CATEGORY_COLORS } from '../../../data/tools';
import { useRouter } from 'next/navigation';
import { getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

const POPULAR = TOOLS?.filter((t) => t?.popular)?.slice(0, 6);

export default function NoToolSelected() {
  const { locale, t } = useLocale();
  const router = useRouter();
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 2xl:px-16 py-16">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-5">
          <Wrench size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('noToolSelected')}</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          {t('chooseTool')}
        </p>
        <Link href="/" className="btn-primary mt-5">
          <ArrowLeft size={14} />
          {t('allTools')}
        </Link>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t('popularTools')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POPULAR?.map((tool) => {
            const colors = CATEGORY_COLORS?.[tool?.category];
            return (
              <button
                key={`popular-${tool?.id}`}
                onClick={() => router?.push(`/tool-workspace?tool=${tool?.id}`)}
                className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 text-left card-glow-hover"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors?.bg} border ${colors?.border}`}>
                  <span className={`text-xs font-bold font-mono ${colors?.text}`}>{tool?.name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{getToolName(tool.id, tool.name, locale)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{getToolDescription(tool.id, tool.description, locale)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}