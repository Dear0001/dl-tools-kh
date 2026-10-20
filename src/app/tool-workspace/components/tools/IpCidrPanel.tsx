'use client';

import { useMemo, useState } from 'react';
import type { Tool } from '@/data/tools';

const ZERO = BigInt(0);
const ONE = BigInt(1);
const BYTE_MASK = BigInt('255');
const IPV4_MASK = BigInt('4294967295');

function parseIpv4(value: string): bigint {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) throw new Error('Enter a valid IPv4 address, for example 192.168.1.10.');
  return parts.reduce((total, part) => (total << 8n) | BigInt(Number(part)), 0n);
}
function formatIpv4(value: bigint) { return [24, 16, 8, 0].map((shift) => Number((value >> BigInt(shift)) & BYTE_MASK)).join('.'); }
function addressScope(ip: bigint) {
  const a = Number((ip >> BigInt(24)) & BYTE_MASK); const b = Number((ip >> BigInt(16)) & BYTE_MASK);
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'Private';
  if (a === 127) return 'Loopback';
  if (a === 169 && b === 254) return 'Link-local';
  if (a >= 224 && a <= 239) return 'Multicast';
  if (a === 0 || a >= 240) return 'Reserved';
  return 'Public range';
}

export default function IpCidrPanel({ tool: _tool }: { tool: Tool }) {
  const [input, setInput] = useState('192.111.11.110/24');
  const result = useMemo(() => {
    try {
      const [address, prefixText] = input.trim().split('/');
      const prefix = prefixText === undefined ? 32 : Number(prefixText);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('CIDR prefix must be between 0 and 32.');
      const ip = parseIpv4(address);
      const mask = prefix === 0 ? ZERO : (IPV4_MASK << BigInt(32 - prefix)) & IPV4_MASK;
      const network = ip & mask;
      const broadcast = network | (IPV4_MASK ^ mask);
      const total = ONE << BigInt(32 - prefix);
      const usable = prefix >= 31 ? total : total > BigInt(2) ? total - BigInt(2) : ZERO;
      const first = prefix >= 31 ? network : network + ONE;
      const last = prefix >= 31 ? broadcast : broadcast - ONE;
      return { rows: [
        ['Address', formatIpv4(ip)], ['Address scope', addressScope(ip)], ['Prefix', `/${prefix}`],
        ['Subnet mask', formatIpv4(mask)], ['Network', formatIpv4(network)], ['Broadcast', formatIpv4(broadcast)],
        ['First usable host', formatIpv4(first)], ['Last usable host', formatIpv4(last)], ['Total addresses', total.toString()], ['Usable hosts', usable.toString()],
      ], error: '' };
    } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : 'Invalid IPv4 address.' }; }
  }, [input]);
  return <div className="h-full overflow-auto p-5 max-w-3xl">
    <label className="block text-xs text-muted-foreground">IPv4 address or CIDR<input className="input-code w-full p-3 mt-1" value={input} onChange={(event) => setInput(event.target.value)} placeholder="192.111.11.110/24" /></label>
    <p className="text-xs text-muted-foreground mt-2 mb-4">IPv4 calculator. Enter an address alone to inspect its scope, or add a prefix to calculate a subnet.</p>
    {result.error ? <p className="text-sm text-red-300">{result.error}</p> : <dl className="grid sm:grid-cols-2 gap-2">{result.rows.map(([label, value]) => <div key={label} className="p-3 rounded-lg bg-secondary/30"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-mono text-sm mt-1">{value}</dd></div>)}</dl>}
  </div>;
}
