'use client';

import React from 'react';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { getEmvQrDetails } from './emvQr';

export default function EmvQrSummary({ data }: { data: string }) {
  const { tags, isEmvQr, currencyCode, currencyName, hasDualCurrency, merchantAccountCount, crcValid } = getEmvQrDetails(data);
  const initiationMethod = tags.find((tag) => tag.tag === '01')?.value;
  const mode = initiationMethod === '11' ? 'Static' : initiationMethod === '12' ? 'Dynamic' : 'Unknown';
  const dualCurrencyStatus =
    hasDualCurrency === null
      ? 'Could not determine'
      : hasDualCurrency
        ? 'Yes · tag 40 detected'
        : 'No · single account';

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="emv-qr-summary-heading">
      <div className="panel-header rounded-t-xl">
        <div className="flex items-center gap-2">
          {isEmvQr ? (
            <CheckCircle2 size={14} className="text-primary" />
          ) : (
            <CircleHelp size={14} className="text-amber-400" />
          )}
          <h3 id="emv-qr-summary-heading" className="text-xs font-semibold uppercase tracking-wider text-foreground">
            EMV® QR Analysis
          </h3>
        </div>
        <span className={`text-xs ${isEmvQr ? 'text-primary' : 'text-amber-400'}`}>
          {isEmvQr ? 'EMVCo format detected' : 'EMVCo format not confirmed'}
        </span>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <div className="bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Transaction currency</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {currencyName ? `${currencyName} (${currencyCode})` : 'Unknown'}
          </p>
        </div>
        <div className="bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">QR mode</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{mode}</p>
        </div>
        <div className="bg-card p-3 sm:col-span-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Merchant account templates</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{merchantAccountCount}</p>
        </div>
        <div className="bg-card p-3 sm:col-span-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {hasDualCurrency === null ? (
              <CircleHelp size={14} className="text-amber-400" />
            ) : hasDualCurrency ? (
              <CheckCircle2 size={14} className="text-primary" />
            ) : (
              <XCircle size={14} className="text-muted-foreground" />
            )}
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dual-currency indicator</p>
            <span className={`text-xs font-semibold ${hasDualCurrency ? 'text-primary' : 'text-foreground'}`}>
              {dualCurrencyStatus}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Tag 40 indicates the KHQR dual-currency account. Without tag 40, this QR represents one merchant account.
          </p>
        </div>
        <div className="bg-card p-3 sm:col-span-2">
          <div className="flex items-center gap-2">
            {crcValid === null ? (
              <CircleHelp size={14} className="text-muted-foreground" />
            ) : crcValid ? (
              <CheckCircle2 size={14} className="text-primary" />
            ) : (
              <XCircle size={14} className="text-red-400" />
            )}
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">CRC-16</p>
            <span className={`text-xs font-semibold ${crcValid === null ? 'text-muted-foreground' : crcValid ? 'text-primary' : 'text-red-400'}`}>
              {crcValid === null ? 'Not present' : crcValid ? 'Valid' : 'Mismatch'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
