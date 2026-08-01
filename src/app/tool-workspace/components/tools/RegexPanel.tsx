'use client';
import React, { useState, useMemo } from 'react';
import { Tool } from '@/data/tools';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const SAMPLE_PATTERN = '(\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b)';
const SAMPLE_TEST = `Contact us at support@devtoolkit.io or sales@devtoolkit.io
For billing: billing@devtoolkit.io
Invalid: notanemail@, @nodomain.com, plaintext
Developer: dev+tools@devtoolkit.io`;

export default function RegexPanel({ tool }: { tool: Tool }) {
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState({ g: true, i: false, m: true, s: false });
  const [testStr, setTestStr] = useState(SAMPLE_TEST);
  const [replaceStr, setReplaceStr] = useState('');
  const [mode, setMode] = useState<'match' | 'replace'>('match');

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('');

  const result = useMemo(() => {
    if (!pattern) return { matches: [], error: '', replaced: '', count: 0 };
    try {
      const re = new RegExp(pattern, flagStr);
      const matches: { value: string; index: number; groups: string[] }[] = [];
      if (flags.g) {
        let m;
        const reCopy = new RegExp(pattern, flagStr);
        while ((m = reCopy.exec(testStr)) !== null) {
          matches.push({ value: m[0], index: m.index, groups: m.slice(1) });
          if (!flags.g) break;
        }
      } else {
        let m = re.exec(testStr);
        if (m) matches.push({ value: m[0], index: m.index, groups: m.slice(1) });
      }
      const replaced = replaceStr !== undefined ? testStr.replace(re, replaceStr) : '';
      return { matches, error: '', replaced, count: matches.length };
    } catch (e: unknown) {
      return { matches: [], error: e instanceof Error ? e.message : 'Invalid regex', replaced: '', count: 0 };
    }
  }, [pattern, flagStr, testStr, replaceStr, flags.g]);

  const highlightMatches = useMemo(() => {
    if (!pattern || result.error || result.matches.length === 0) return testStr;
    try {
      const re = new RegExp(pattern, flagStr);
      return testStr.replace(re, (match) => `\x00${match}\x01`);
    } catch {
      return testStr;
    }
  }, [pattern, flagStr, testStr, result]);

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Pattern input */}
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs text-muted-foreground font-medium mb-2">Regular Expression</label>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-muted-foreground font-mono text-lg">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="input-code flex-1 py-2"
              placeholder="([a-z]+)\d+"
              spellCheck={false}
            />
            <span className="text-muted-foreground font-mono text-lg">/</span>
            <span className="font-mono text-sm text-primary">{flagStr || 'none'}</span>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(flags).map(([flag, enabled]) => (
              <label key={`flag-${flag}`} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setFlags((prev) => ({ ...prev, [flag]: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {flag} — {flag === 'g' ? 'global' : flag === 'i' ? 'case-insensitive' : flag === 'm' ? 'multiline' : 'dotAll'}
                </span>
              </label>
            ))}
          </div>

          {result.error && (
            <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-xs text-red-400 font-mono">{result.error}</span>
            </div>
          )}

          {!result.error && pattern && (
            <div className="flex items-center gap-2 mt-3">
              <CheckCircle2 size={13} className="text-primary" />
              <span className="text-xs text-primary">{result.count} match{result.count !== 1 ? 'es' : ''} found</span>
            </div>
          )}
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          {(['match', 'replace'] as const).map((m) => (
            <button
              key={`mode-${m}`}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${mode === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'match' ? 'Match' : 'Replace'}
            </button>
          ))}
        </div>

        {/* Test string */}
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs text-muted-foreground font-medium mb-2">Test String</label>
          <textarea
            value={testStr}
            onChange={(e) => setTestStr(e.target.value)}
            className="input-code w-full"
            rows={5}
            placeholder="Enter test string here…"
            spellCheck={false}
          />
        </div>

        {/* Replace input */}
        {mode === 'replace' && (
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-xs text-muted-foreground font-medium mb-2">Replace With</label>
            <input
              type="text"
              value={replaceStr}
              onChange={(e) => setReplaceStr(e.target.value)}
              className="input-code w-full py-2"
              placeholder="Replacement string — use $1, $2 for capture groups"
            />
            {replaceStr !== undefined && result.replaced && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1.5">Result:</p>
                <pre className="output-code text-xs rounded-lg p-3 max-h-32 overflow-auto">{result.replaced}</pre>
              </div>
            )}
          </div>
        )}

        {/* Match list */}
        {mode === 'match' && result.matches.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Matches ({result.matches.length})
            </h4>
            <div className="flex flex-col gap-2 max-h-48 overflow-auto scrollbar-thin">
              {result.matches.map((m, i) => (
                <div key={`match-${i}`} className="flex items-start gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-xs text-muted-foreground tabular-nums w-6 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-primary">{m.value}</span>
                    {m.groups.length > 0 && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {m.groups.map((g, gi) => (
                          <span key={`group-${i}-${gi}`} className="font-mono text-xs text-violet-400">
                            ${gi + 1}: {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">@{m.index}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}