export type ToolCategory =
  | 'formatters'
  | 'diff' |'qr' |'image' |'utilities' |'generators';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  icon: string; // lucide icon name
  popular?: boolean;
  isNew?: boolean;
}

export const CATEGORIES: { id: ToolCategory; label: string; icon: string; color: string }[] = [
  { id: 'formatters', label: 'Formatters', icon: 'FileCode2', color: 'text-sky-400' },
  { id: 'diff', label: 'Diff & Compare', icon: 'GitCompare', color: 'text-amber-400' },
  { id: 'qr', label: 'QR & KHQR', icon: 'QrCode', color: 'text-primary' },
  { id: 'image', label: 'Image & Base64', icon: 'ImageIcon', color: 'text-pink-400' },
  { id: 'utilities', label: 'Utilities', icon: 'Wrench', color: 'text-violet-400' },
  { id: 'generators', label: 'Generators', icon: 'Sparkles', color: 'text-orange-400' },
];

export const TOOLS: Tool[] = [
  // Formatters
  {
    id: 'tool-json-formatter',
    name: 'JSON Formatter',
    description: 'Pretty-print, minify, and validate JSON with syntax highlighting and error detection.',
    category: 'formatters',
    tags: ['json', 'format', 'validate', 'minify'],
    icon: 'Braces',
    popular: true,
  },
  {
    id: 'tool-js-formatter',
    name: 'JS / TS Formatter',
    description: 'Format JavaScript and TypeScript files using Prettier with configurable options.',
    category: 'formatters',
    tags: ['javascript', 'typescript', 'prettier', 'format'],
    icon: 'FileCode2',
    popular: true,
  },
  {
    id: 'tool-html-formatter',
    name: 'HTML Formatter',
    description: 'Beautify or minify HTML markup with configurable indent size and attribute wrapping.',
    category: 'formatters',
    tags: ['html', 'beautify', 'minify', 'format'],
    icon: 'Code2',
  },
  {
    id: 'tool-css-formatter',
    name: 'CSS / SCSS Formatter',
    description: 'Format CSS, SCSS, and Less stylesheets with Prettier. Supports nested syntax.',
    category: 'formatters',
    tags: ['css', 'scss', 'less', 'format', 'prettier'],
    icon: 'Palette',
  },
  {
    id: 'tool-sql-formatter',
    name: 'SQL Formatter',
    description: 'Format SQL queries with dialect support: MySQL, PostgreSQL, SQLite, T-SQL, BigQuery.',
    category: 'formatters',
    tags: ['sql', 'mysql', 'postgres', 'format', 'query'],
    icon: 'Database',
    popular: true,
  },
  {
    id: 'tool-xml-formatter',
    name: 'XML Formatter',
    description: 'Pretty-print or minify XML documents using browser-native DOMParser with validation.',
    category: 'formatters',
    tags: ['xml', 'format', 'validate', 'pretty-print'],
    icon: 'FileXml',
  },
  {
    id: 'tool-yaml-formatter',
    name: 'YAML Formatter',
    description: 'Format and validate YAML configuration files. Detects duplicate keys and bad indentation.',
    category: 'formatters',
    tags: ['yaml', 'format', 'validate', 'config'],
    icon: 'AlignLeft',
  },
  {
    id: 'tool-markdown-formatter',
    name: 'Markdown Formatter',
    description: 'Format Markdown files and preview rendered output side-by-side with Prettier.',
    category: 'formatters',
    tags: ['markdown', 'md', 'format', 'preview'],
    icon: 'FileText',
  },

  // Diff
  {
    id: 'tool-json-diff',
    name: 'JSON Diff',
    description: 'Visual side-by-side comparison of two JSON payloads with line-level change highlighting.',
    category: 'diff',
    tags: ['json', 'diff', 'compare', 'visual'],
    icon: 'GitCompare',
    popular: true,
  },
  {
    id: 'tool-text-diff',
    name: 'Text Diff',
    description: 'Git-style unified diff view for any plain text — added (green), removed (red), changed (yellow).',
    category: 'diff',
    tags: ['text', 'diff', 'compare', 'git'],
    icon: 'FileDiff',
  },
  {
    id: 'tool-xml-diff',
    name: 'XML Diff',
    description: 'Compare two XML documents with structural awareness and pretty-print before diffing.',
    category: 'diff',
    tags: ['xml', 'diff', 'compare'],
    icon: 'FileXml',
  },
  {
    id: 'tool-java-diff',
    name: 'Java / Code Diff',
    description: 'Side-by-side diff viewer for Java, Kotlin, or any code with syntax-aware highlighting.',
    category: 'diff',
    tags: ['java', 'kotlin', 'code', 'diff', 'compare'],
    icon: 'Code',
  },

  // QR
  {
    id: 'tool-khqr-builder',
    name: 'KHQR Builder',
    description: 'Generate KHQR payment codes using EMVCo spec + CRC16-CCITT. Supports static/dynamic modes.',
    category: 'qr',
    tags: ['khqr', 'emvco', 'payment', 'cambodia', 'crc16'],
    icon: 'QrCode',
    isNew: true,
  },
  {
    id: 'tool-khqr-validator',
    name: 'KHQR Validator',
    description: 'Decode KHQR / EMV® QR payloads with TLV, CRC-16, currency, and dual-currency status.',
    category: 'qr',
    tags: ['khqr', 'validate', 'tlv', 'crc16', 'decode'],
    icon: 'ShieldCheck',
    isNew: true,
  },
  {
    id: 'tool-qr-reader',
    name: 'QR Reader / Scanner',
    description: 'Scan QR images or camera feeds and inspect EMV® tags, currency, CRC-16, and dual-currency status.',
    category: 'qr',
    tags: ['qr', 'reader', 'scanner', 'decode', 'camera'],
    icon: 'ScanLine',
  },

  // Image & Base64
  {
    id: 'tool-base64-image',
    name: 'Base64 ↔ Image / File',
    description: 'Convert images, PDFs, and binary files to Base64 and back. Supports clipboard paste.',
    category: 'image',
    tags: ['base64', 'image', 'pdf', 'encode', 'decode', 'clipboard'],
    icon: 'ImageIcon',
    popular: true,
  },
  {
    id: 'tool-image-compress',
    name: 'Image Resizer & Compressor',
    description: 'Resize and compress images in-browser using Canvas API. Supports JPEG, PNG, WebP output.',
    category: 'image',
    tags: ['image', 'compress', 'resize', 'optimize', 'webp', 'canvas'],
    icon: 'Minimize2',
  },
  {
    id: 'tool-svg-viewer',
    name: 'SVG Viewer & Optimizer',
    description: 'Paste SVG markup, preview it live, and get Base64 data URI or optimized SVG output.',
    category: 'image',
    tags: ['svg', 'viewer', 'optimize', 'base64', 'data-uri'],
    icon: 'PenTool',
  },

  // Utilities
  {
    id: 'tool-uuid',
    name: 'UUID Generator',
    description: 'Generate UUID v4 values in bulk using crypto.randomUUID(). One-click copy each.',
    category: 'utilities',
    tags: ['uuid', 'generate', 'random', 'id'],
    icon: 'Fingerprint',
    popular: true,
  },
  {
    id: 'tool-hash',
    name: 'Hash Generator',
    description: 'Compute MD5, SHA-1, SHA-256, and SHA-512 hashes for any text or file input.',
    category: 'utilities',
    tags: ['hash', 'sha256', 'md5', 'sha1', 'crypto'],
    icon: 'Hash',
  },
  {
    id: 'tool-password-generator',
    name: 'Password Generator',
    description: 'Generate secure passwords with configurable length and character sets. Copy instantly.',
    category: 'utilities',
    tags: ['password', 'generate', 'secure', 'random'],
    icon: 'LockKeyhole',
    isNew: true,
  },
  {
    id: 'tool-jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JWT tokens — inspect Header, Payload, and Signature. Checks expiry and claims.',
    category: 'utilities',
    tags: ['jwt', 'decode', 'token', 'auth', 'claims'],
    icon: 'Key',
    popular: true,
  },
  {
    id: 'tool-url-codec',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode URL components using encodeURIComponent / decodeURIComponent.',
    category: 'utilities',
    tags: ['url', 'encode', 'decode', 'uri', 'query'],
    icon: 'Link2',
  },
  {
    id: 'tool-regex-tester',
    name: 'Regex Tester',
    description: 'Test regular expressions with real-time match highlighting, group capture, and flag controls.',
    category: 'utilities',
    tags: ['regex', 'regexp', 'test', 'match', 'pattern'],
    icon: 'SearchCode',
  },
  {
    id: 'tool-timestamp',
    name: 'Timestamp Converter',
    description: 'Convert Unix timestamps to human-readable dates and vice versa across all timezones.',
    category: 'utilities',
    tags: ['timestamp', 'unix', 'date', 'time', 'convert', 'timezone'],
    icon: 'Clock',
  },

  // Generators
  {
    id: 'tool-json-to-ts',
    name: 'JSON → TypeScript',
    description: 'Generate TypeScript interfaces from any JSON payload. Handles nested objects and arrays.',
    category: 'generators',
    tags: ['json', 'typescript', 'interface', 'type', 'generate'],
    icon: 'Braces',
    popular: true,
  },
  {
    id: 'tool-json-to-java',
    name: 'JSON → Java / Kotlin / C#',
    description: 'Generate Java POJOs, Kotlin data classes, or C# models from JSON using quicktype.',
    category: 'generators',
    tags: ['json', 'java', 'kotlin', 'csharp', 'model', 'generate'],
    icon: 'FileCode',
  },
  {
    id: 'tool-json-to-dart',
    name: 'JSON → Dart',
    description: 'Generate Flutter-ready Dart model classes from JSON with fromJson/toJson methods.',
    category: 'generators',
    tags: ['json', 'dart', 'flutter', 'model', 'generate'],
    icon: 'Sparkles',
    isNew: true,
  },
  {
    id: 'tool-curl-generator',
    name: 'cURL Generator',
    description: 'Build cURL commands from a form: method, URL, headers, body, auth. Copy instantly.',
    category: 'generators',
    tags: ['curl', 'http', 'api', 'request', 'generate'],
    icon: 'Terminal',
  },
  {
    id: 'tool-sql-builder',
    name: 'SQL Query Builder',
    description: 'Visually construct SELECT, INSERT, UPDATE, DELETE queries and export formatted SQL.',
    category: 'generators',
    tags: ['sql', 'query', 'builder', 'select', 'insert', 'generate'],
    icon: 'TableProperties',
    popular: true,
  },
];

export const CATEGORY_COLORS: Record<ToolCategory, { bg: string; text: string; border: string }> = {
  formatters: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  diff: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  qr: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  image: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  utilities: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  generators: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
};