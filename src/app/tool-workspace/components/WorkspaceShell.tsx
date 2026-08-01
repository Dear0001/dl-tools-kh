'use client';
import React, { useState, useEffect } from 'react';
import { Tool } from '@/data/tools';
import { ArrowLeft, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_COLORS } from '@/data/tools';

// Tool-specific panels
import JsonFormatterPanel from './tools/JsonFormatterPanel';
import JsFormatterPanel from './tools/JsFormatterPanel';
import HtmlFormatterPanel from './tools/HtmlFormatterPanel';
import CssFormatterPanel from './tools/CssFormatterPanel';
import SqlFormatterPanel from './tools/SqlFormatterPanel';
import XmlFormatterPanel from './tools/XmlFormatterPanel';
import YamlFormatterPanel from './tools/YamlFormatterPanel';
import DiffPanel from './tools/DiffPanel';
import UuidPanel from './tools/UuidPanel';
import HashPanel from './tools/HashPanel';
import JwtPanel from './tools/JwtPanel';
import UrlCodecPanel from './tools/UrlCodecPanel';
import RegexPanel from './tools/RegexPanel';
import TimestampPanel from './tools/TimestampPanel';
import Base64ImagePanel from './tools/Base64ImagePanel';
import JsonToTsPanel from './tools/JsonToTsPanel';
import CurlPanel from './tools/CurlPanel';
import KhqrBuilderPanel from './tools/KhqrBuilderPanel';
import KhqrValidatorPanel from './tools/KhqrValidatorPanel';
import QrReaderPanel from './tools/QrReaderPanel';
import ImageCompressPanel from './tools/ImageCompressPanel';
import GenericComingSoon from './tools/GenericComingSoon';

const PANEL_MAP: Record<string, React.ComponentType<{ tool: Tool }>> = {
  'tool-json-formatter': JsonFormatterPanel,
  'tool-js-formatter': JsFormatterPanel,
  'tool-html-formatter': HtmlFormatterPanel,
  'tool-css-formatter': CssFormatterPanel,
  'tool-sql-formatter': SqlFormatterPanel,
  'tool-xml-formatter': XmlFormatterPanel,
  'tool-yaml-formatter': YamlFormatterPanel,
  'tool-json-diff': DiffPanel,
  'tool-text-diff': DiffPanel,
  'tool-xml-diff': DiffPanel,
  'tool-java-diff': DiffPanel,
  'tool-uuid': UuidPanel,
  'tool-hash': HashPanel,
  'tool-jwt-decoder': JwtPanel,
  'tool-url-codec': UrlCodecPanel,
  'tool-regex-tester': RegexPanel,
  'tool-timestamp': TimestampPanel,
  'tool-base64-image': Base64ImagePanel,
  'tool-image-compress': ImageCompressPanel,
  'tool-json-to-ts': JsonToTsPanel,
  'tool-curl-generator': CurlPanel,
  'tool-khqr-builder': KhqrBuilderPanel,
  'tool-khqr-validator': KhqrValidatorPanel,
  'tool-qr-reader': QrReaderPanel,
};

export default function WorkspaceShell({ tool }: { tool: Tool }) {
  const [configOpen, setConfigOpen] = useState(false);
  const colors = CATEGORY_COLORS[tool.category];
  const PanelComponent = PANEL_MAP[tool.id] || GenericComingSoon;

  // Save to recent
  useEffect(() => {
    // Backend integration point: persist recent tools to user profile
    const stored = localStorage.getItem('devtoolkit-recent');
    const recents: string[] = stored ? JSON.parse(stored) : [];
    const next = [tool.id, ...recents.filter((r) => r !== tool.id)].slice(0, 8);
    localStorage.setItem('devtoolkit-recent', JSON.stringify(next));
  }, [tool.id]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Workspace header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 lg:px-8 xl:px-10 2xl:px-16 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-icon" aria-label="Back to Tool Hub">
            <ArrowLeft size={16} />
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
            <span className={`text-xs font-bold font-mono ${colors.text}`}>{tool.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">{tool.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{tool.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`tool-category-badge hidden sm:inline-flex ${colors.bg} ${colors.text} border ${colors.border}`}>
            {tool.category}
          </span>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={`btn-icon ${configOpen ? 'bg-muted text-foreground border-border' : ''}`}
            aria-label="Toggle configuration panel"
          >
            <Settings2 size={15} />
          </button>
        </div>
      </div>

      {/* Workspace body */}
      <div className="flex-1 overflow-hidden">
        <PanelComponent tool={tool} />
      </div>
    </div>
  );
}