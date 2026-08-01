'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// CRC16-CCITT
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'));
}

interface TlvTag {
  tag: string;
  length: number;
  value: string;
  label: string;
  children?: TlvTag[];
}

const TAG_LABELS: Record<string, string> = {
  '00': 'Payload Format Indicator',
  '01': 'Point of Initiation Method',
  '26': 'Merchant Account Info (Visa)',
  '27': 'Merchant Account Info (Mastercard)',
  '29': 'Merchant Account Info (KHQR)',
  '52': 'Merchant Category Code',
  '53': 'Transaction Currency',
  '54': 'Transaction Amount',
  '55': 'Tip or Convenience Indicator',
  '58': 'Country Code',
  '59': 'Merchant Name',
  '60': 'Merchant City',
  '61': 'Postal Code',
  '62': 'Additional Data Field',
  '63': 'CRC',
};

function parseTlv(data: string): TlvTag[] {
  const tags: TlvTag[] = [];
  let i = 0;
  while (i < data.length - 4) {
    const tag = data.slice(i, i + 2);
    if (tag === '63') break;
    const lenStr = data.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len)) break;
    const value = data.slice(i + 4, i + 4 + len);
    tags.push({
      tag,
      length: len,
      value,
      label: TAG_LABELS[tag] || `Tag ${tag}`,
      children: (tag === '29' || tag === '62') ? parseTlv(value) : undefined,
    });
    i += 4 + len;
  }
  return tags;
}

const SAMPLE = 'bakong.io00020101021226480016bakong.io0110devtoolkit@wing0209MERCHANT010304WING52045999530384054052.5058KH5916DevToolkit Store6010Phnom Penh62280114INV-2026-0010310Main Branch0707POS-0016304';

export default function KhqrValidatorPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [tags, setTags] = useState<TlvTag[]>([]);
  const [crcValid, setCrcValid] = useState<boolean | null>(null);
  const [isDynamic, setIsDynamic] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState('');
  const [validated, setValidated] = useState(false);

  const validate = () => {
    try {
      const data = input.trim();

      // CRC check
      const crcIndex = data.lastIndexOf('6304');
      if (crcIndex === -1) {
        toast.error('CRC tag (63) not found in KHQR string');
        return;
      }
      const withoutCrc = data.slice(0, crcIndex + 4);
      const providedCrc = data.slice(crcIndex + 4, crcIndex + 8).toUpperCase();
      const computedCrc = crc16(withoutCrc);
      setCrcValid(providedCrc === computedCrc);

      // Parse TLV
      const parsed = parseTlv(data);
      setTags(parsed);

      // Detect dynamic vs static
      const initMethod = parsed.find((t) => t.tag === '01');
      setIsDynamic(initMethod?.value === '12');

      // Currency
      const currTag = parsed.find((t) => t.tag === '53');
      setCurrency(currTag?.value === '116' ? 'KHR (116)' : currTag?.value === '840' ? 'USD (840)' : currTag?.value || 'Unknown');

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
            onChange={(e) => setInput(e.target.value)}
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
                <p className="text-xs text-muted-foreground">{isDynamic ? 'Dynamic (12)' : 'Static (11)'}</p>
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

        {/* TLV breakdown */}
        {tags.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="panel-header rounded-t-xl">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TLV Tag Breakdown</span>
              <span className="text-xs text-muted-foreground">{tags.length} tags parsed</span>
            </div>
            <div className="divide-y divide-border">
              {tags.map((tag, i) => (
                <div key={`tlv-${i}-${tag.tag}`}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className="font-mono text-xs text-violet-400 w-8 flex-shrink-0 tabular-nums">{tag.tag}</span>
                    <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{tag.label}</span>
                    <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{tag.length}</span>
                    <span className="font-mono text-xs text-foreground flex-1 break-all">{tag.value}</span>
                  </div>
                  {tag.children && tag.children.map((child, ci) => (
                    <div key={`tlv-child-${i}-${ci}-${child.tag}`} className="flex items-start gap-3 px-4 py-2 bg-muted/10 hover:bg-muted/20 transition-colors pl-10">
                      <span className="font-mono text-xs text-amber-400 w-8 flex-shrink-0 tabular-nums">{child.tag}</span>
                      <span className="text-xs text-muted-foreground w-48 flex-shrink-0 truncate">{child.label}</span>
                      <span className="text-xs text-muted-foreground w-6 flex-shrink-0 tabular-nums">{child.length}</span>
                      <span className="font-mono text-xs text-foreground flex-1 break-all">{child.value}</span>
                    </div>
                  ))}
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