'use client';

import { useEffect, useState } from 'react';
import type { Tool } from '@/data/tools';

type UnitKind = 'length' | 'weight' | 'temperature' | 'data';
const UNIT_TABLE: Record<UnitKind, Record<string, number>> = {
  length: { meter: 1, kilometer: 1000, centimeter: 0.01, mile: 1609.344, foot: 0.3048, inch: 0.0254 },
  weight: { kilogram: 1, gram: 0.001, pound: 0.45359237, ounce: 0.028349523125 },
  temperature: { celsius: 1, fahrenheit: 1, kelvin: 1 },
  data: { byte: 1, kilobyte: 1000, megabyte: 1_000_000, gigabyte: 1_000_000_000, kibibyte: 1024, mebibyte: 1_048_576, gibibyte: 1_073_741_824 },
};
const ZONES = ['Asia/Phnom_Penh', 'UTC', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];

function localTimeInZone(value: string, zone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Enter a valid date and time.');
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(candidate));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    const represented = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
    candidate += desired - represented;
  }
  return new Date(candidate);
}

function convertTemperature(value: number, from: string, to: string) {
  const celsius = from === 'fahrenheit' ? (value - 32) * 5 / 9 : from === 'kelvin' ? value - 273.15 : value;
  return to === 'fahrenheit' ? celsius * 9 / 5 + 32 : to === 'kelvin' ? celsius + 273.15 : celsius;
}

export default function ConversionCalculatorPanel({ tool: _tool }: { tool: Tool }) {
  const [mode, setMode] = useState<'timezone' | 'units'>('timezone');
  const [dateValue, setDateValue] = useState('2026-10-17T12:00');
  const [fromZone, setFromZone] = useState('Asia/Phnom_Penh');
  const [toZone, setToZone] = useState('America/New_York');
  const [kind, setKind] = useState<UnitKind>('length');
  const [amount, setAmount] = useState('1');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('kilometer');
  useEffect(() => { setDateValue(new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)); }, []);
  const zoneResult = (() => {
    try {
      const date = localTimeInZone(dateValue, fromZone);
      const source = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: fromZone }).format(date);
      const target = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: toZone }).format(date);
      return { source, target, error: '' };
    } catch (cause) { return { source: '', target: '', error: cause instanceof Error ? cause.message : 'Invalid date or timezone.' }; }
  })();
  const numeric = Number(amount);
  const unitResult = Number.isFinite(numeric) ? kind === 'temperature'
    ? convertTemperature(numeric, fromUnit, toUnit)
    : numeric * UNIT_TABLE[kind][fromUnit] / UNIT_TABLE[kind][toUnit]
    : NaN;

  const changeKind = (next: UnitKind) => { setKind(next); const units = Object.keys(UNIT_TABLE[next]); setFromUnit(units[0]); setToUnit(units[1] ?? units[0]); };
  return <div className="h-full overflow-auto p-5">
    <div className="flex gap-2 mb-5"><button className={mode === 'timezone' ? 'btn-primary text-xs' : 'btn-ghost text-xs'} onClick={() => setMode('timezone')}>Timezones</button><button className={mode === 'units' ? 'btn-primary text-xs' : 'btn-ghost text-xs'} onClick={() => setMode('units')}>Units</button></div>
    {mode === 'timezone' ? <div className="max-w-3xl space-y-4">
      <label className="block text-xs text-muted-foreground">Date and time<input type="datetime-local" className="input-code mt-1 w-full p-2" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label>
      <div className="grid md:grid-cols-2 gap-3">{[[fromZone, setFromZone, 'From timezone'], [toZone, setToZone, 'To timezone']].map(([zone, setter, label]) => <label key={String(label)} className="text-xs text-muted-foreground">{String(label)}<input className="input-code mt-1 w-full p-2" list="timezone-options" value={String(zone)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} placeholder="IANA zone, e.g. Asia/Phnom_Penh" /></label>)}</div>
      <datalist id="timezone-options">{ZONES.map((zone) => <option key={zone} value={zone} />)}</datalist>
      {zoneResult.error ? <p className="text-sm text-red-300">{zoneResult.error}</p> : <div className="grid md:grid-cols-2 gap-3"><p className="p-3 rounded-lg bg-secondary/30 text-sm"><span className="block text-xs text-muted-foreground mb-1">{fromZone}</span>{zoneResult.source}</p><p className="p-3 rounded-lg bg-secondary/30 text-sm"><span className="block text-xs text-muted-foreground mb-1">{toZone}</span>{zoneResult.target}</p></div>}
      <p className="text-xs text-muted-foreground">Enter a valid IANA timezone name. The entered wall-clock time is interpreted in the “From timezone”.</p>
    </div> : <div className="max-w-3xl space-y-4">
      <label className="block text-xs text-muted-foreground">Category<select className="select-input mt-1 w-full" value={kind} onChange={(event) => changeKind(event.target.value as UnitKind)}><option value="length">Length</option><option value="weight">Weight</option><option value="temperature">Temperature</option><option value="data">Digital storage</option></select></label>
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-end"><label className="text-xs text-muted-foreground">Value<input className="input-code mt-1 w-full p-2" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><span className="text-center pb-2">→</span><div className="text-xs text-muted-foreground">Result<div className="input-code mt-1 w-full p-2 text-foreground">{Number.isFinite(unitResult) ? Number(unitResult.toPrecision(12)).toString() : 'Enter a valid number'}</div></div></div>
      <div className="grid md:grid-cols-2 gap-3">{[[fromUnit, setFromUnit, 'From unit'], [toUnit, setToUnit, 'To unit']].map(([unit, setter, label]) => <label key={String(label)} className="text-xs text-muted-foreground">{String(label)}<select className="select-input mt-1 w-full" value={String(unit)} onChange={(event) => (setter as (value: string) => void)(event.target.value)}>{Object.keys(UNIT_TABLE[kind]).map((option) => <option key={option}>{option}</option>)}</select></label>)}</div>
    </div>}
  </div>;
}
