'use client';
import React, { useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { AlertTriangle, CheckCircle2, Key } from 'lucide-react';

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMTIzNDUiLCJuYW1lIjoiU29waGVhIENoYW4iLCJlbWFpbCI6InNvcGhlYUBkZXZ0b29sa2l0LmlvIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzOTI4MDAwLCJleHAiOjE3NTM5MzE2MDAsImF1ZCI6ImRldnRvb2xraXQiLCJpc3MiOiJodHRwczovL2F1dGguZGV2dG9vbGtpdC5pbyJ9.signature_placeholder';

interface JwtPayload {
  [key: string]: unknown;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
  aud?: string | string[];
}

export default function JwtPanel({ tool }: { tool: Tool }) {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [header, setHeader] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    setNowTs(Math.floor(Date.now() / 1000));
  }, []);

  const decode = () => {
    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) throw new Error('JWT must have exactly 3 parts separated by dots');
      const decodeB64 = (s: string) => {
        const padded = s + '=='.slice(0, (4 - s.length % 4) % 4);
        return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
      };
      setHeader(decodeB64(parts[0]));
      setPayload(decodeB64(parts[1]));
      setSignature(parts[2]);
      setError('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Decode error';
      setError(msg);
      setHeader(null);
      setPayload(null);
      setSignature('');
    }
  };

  const isExpired = payload?.exp ? payload.exp < nowTs : false;
  const expiresIn = payload?.exp ? payload.exp - nowTs : null;

  const formatValue = (v: unknown): string => {
    if (typeof v === 'number' && (String(v).length === 10 || String(v).length === 13)) {
      const d = new Date(v * (String(v).length === 10 ? 1000 : 1));
      return `${v} (${d.toISOString()})`;
    }
    return JSON.stringify(v);
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <label className="block text-xs text-muted-foreground font-medium mb-2">JWT Token</label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="input-code w-full"
            rows={4}
            placeholder="Paste JWT token here… eyJhbGciOi..."
            spellCheck={false}
          />
          {error && (
            <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-red-400 font-mono">{error}</span>
            </div>
          )}
        </div>

        <button className="btn-primary mb-5" onClick={decode}>
          <Key size={13} />
          Decode JWT
        </button>

        {/* Expiry status */}
        {payload && expiresIn !== null && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border mb-4 ${isExpired ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'}`}>
            {isExpired ? <AlertTriangle size={14} className="text-red-400" /> : <CheckCircle2 size={14} className="text-primary" />}
            <span className={`text-xs font-medium ${isExpired ? 'text-red-400' : 'text-primary'}`}>
              {isExpired ? `Token expired ${Math.abs(expiresIn)}s ago` : `Token valid — expires in ${expiresIn}s`}
            </span>
          </div>
        )}

        {/* Decoded sections */}
        {header && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Header</span>
              </div>
              <div className="space-y-2">
                {Object.entries(header).map(([k, v]) => (
                  <div key={`header-${k}`} className="flex gap-3">
                    <span className="font-mono text-xs text-violet-400 flex-shrink-0 w-16 truncate">{k}</span>
                    <span className="font-mono text-xs text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-primaryuppercase tracking-wider">Payload</span>
              </div>
              <div className="space-y-2">
                {payload && Object.entries(payload).map(([k, v]) => (
                  <div key={`payload-${k}`} className="flex gap-3">
                    <span className="font-mono text-xs text-violet-400 flex-shrink-0 w-20 truncate">{k}</span>
                    <span className="font-mono text-xs text-foreground break-all">{formatValue(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {signature && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Signature</span>
              <span className="text-xs text-muted-foreground ml-auto">Not verified — provide secret to verify</span>
            </div>
            <p className="font-mono text-xs text-amber-300 break-all">{signature}</p>
          </div>
        )}
      </div>
    </div>
  );
}