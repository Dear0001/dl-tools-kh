'use client';
import React, { useEffect, useRef } from 'react';
import { Tool } from '@/data/tools';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CATEGORY_COLORS } from '@/data/tools';
import { trackToolOpen } from '@/components/GoogleAnalytics';
import SavedToolDataDialog from './SavedToolDataDialog';
import DocumentConverterPanel from './tools/DocumentConverterPanel';
import { getToolName, useLocale } from '@/i18n/LocaleProvider';

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
import PasswordGeneratorPanel from './tools/PasswordGeneratorPanel';
import JwtPanel from './tools/JwtPanel';
import UrlCodecPanel from './tools/UrlCodecPanel';
import RegexPanel from './tools/RegexPanel';
import TimestampPanel from './tools/TimestampPanel';
import Base64ImagePanel from './tools/Base64ImagePanel';
import CurlPanel from './tools/CurlPanel';
import KhqrBuilderPanel from './tools/KhqrBuilderPanel';
import KhqrValidatorPanel from './tools/KhqrValidatorPanel';
import QrReaderPanel from './tools/QrReaderPanel';
import ImageCompressPanel from './tools/ImageCompressPanel';
import GenericComingSoon from './tools/GenericComingSoon';
import JsonToJavaPanel from './tools/JsonToJavaPanel';
import JsonSchemaPanel from './tools/JsonSchemaPanel';
import JsonPathPanel from './tools/JsonPathPanel';
import DataConverterPanel from './tools/DataConverterPanel';
import JsonToCodePanel from './tools/JsonToCodePanel';
import CronBuilderPanel from './tools/CronBuilderPanel';
import ConversionCalculatorPanel from './tools/ConversionCalculatorPanel';
import TextToolkitPanel from './tools/TextToolkitPanel';
import EncodingToolkitPanel from './tools/EncodingToolkitPanel';
import ApiTesterPanel from './tools/ApiTesterPanel';
import IpCidrPanel from './tools/IpCidrPanel';
import CertificateInspectorPanel from './tools/CertificateInspectorPanel';
import MarkdownFormatterPanel from './tools/MarkdownFormatterPanel';
import SvgViewerPanel from './tools/SvgViewerPanel';
import SqlQueryBuilderPanel from './tools/SqlQueryBuilderPanel';

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
  'tool-password-generator': PasswordGeneratorPanel,
  'tool-jwt-decoder': JwtPanel,
  'tool-url-codec': UrlCodecPanel,
  'tool-regex-tester': RegexPanel,
  'tool-timestamp': TimestampPanel,
  'tool-base64-image': Base64ImagePanel,
  'tool-image-compress': ImageCompressPanel,
  'tool-json-to-ts': JsonToCodePanel,
  'tool-json-to-java': JsonToJavaPanel,
  'tool-json-to-dart': JsonToCodePanel,
  'tool-cron-builder': CronBuilderPanel,
  'tool-conversion-calculator': ConversionCalculatorPanel,
  'tool-text-toolkit': TextToolkitPanel,
  'tool-encoding-toolkit': EncodingToolkitPanel,
  'tool-api-tester': ApiTesterPanel,
  'tool-ip-cidr': IpCidrPanel,
  'tool-certificate-inspector': CertificateInspectorPanel,
  'tool-markdown-formatter': MarkdownFormatterPanel,
  'tool-svg-viewer': SvgViewerPanel,
  'tool-sql-builder': SqlQueryBuilderPanel,
  'tool-json-schema': JsonSchemaPanel,
  'tool-jsonpath': JsonPathPanel,
  'tool-data-converter': DataConverterPanel,
  'tool-curl-generator': CurlPanel,
  'tool-khqr-builder': KhqrBuilderPanel,
  'tool-khqr-validator': KhqrValidatorPanel,
  'tool-qr-reader': QrReaderPanel,
  'tool-pdf-word-converter': DocumentConverterPanel,
  'tool-image-to-pdf': DocumentConverterPanel,
  'tool-image-to-word': DocumentConverterPanel,
};

export default function WorkspaceShell({ tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const { data: session, status: authStatus } = useSession();
  const trackedToolId = useRef('');
  const colors = CATEGORY_COLORS[tool.category];
  const PanelComponent = PANEL_MAP[tool.id] || GenericComingSoon;

  // Save to recent
  useEffect(() => {
    try {
      const stored = localStorage.getItem('devtoolkit-recent');
      const recents: unknown = stored ? JSON.parse(stored) : [];
      const previous = Array.isArray(recents)
        ? recents.filter((id): id is string => typeof id === 'string')
        : [];
      localStorage.setItem(
        'devtoolkit-recent',
        JSON.stringify([tool.id, ...previous.filter((id) => id !== tool.id)].slice(0, 8)),
      );
    } catch {
      toast.error('Could not save recent tools on this device.');
    }

    if (authStatus !== 'authenticated' || !session?.user?.id) return;
    fetch('/api/user/recents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id }),
    }).then(async (response) => {
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Could not sync this recent tool.');
      }
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not sync this recent tool.');
    });
  }, [authStatus, session?.user?.id, tool.id]);

  useEffect(() => {
    if (trackedToolId.current === tool.id) return;
    trackedToolId.current = tool.id;
    trackToolOpen(tool);
  }, [tool]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Workspace header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 lg:px-8 xl:px-10 2xl:px-16 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-icon" aria-label={t('backToHub')}>
            <ArrowLeft size={16} />
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
            <span className={`text-xs font-bold font-mono ${colors.text}`}>{tool.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">{getToolName(tool.id, tool.name, locale)}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {tool.id === 'tool-pdf-word-converter'
                ? t('converterSubtitle')
                : tool.id === 'tool-image-to-pdf' || tool.id === 'tool-image-to-word'
                  ? t('imageConverterSubtitle')
                  : tool.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`tool-category-badge hidden sm:inline-flex ${colors.bg} ${colors.text} border ${colors.border}`}>
            {tool.category === 'documents' ? t('documentTools') : tool.category}
          </span>
          <SavedToolDataDialog tool={tool} />
        </div>
      </div>

      {/* Workspace body */}
      <div className="flex-1 overflow-hidden">
        <PanelComponent tool={tool} />
      </div>
    </div>
  );
}
