'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import VisibleUnicodeText, { hasInvisibleUnicode } from '../VisibleUnicodeText';
import EmvQrSummary from './EmvQrSummary';
import { getEmvQrDetails, type EmvTlvTag } from './emvQr';
import crc16 from './crc16';

function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

function renderTlvChildren(children: EmvTlvTag[], level: number): React.ReactNode {
  return children.map((child, ci) => (
    <div key={`tlv-child-${level}-${ci}-${child.tag}`}>
      <div className={`flex items-start gap-3 px-4 py-2 transition-colors ${level % 2 === 1 ? 'bg-muted/10' : 'bg-muted/05'} ${level > 1 ? 'pl-10' : ''}`}>
        <span className="font-mono text-xs text-amber-400 w-8 flex-shrink-0 tabular-nums">{child.tag}</span>
        <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{child.label}</span>
        <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{child.length}</span>
        <span className="font-mono text-xs text-foreground flex-1 break-all">
          {child.tag === '59' ? <VisibleUnicodeText value={child.value} /> : child.value}
        </span>
      </div>
      {child.children && renderTlvChildren(child.children, level + 1)}
    </div>
  ));
}

const SAMPLE_MERCHANT_INFO = `${tlv('00', 'bakong.io')}${tlv('01', 'devtoolkit@wing')}`;
const SAMPLE_PAYLOAD = [
  tlv('00', '01'),
  tlv('01', '11'),
  tlv('29', SAMPLE_MERCHANT_INFO),
  tlv('52', '5999'),
  tlv('53', '840'),
  tlv('58', 'KH'),
  tlv('59', 'DevToolkit Store'),
  tlv('60', 'Phnom Penh'),
  '6304',
].join('');
const SAMPLE = `${SAMPLE_PAYLOAD}${crc16(SAMPLE_PAYLOAD)}`;

export default function KhqrValidatorPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [tags, setTags] = useState<EmvTlvTag[]>([]);
  const [crcValid, setCrcValid] = useState<boolean | null>(null);
  const [isDynamic, setIsDynamic] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState('');
  const [validated, setValidated] = useState(false);
  const [validatedData, setValidatedData] = useState('');

  const validate = () => {
    try {
      const data = input.trim();
      const details = getEmvQrDetails(data);
      if (details.crcValid === null) {
        toast.error('CRC tag (63) not found in KHQR string');
        return;
      }
      setCrcValid(details.crcValid);
      setTags(details.tags.filter((tag) => tag.tag !== '63'));

      // Detect dynamic vs static
      const initMethod = details.tags.find((t) => t.tag === '01');
      setIsDynamic(initMethod ? initMethod.value === '12' : null);

      // Currency
      const currTag = details.tags.find((t) => t.tag === '53');
      setCurrency(currTag?.value === '116' ? 'KHR (116)' : currTag?.value === '840' ? 'USD (840)' : currTag?.value || 'Unknown');

      setValidatedData(data);
      setValidated(true);
    } catch (e) {
      toast.error('Failed to parse KHQR string — check format');
    }
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs text-muted-foreground font-medium mb-2">KHQR / EMVCo String</label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setValidated(false);
            }}
            className="input-code w-full text-xs"
            rows={4}
            placeholder="Paste KHQR EMVCo string here… 000201010212…"
            spellCheck={false}
          />
          <button className="btn-primary mt-3 text-xs" onClick={validate}>
            Validate & Decode
          </button>
        </div>

        {/* Validation summary */}
        {validated && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${crcValid ? 'bg-primary/5 border-primary/20' : 'bg-red-500/5 border-red-500/20'}`}>
              {crcValid ? <CheckCircle2 size={18} className="text-primary" /> : <XCircle size={18} className="text-red-400" />}
              <div>
                <p className="text-xs font-semibold text-foreground">CRC-16</p>
                <p className={`text-xs ${crcValid ? 'text-primary' : 'text-red-400'}`}>{crcValid ? 'Valid' : 'Invalid'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card">
              <div className={`w-2 h-2 rounded-full ${isDynamic ? 'bg-amber-400' : 'bg-violet-400'}`} />
              <div>
                <p className="text-xs font-semibold text-foreground">Mode</p>
                <p className="text-xs text-muted-foreground">
                  {isDynamic === null ? 'Unknown' : isDynamic ? 'Dynamic (12)' : 'Static (11)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-semibold text-foreground">Currency</p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </div>
            </div>
          </div>
        )}

        {validated && <EmvQrSummary data={validatedData} />}

        {/* TLV breakdown */}
        {tags.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="panel-header rounded-t-xl">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TLV Tag Breakdown</span>
              <span className="text-xs text-muted-foreground">{tags.length} tags parsed</span>
            </div>
            {tags.some((tag) => tag.tag === '59' && hasInvisibleUnicode(tag.value)) && (
              <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                Red markers show invisible characters in the merchant name; the original value is unchanged.
              </p>
            )}
            <div className="divide-y divide-border">
              {tags.map((tag, i) => (
                <div key={`tlv-${i}-${tag.tag}`}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className="font-mono text-xs text-violet-400 w-8 flex-shrink-0 tabular-nums">{tag.tag}</span>
                    <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{tag.label}</span>
                    <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{tag.length}</span>
                    <span className="font-mono text-xs text-foreground flex-1 break-all">
                      {tag.tag === '59' ? <VisibleUnicodeText value={tag.value} /> : tag.value}
                    </span>
                  </div>
                  {tag.children && renderTlvChildren(tag.children, 1)}
                </div>
              ))}
              {/* CRC row */}
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <span className="font-mono text-xs text-violet-400 w-8 flex-shrink-0">63</span>
                <span className="text-xs text-muted-foreground w-48 flex-shrink-0">CRC</span>
                <span className="text-xs text-muted-foreground w-6 flex-shrink-0">04</span>
                <span className={`font-mono text-xs flex-1 ${crcValid ? 'text-primary' : 'text-red-400'}`}>
                  {input.slice(-4).toUpperCase()} {crcValid ? '✓ valid' : '✗ mismatch'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}