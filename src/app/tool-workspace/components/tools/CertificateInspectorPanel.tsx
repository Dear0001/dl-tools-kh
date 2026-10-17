'use client';

import { useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';

type Tlv = { tag: number; start: number; valueStart: number; end: number };
function readTlv(bytes: Uint8Array, offset: number): Tlv {
  if (offset + 2 > bytes.length) throw new Error('Certificate has truncated ASN.1 data.');
  const tag = bytes[offset]; let cursor = offset + 1; let length = bytes[cursor++];
  if (length & 0x80) {
    const count = length & 0x7f;
    if (!count || count > 4 || cursor + count > bytes.length) throw new Error('Certificate has an invalid ASN.1 length.');
    length = 0; for (let i = 0; i < count; i += 1) length = length * 256 + bytes[cursor++];
  }
  const end = cursor + length;
  if (end > bytes.length) throw new Error('Certificate ASN.1 value exceeds the available data.');
  return { tag, start: offset, valueStart: cursor, end };
}
function children(bytes: Uint8Array, parent: Tlv): Tlv[] {
  const result: Tlv[] = []; let cursor = parent.valueStart;
  while (cursor < parent.end) { const item = readTlv(bytes, cursor); result.push(item); cursor = item.end; }
  return result;
}
function oid(bytes: Uint8Array, item: Tlv): string {
  const parts: number[] = []; let value = 0;
  for (let i = item.valueStart; i < item.end; i += 1) { value = value * 128 + (bytes[i] & 0x7f); if (!(bytes[i] & 0x80)) { parts.push(value); value = 0; } }
  if (!parts.length) return '';
  const first = parts.shift()!;
  return [Math.min(Math.floor(first / 40), 2), first < 80 ? first % 40 : first - 80, ...parts].join('.');
}
function rawText(bytes: Uint8Array, item: Tlv): string {
  const slice = bytes.subarray(item.valueStart, item.end);
  if (item.tag === 0x1e) { let result = ''; for (let i = 0; i + 1 < slice.length; i += 2) result += String.fromCharCode(slice[i] * 256 + slice[i + 1]); return result; }
  return new TextDecoder().decode(slice);
}
function nameOf(bytes: Uint8Array, item: Tlv): string {
  const labels: Record<string, string> = { '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '1.2.840.113549.1.9.1': 'email' };
  const values: string[] = [];
  for (const set of children(bytes, item)) for (const pair of children(bytes, set)) {
    const [key, value] = children(bytes, pair);
    if (key && value) values.push(`${labels[oid(bytes, key)] ?? oid(bytes, key)}=${rawText(bytes, value)}`);
  }
  return values.join(', ') || '(empty)';
}
function certDate(bytes: Uint8Array, item: Tlv): string {
  const source = rawText(bytes, item);
  let normalized: string;
  if (item.tag === 0x17) {
    const year = Number(source.slice(0, 2)); normalized = `${year >= 50 ? '19' : '20'}${source.slice(0, 2)}${source.slice(2)}`;
  } else normalized = source;
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\.\d+)?(Z|[+-]\d{4})?$/.exec(normalized);
  if (!match) return source;
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? '00'}${match[7] === 'Z' || !match[7] ? 'Z' : `${match[7].slice(0, 3)}:${match[7].slice(3)}`}`;
  const date = new Date(iso); return Number.isNaN(date.getTime()) ? source : date.toISOString();
}

function inspectPem(pem: string): Array<[string, string]> {
  const base64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '');
  if (!base64 || !/^[A-Za-z0-9+/]+=*$/.test(base64)) throw new Error('Paste a PEM-encoded X.509 certificate.');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const outer = readTlv(bytes, 0);
  if (outer.tag !== 0x30) throw new Error('This is not an X.509 certificate sequence.');
  const certificateParts = children(bytes, outer);
  const tbs = certificateParts[0]; const signature = certificateParts[1];
  if (!tbs || !signature) throw new Error('Certificate is missing required fields.');
  const fields = children(bytes, tbs);
  let index = fields[0]?.tag === 0xa0 ? 1 : 0;
  const serial = fields[index++]; const tbsSignature = fields[index++]; const issuer = fields[index++]; const validity = fields[index++]; const subject = fields[index++]; const spki = fields[index++];
  if (!serial || !tbsSignature || !issuer || !validity || !subject || !spki) throw new Error('Certificate is missing issuer, subject, validity, or key information.');
  const serialHex = Array.from(bytes.subarray(serial.valueStart, serial.end), (byte) => byte.toString(16).padStart(2, '0')).join(':');
  const sigAlgId = children(bytes, signature)[0]; const signatureAlgorithmParts = sigAlgId ? children(bytes, sigAlgId) : [];
  const sigOid = signatureAlgorithmParts[0] ? oid(bytes, signatureAlgorithmParts[0]) : 'unknown';
  const spkiAlgorithm = children(bytes, spki)[0]; const publicKeyAlgorithmParts = spkiAlgorithm ? children(bytes, spkiAlgorithm) : [];
  const keyOid = publicKeyAlgorithmParts[0] ? oid(bytes, publicKeyAlgorithmParts[0]) : 'unknown';
  const keyBits = children(bytes, spki)[1];
  const validTimes = children(bytes, validity);
  const rows: Array<[string, string]> = [
    ['Subject', nameOf(bytes, subject)], ['Issuer', nameOf(bytes, issuer)], ['Serial number', serialHex],
    ['Valid from', validTimes[0] ? certDate(bytes, validTimes[0]) : 'unknown'], ['Valid until', validTimes[1] ? certDate(bytes, validTimes[1]) : 'unknown'],
    ['Signature algorithm OID', sigOid], ['Public key algorithm OID', keyOid], ['Public key size', keyBits ? `${Math.max(0, (keyBits.end - keyBits.valueStart - 1) * 8)} bits (encoded)` : 'unknown'],
  ];

  const extensionField = fields.find((field) => field.tag === 0xa3);
  if (extensionField) {
    const extensionSequence = children(bytes, extensionField)[0];
    if (extensionSequence) for (const extension of children(bytes, extensionSequence)) {
      const parts = children(bytes, extension); const extensionOid = parts[0] ? oid(bytes, parts[0]) : '';
      const octets = parts.find((part) => part.tag === 0x04);
      if (!octets) continue;
      const inner = bytes.subarray(octets.valueStart, octets.end);
      if (extensionOid === '2.5.29.17') {
        const san = readTlv(inner, 0); const names = children(inner, san).map((entry) => {
          const label = entry.tag === 0x82 ? 'DNS' : entry.tag === 0x81 ? 'email' : entry.tag === 0x86 ? 'URI' : entry.tag === 0x87 ? 'IP' : `tag ${entry.tag}`;
          const ipBytes = inner.subarray(entry.valueStart, entry.end);
          const value = entry.tag === 0x87 && ipBytes.length === 4 ? Array.from(ipBytes).join('.')
            : entry.tag === 0x87 && ipBytes.length === 16 ? Array.from({ length: 8 }, (_, i) => ((ipBytes[i * 2] << 8) | ipBytes[i * 2 + 1]).toString(16)).join(':')
              : rawText(inner, entry);
          return `${label}: ${value}`;
        });
        rows.push(['Subject alternative names', names.join('\n') || '(none)']);
      }
    }
  }
  const startTime = validTimes[0] ? new Date(certDate(bytes, validTimes[0])).getTime() : NaN;
  const expiry = validTimes[1] ? new Date(certDate(bytes, validTimes[1])).getTime() : NaN;
  const now = Date.now();
  const status = Number.isNaN(startTime) || Number.isNaN(expiry) ? 'Validity could not be determined'
    : now < startTime ? 'Not yet valid'
      : now > expiry ? 'Expired'
        : 'Within validity dates (chain and trust were not checked)';
  rows.push(['Current status', status]);
  return rows;
}

export default function CertificateInspectorPanel({ tool: _tool }: { tool: Tool }) {
  const [pem, setPem] = useState('');
  const result = useMemo(() => { if (!pem.trim()) return { rows: [], error: '' }; try { return { rows: inspectPem(pem), error: '' }; } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : 'Could not inspect certificate.' }; } }, [pem]);
  return <div className="h-full overflow-auto p-4 space-y-4">
    <label className="block text-xs text-muted-foreground">PEM certificate<textarea className="input-code mt-1 w-full h-48 p-3 resize-y" value={pem} onChange={(event) => setPem(event.target.value)} placeholder="-----BEGIN CERTIFICATE-----" spellCheck={false} /></label>
    <p className="text-xs text-muted-foreground">Local inspection only. This tool does not verify the certificate chain, hostname, revocation status, or trust.</p>
    {result.error && <p className="text-sm text-red-300">{result.error}</p>}
    <dl className="grid md:grid-cols-2 gap-2">{result.rows.map(([label, value]) => <div key={label} className="p-3 rounded-lg bg-secondary/30"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-mono text-xs mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
  </div>;
}
