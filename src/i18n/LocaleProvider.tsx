'use client';

import { cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'kh';

const messages = {
  en: {
    toolHub: 'Tool Hub',
    workspace: 'Workspace',
    documentTools: 'Document tools',
    popularTools: 'Popular tools',
    allTools: 'Browse all tools',
    noTools: 'No tools found in this collection',
    chooseCollection: 'Choose another collection or view all tools.',
    showAllTools: 'Show all tools',
    tools: 'tools',
    loadingTool: 'Loading tool…',
    backToHub: 'Back to Tool Hub',
    allClient: 'All client-side',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    free: 'Free',
    support: 'Support',
    signIn: 'Sign in',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign out',
    fileConversion: 'PDF ↔ Word',
    converterSubtitle: 'Convert PDF and Word files with English and Khmer support.',
    imageConversion: 'Image Conversion',
    imageConverterSubtitle: 'Convert an image to PDF, or recognize its text and create an editable Word document.',
    privacyNotice: 'Your file is uploaded to CloudConvert for processing under its privacy and retention terms. This app stores job details only, never the document.',
    pdfToWord: 'PDF to Word',
    wordToPdf: 'Word to PDF',
    imageToPdf: 'Image to PDF',
    imageToWord: 'Image to Word (OCR)',
    acceptedImage: 'Choose up to 20 JPG, PNG, TIFF, WebP, BMP or GIF images (25 MB total)',
    addImages: 'Add more images',
    imagesSelected: 'images selected',
    tooManyImages: 'Choose no more than 20 images.',
    dropFile: 'Drop a file here',
    dropImages: 'Drop images here',
    or: 'or',
    chooseFile: 'Choose file',
    acceptedPdf: 'PDF files up to 25 MB',
    acceptedDocx: 'DOCX files up to 25 MB',
    imagePreview: 'Image preview',
    selectedFile: 'Selected file',
    changeFile: 'Change file',
    convert: 'Convert file',
    converting: 'Converting document…',
    uploading: 'Uploading file…',
    conversionReady: 'Conversion complete',
    download: 'Download converted file',
    convertAnother: 'Convert another file',
    sourcePreview: 'Original PDF preview',
    resultPreview: 'Converted PDF preview',
    serviceUnavailable: 'The document conversion service is not configured. Please try again later.',
    invalidFile: 'Choose a supported file type for this conversion.',
    fileTooLarge: 'The selected file or combined files exceed the 25 MB limit.',
    conversionFailed: 'Conversion failed. Check that the file is valid and not password-protected, then try again.',
    scannedPdf: 'Scanned PDFs may need OCR. Khmer and English text recognition depends on the provider and file; proofread converted text.',
    layoutNote: 'Complex PDF layouts may shift during conversion. Please review the editable document before use.',
    unsupported: 'This file type is not supported.',
    rateLimited: 'Too many conversions from this network. Please wait a while and try again.',
    fileName: 'File name',
    resultFile: 'Converted file',
    heroEyebrow: 'Developer tools, ready when you are',
    heroFirstLine: 'Find the right tool.',
    heroSecondLine: 'Get back to building.',
    heroDescription: 'Format, compare, convert, and inspect code or data right in your browser. Sign in only to sync preferences or save data.',
    collections: 'collections',
    uploadedFiles: 'files uploaded',
    findTool: 'Find a tool',
    searchHelp: 'Search by name or what you need to do.',
    devicePrivacy: 'Your data stays on this device while you work.',
    recentTools: 'Recently opened',
    recentEmpty: 'Tools you open will appear here for quick access.',
    toolLibrary: 'Tool library',
    browseTools: 'Browse all tools',
    browseHelp: 'Choose a collection, then open the tool you need.',
    usefulTools: 'Useful utilities, without getting in your way.',
    clientTools: 'Tools run in your browser · Account optional',
    popular: 'Popular',
    new: 'New',
    open: 'Open',
    searchPlaceholder: 'Search tools by name or task…',
    searchAria: 'Search developer tools',
    noSearchMatches: 'No matching tools. Try a different name or keyword.',
    noToolSelected: 'No tool selected',
    chooseTool: 'Choose a tool from the hub to open it here, or pick one of the popular tools below to get started.',
    toggleMenu: 'Toggle menu',
  },
  kh: {
    toolHub: 'មជ្ឈមណ្ឌលឧបករណ៍',
    workspace: 'កន្លែងធ្វើការ',
    documentTools: 'ឧបករណ៍ឯកសារ',
    popularTools: 'ឧបករណ៍ពេញនិយម',
    allTools: 'មើលឧបករណ៍ទាំងអស់',
    noTools: 'រកមិនឃើញឧបករណ៍ក្នុងប្រភេទនេះទេ',
    chooseCollection: 'ជ្រើសរើសប្រភេទផ្សេង ឬមើលឧបករណ៍ទាំងអស់។',
    showAllTools: 'បង្ហាញឧបករណ៍ទាំងអស់',
    tools: 'ឧបករណ៍',
    loadingTool: 'កំពុងផ្ទុកឧបករណ៍…',
    backToHub: 'ត្រឡប់ទៅមជ្ឈមណ្ឌលឧបករណ៍',
    allClient: 'ដំណើរការលើឧបករណ៍នេះ',
    theme: 'រូបរាង',
    light: 'ភ្លឺ',
    dark: 'ងងឹត',
    language: 'ភាសា',
    free: 'ឥតគិតថ្លៃ',
    support: 'ជួយគាំទ្រ',
    signIn: 'ចូលគណនី',
    signInGoogle: 'ចូលដោយប្រើ Google',
    signOut: 'ចាកចេញ',
    fileConversion: 'PDF ↔ Word',
    converterSubtitle: 'បម្លែងឯកសារ PDF និង Word ដោយគាំទ្រភាសាខ្មែរ និងអង់គ្លេស។',
    imageConversion: 'បម្លែងរូបភាព',
    imageConverterSubtitle: 'បម្លែងរូបភាពទៅជា PDF ឬស្គាល់អត្ថបទ ដើម្បីបង្កើតឯកសារ Word ដែលអាចកែសម្រួលបាន។',
    privacyNotice: 'ឯកសាររបស់អ្នកត្រូវបានផ្ញើទៅ CloudConvert ដើម្បីដំណើរការ តាមលក្ខខណ្ឌឯកជនភាព និងការរក្សាទុករបស់សេវានោះ។ កម្មវិធីនេះរក្សាទុកតែព័ត៌មានការងារ មិនរក្សាទុកឯកសារទេ។',
    pdfToWord: 'PDF ទៅ Word',
    wordToPdf: 'Word ទៅ PDF',
    imageToPdf: 'រូបភាព ទៅ PDF',
    imageToWord: 'រូបភាព ទៅ Word (OCR)',
    acceptedImage: 'ជ្រើសរើសរូបភាព JPG, PNG, TIFF, WebP, BMP ឬ GIF រហូតដល់ ២០ រូប (សរុបមិនលើស ២៥ MB)',
    addImages: 'បន្ថែមរូបភាព',
    imagesSelected: 'រូបភាពបានជ្រើស',
    tooManyImages: 'សូមជ្រើសរើសរូបភាពមិនលើស ២០។',
    dropFile: 'ទម្លាក់ឯកសារនៅទីនេះ',
    dropImages: 'ទម្លាក់រូបភាពនៅទីនេះ',
    or: 'ឬ',
    chooseFile: 'ជ្រើសរើសឯកសារ',
    acceptedPdf: 'ឯកសារ PDF ទំហំមិនលើស ២៥ MB',
    acceptedDocx: 'ឯកសារ DOCX ទំហំមិនលើស ២៥ MB',
    imagePreview: 'មើលរូបភាព',
    selectedFile: 'ឯកសារដែលបានជ្រើស',
    changeFile: 'ប្តូរឯកសារ',
    convert: 'បម្លែងឯកសារ',
    converting: 'កំពុងបម្លែងឯកសារ…',
    uploading: 'កំពុងផ្ទុកឯកសារ…',
    conversionReady: 'បម្លែងរួចរាល់',
    download: 'ទាញយកឯកសារដែលបានបម្លែង',
    convertAnother: 'បម្លែងឯកសារផ្សេងទៀត',
    sourcePreview: 'មើល PDF ដើម',
    resultPreview: 'មើល PDF ដែលបានបម្លែង',
    serviceUnavailable: 'មិនទាន់កំណត់សេវាបម្លែងឯកសារទេ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។',
    invalidFile: 'សូមជ្រើសរើសប្រភេទឯកសារដែលគាំទ្រសម្រាប់ការបម្លែងនេះ។',
    fileTooLarge: 'ឯកសារដែលបានជ្រើស ឬឯកសាររួមគ្នា លើសទំហំកំណត់ ២៥ MB។',
    conversionFailed: 'ការបម្លែងមិនបានជោគជ័យទេ។ សូមពិនិត្យថាឯកសារត្រឹមត្រូវ និងមិនមានពាក្យសម្ងាត់ រួចព្យាយាមម្តងទៀត។',
    scannedPdf: 'PDF ដែលស្កេនអាចត្រូវការ OCR។ ការស្គាល់អក្សរខ្មែរ និងអង់គ្លេសអាស្រ័យលើសេវា និងឯកសារ។ សូមពិនិត្យអត្ថបទក្រោយបម្លែង។',
    layoutNote: 'ប្លង់ PDF ស្មុគស្មាញអាចផ្លាស់ប្តូរពេលបម្លែង។ សូមពិនិត្យឯកសារដែលអាចកែបានមុនប្រើប្រាស់។',
    unsupported: 'មិនគាំទ្រប្រភេទឯកសារនេះទេ។',
    rateLimited: 'មានការបម្លែងច្រើនពេកពីបណ្តាញនេះ។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្តងទៀត។',
    fileName: 'ឈ្មោះឯកសារ',
    resultFile: 'ឯកសារដែលបានបម្លែង',
    heroEyebrow: 'ឧបករណ៍អ្នកអភិវឌ្ឍន៍ ត្រៀមប្រើប្រាស់',
    heroFirstLine: 'ស្វែងរកឧបករណ៍ដែលត្រូវការ។',
    heroSecondLine: 'ត្រឡប់ទៅការអភិវឌ្ឍរបស់អ្នក។',
    heroDescription: 'រៀបចំ ប្រៀបធៀប បម្លែង និងពិនិត្យកូដ ឬទិន្នន័យដោយផ្ទាល់ក្នុងកម្មវិធីរុករក។ ចូលគណនីតែពេលចង់ធ្វើសមកាលកម្ម ឬរក្សាទុកទិន្នន័យ។',
    collections: 'ប្រភេទ',
    uploadedFiles: 'ឯកសារបានផ្ទុក',
    findTool: 'ស្វែងរកឧបករណ៍',
    searchHelp: 'ស្វែងរកតាមឈ្មោះ ឬអ្វីដែលអ្នកចង់ធ្វើ។',
    devicePrivacy: 'ទិន្នន័យរបស់អ្នកនៅលើឧបករណ៍នេះពេលអ្នកកំពុងប្រើ។',
    recentTools: 'បានបើកថ្មីៗ',
    recentEmpty: 'ឧបករណ៍ដែលអ្នកបើកនឹងបង្ហាញនៅទីនេះ។',
    toolLibrary: 'បណ្ណាល័យឧបករណ៍',
    browseTools: 'មើលឧបករណ៍ទាំងអស់',
    browseHelp: 'ជ្រើសរើសប្រភេទ រួចបើកឧបករណ៍ដែលអ្នកត្រូវការ។',
    usefulTools: 'ឧបករណ៍មានប្រយោជន៍ ងាយស្រួលប្រើ។',
    clientTools: 'ដំណើរការក្នុងកម្មវិធីរុករក · មិនចាំបាច់មានគណនី',
    popular: 'ពេញនិយម',
    new: 'ថ្មី',
    open: 'បើក',
    searchPlaceholder: 'ស្វែងរកឧបករណ៍តាមឈ្មោះ ឬកិច្ចការ…',
    searchAria: 'ស្វែងរកឧបករណ៍អ្នកអភិវឌ្ឍន៍',
    noSearchMatches: 'រកមិនឃើញឧបករណ៍ទេ។ សូមសាកល្បងពាក្យស្វែងរកផ្សេង។',
    noToolSelected: 'មិនទាន់ជ្រើសរើសឧបករណ៍ទេ',
    chooseTool: 'ជ្រើសរើសឧបករណ៍ពីមជ្ឈមណ្ឌលដើម្បីបើកទីនេះ ឬជ្រើសរើសឧបករណ៍ពេញនិយមខាងក្រោម។',
    toggleMenu: 'បង្ហាញ ឬលាក់ម៉ឺនុយ',
  },
} as const;

type MessageKey = keyof typeof messages.en;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('kh');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('devtoolkit-locale');
      if (saved === 'en' || saved === 'kh') setLocaleState(saved);
    } catch {
      // Keep the default locale when storage is unavailable.
    }
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem('devtoolkit-locale', nextLocale);
    } catch {
      // The selected locale still applies for the current page.
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'kh' ? 'km' : 'en';
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: (key: MessageKey) => messages[locale][key] }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider.');
  return value;
}

export function getToolName(id: string, name: string, locale: Locale) {
  if (locale === 'en') return name;
  const names: Record<string, string> = {
    'tool-json-formatter': 'កម្មវិធីរៀបចំ JSON',
    'tool-js-formatter': 'កម្មវិធីរៀបចំ JS / TS',
    'tool-html-formatter': 'កម្មវិធីរៀបចំ HTML',
    'tool-css-formatter': 'កម្មវិធីរៀបចំ CSS / SCSS',
    'tool-sql-formatter': 'កម្មវិធីរៀបចំ SQL',
    'tool-xml-formatter': 'កម្មវិធីរៀបចំ XML',
    'tool-yaml-formatter': 'កម្មវិធីរៀបចំ YAML',
    'tool-json-diff': 'ប្រៀបធៀប JSON',
    'tool-text-diff': 'ប្រៀបធៀបអត្ថបទ',
    'tool-xml-diff': 'ប្រៀបធៀប XML',
    'tool-java-diff': 'ប្រៀបធៀបកូដ',
    'tool-khqr-builder': 'បង្កើត KHQR',
    'tool-khqr-validator': 'ផ្ទៀងផ្ទាត់ KHQR',
    'tool-qr-reader': 'អាន QR / ស្កេន',
    'tool-base64-image': 'Base64 ↔ រូបភាព / ឯកសារ',
    'tool-image-compress': 'ប្តូរទំហំ និងបង្ហាប់រូបភាព',
    'tool-svg-viewer': 'មើល និងកែសម្រួល SVG',
    'tool-uuid': 'បង្កើត UUID',
    'tool-hash': 'បង្កើត Hash',
    'tool-password-generator': 'បង្កើតពាក្យសម្ងាត់',
    'tool-jwt-decoder': 'បកស្រាយ JWT',
    'tool-url-codec': 'អ៊ិនកូដ / ឌិកូដ URL',
    'tool-regex-tester': 'សាកល្បង Regex',
    'tool-timestamp': 'បម្លែង Timestamp',
    'tool-json-to-ts': 'JSON → កូដ Type',
    'tool-json-to-java': 'JSON → Java / Kotlin / C#',
    'tool-json-to-dart': 'JSON → Dart',
    'tool-markdown-formatter': 'កម្មវិធីរៀបចំ Markdown',
    'tool-pdf-word-converter': 'បម្លែង PDF ↔ Word',
    'tool-image-to-pdf': 'បម្លែងរូបភាពទៅជា PDF',
    'tool-image-to-word': 'បម្លែងរូបភាពទៅជា Word (OCR)',
    'tool-curl-generator': 'បង្កើត cURL',
    'tool-sql-builder': 'បង្កើត SQL Query',
    'tool-json-schema': 'ផ្ទៀងផ្ទាត់ JSON Schema',
    'tool-jsonpath': 'សាកល្បង JSONPath',
    'tool-data-converter': 'បម្លែង JSON / YAML / CSV / XML',
    'tool-cron-builder': 'បង្កើត Cron Expression',
    'tool-conversion-calculator': 'បម្លែងតំបន់ម៉ោង និងឯកតា',
    'tool-text-toolkit': 'ឧបករណ៍អត្ថបទ',
    'tool-encoding-toolkit': 'អ៊ិនកូដ HTML / Hex / Gzip',
    'tool-api-tester': 'សាកល្បង HTTP Request',
    'tool-ip-cidr': 'គណនា IPv4 / CIDR',
    'tool-certificate-inspector': 'ពិនិត្យវិញ្ញាបនបត្រ X.509',
  };
  return names[id] ?? name;
}

export function getToolDescription(id: string, description: string, locale: Locale) {
  if (locale === 'en') return description;
  const descriptions: Record<string, string> = {
    'tool-json-formatter': 'រៀបចំ បង្រួម និងផ្ទៀងផ្ទាត់ JSON ដោយបង្ហាញកំហុសវាក្យសម្ព័ន្ធ។',
    'tool-js-formatter': 'រៀបចំ JavaScript និង TypeScript ដោយប្រើ Prettier និងជម្រើសកំណត់ទ្រង់ទ្រាយ។',
    'tool-html-formatter': 'រៀបចំ ឬបង្រួម HTML ជាមួយជម្រើសទំហំចន្លោះ និងការបង្ហាញគុណលក្ខណៈ។',
    'tool-css-formatter': 'រៀបចំ CSS, SCSS និង Less ដោយគាំទ្រវាក្យសម្ព័ន្ធ nested។',
    'tool-sql-formatter': 'រៀបចំសំណួរ SQL សម្រាប់ MySQL, PostgreSQL, SQLite និង dialect ផ្សេងៗ។',
    'tool-xml-formatter': 'រៀបចំ និងផ្ទៀងផ្ទាត់ XML ក្នុងកម្មវិធីរុករក។',
    'tool-yaml-formatter': 'រៀបចំ និងផ្ទៀងផ្ទាត់ YAML រកសោស្ទួន និងការដាក់ចន្លោះមិនត្រឹមត្រូវ។',
    'tool-markdown-formatter': 'រៀបចំ Markdown និងមើលលទ្ធផលដែលបានបង្ហាញ។',
    'tool-json-diff': 'ប្រៀបធៀប JSON ពីរដោយបង្ហាញបន្ទាត់ដែលបានបន្ថែម ឬដកចេញ។',
    'tool-text-diff': 'ប្រៀបធៀបអត្ថបទ និងកូដជាមួយការបន្លិចការផ្លាស់ប្តូរ។',
    'tool-xml-diff': 'ប្រៀបធៀបឯកសារ XML តាមរចនាសម្ព័ន្ធ។',
    'tool-java-diff': 'មើលភាពខុសគ្នារវាង Java, Kotlin ឬកូដផ្សេងៗ។',
    'tool-khqr-builder': 'បង្កើតកូដទូទាត់ KHQR តាមស្តង់ដារ EMVCo។',
    'tool-khqr-validator': 'បកស្រាយ និងផ្ទៀងផ្ទាត់ payload KHQR / EMV® QR និង CRC។',
    'tool-qr-reader': 'ស្កេនរូបភាព ឬកាមេរ៉ា ដើម្បីពិនិត្យ QR និងព័ត៌មាន EMV។',
    'tool-base64-image': 'បម្លែងរូបភាព ឯកសារ និង PDF ទៅជា Base64 ឬត្រឡប់មកវិញ។',
    'tool-image-compress': 'ប្តូរទំហំ និងបង្ហាប់រូបភាពក្នុងកម្មវិធីរុករក។',
    'tool-svg-viewer': 'បិទភ្ជាប់ SVG ដើម្បីមើល បង្កើនប្រសិទ្ធភាព និងបង្កើត data URI។',
    'tool-uuid': 'បង្កើត UUID v4 ច្រើនក្នុងពេលតែមួយ និងចម្លងម្តងមួយ។',
    'tool-hash': 'បង្កើត MD5, SHA-1, SHA-256 និង SHA-512 ពីអត្ថបទ ឬឯកសារ។',
    'tool-password-generator': 'បង្កើតពាក្យសម្ងាត់សុវត្ថិភាព និងកំណត់ប្រវែង ឬប្រភេទតួអក្សរ។',
    'tool-jwt-decoder': 'បកស្រាយ Header, Payload និង Signature របស់ JWT ព្រមទាំងពិនិត្យការផុតកំណត់។',
    'tool-url-codec': 'អ៊ិនកូដ និងឌិកូដ URL components។',
    'tool-regex-tester': 'សាកល្បង regular expression និងពិនិត្យលទ្ធផលដែលត្រូវគ្នា។',
    'tool-timestamp': 'បម្លែង Unix timestamp ទៅកាលបរិច្ឆេទ និងម៉ោង។',
    'tool-json-to-ts': 'បង្កើត TypeScript, Go, Python, Pydantic, Rust, Zod ឬ Dart definitions ពី JSON។',
    'tool-json-to-java': 'បង្កើត Java, Kotlin ឬ C# models ពី JSON។',
    'tool-json-to-dart': 'បង្កើត Dart model class definitions ពី JSON។',
    'tool-markdown-formatter': 'រៀបចំ Markdown និងមើលលទ្ធផលដែលបានបង្ហាញ។',
    'tool-curl-generator': 'បង្កើត cURL commands តាម method, URL, headers និង body។',
    'tool-sql-builder': 'បង្កើត SELECT, INSERT, UPDATE និង DELETE queries តាមរយៈទម្រង់។',
    'tool-pdf-word-converter': 'បម្លែង PDF និង DOCX ដោយមាន OCR ជាភាសាខ្មែរ និងអង់គ្លេសសម្រាប់ឯកសារស្កេន។',
    'tool-image-to-pdf': 'បម្លែងរូបភាពទៅជាឯកសារ PDF ដែលអាចទាញយកបាន។',
    'tool-image-to-word': 'ស្គាល់អត្ថបទក្នុងរូបភាព ហើយបម្លែងទៅជាឯកសារ Word ដែលអាចកែសម្រួលបាន។',
    'tool-json-schema': 'ផ្ទៀងផ្ទាត់ JSON តាម JSON Schema draft-07 និងមើលកំហុស។',
    'tool-jsonpath': 'ស្វែងរកទិន្នន័យ nested ក្នុង JSON ដោយប្រើ JSONPath។',
    'tool-data-converter': 'បម្លែងទិន្នន័យរវាង JSON, YAML, CSV និង XML ក្នុងកម្មវិធីរុករក។',
    'tool-cron-builder': 'ពន្យល់ cron expression និងបង្ហាញពេលដំណើរការបន្ទាប់ជា UTC។',
    'tool-conversion-calculator': 'បម្លែងម៉ោងតាមតំបន់ ឬបម្លែងឯកតាប្រវែង ទម្ងន់ សីតុណ្ហភាព និងទិន្នន័យ។',
    'tool-text-toolkit': 'វិភាគអត្ថបទ បម្លែងអក្សរធំតូច ប្រៀបធៀបបញ្ជី និងបង្កើត Lorem Ipsum។',
    'tool-encoding-toolkit': 'អ៊ិនកូដ ឬឌិកូដ HTML entities, UTF-8 hex និង gzip។',
    'tool-api-tester': 'ផ្ញើ HTTP requests ពី browser និងពិនិត្យ status, headers និង body។',
    'tool-ip-cidr': 'ពិនិត្យ IPv4 និងគណនា network, broadcast និង host range។',
    'tool-certificate-inspector': 'ពិនិត្យ subject, issuer, validity, signature algorithm និង SAN របស់ PEM certificate។',
  };
  return descriptions[id] ?? description;
}

export function getCategoryName(id: string, label: string, locale: Locale) {
  if (locale === 'en') return label;
  const names: Record<string, string> = {
    formatters: 'រៀបចំទ្រង់ទ្រាយ',
    diff: 'ប្រៀបធៀប',
    qr: 'QR និង KHQR',
    image: 'រូបភាព និង Base64',
    utilities: 'ឧបករណ៍ប្រើប្រាស់',
    generators: 'បង្កើត',
    documents: 'PDF និង Word',
  };
  return names[id] ?? label;
}

export function translateText(text: string, locale: Locale) {
  if (locale === 'en') return text;
  const translations: Record<string, string> = {
    Input: 'បញ្ចូល',
    Output: 'លទ្ធផល',
    Format: 'រៀបចំទ្រង់ទ្រាយ',
    Minify: 'បង្រួម',
    Validate: 'ផ្ទៀងផ្ទាត់',
    Clear: 'សម្អាត',
    'Clear input': 'សម្អាតទិន្នន័យបញ្ចូល',
    'Swap input and output': 'ប្តូរទិន្នន័យបញ្ចូល និងលទ្ធផល',
    'Copy output': 'ចម្លងលទ្ធផល',
    'Download output': 'ទាញយកលទ្ធផល',
    'Copied to clipboard': 'បានចម្លងទៅក្ដារតម្បៀតខ្ទាស់',
    'Copy line': 'ចម្លងបន្ទាត់',
    Indent: 'ចំនួនចន្លោះ',
    Parser: 'កម្មវិធីបកស្រាយ',
    Language: 'ភាសា',
    'Root name': 'ឈ្មោះ Root',
    'Test String': 'អត្ថបទសាកល្បង',
    'Replace With': 'ជំនួសដោយ',
    'Input Text': 'អត្ថបទបញ្ចូល',
    'Output Format': 'ទ្រង់ទ្រាយលទ្ធផល',
    'Match input': 'តាមទ្រង់ទ្រាយបញ្ចូល',
    'Format JSON': 'រៀបចំ JSON',
    'Format CSS': 'រៀបចំ CSS',
    'Format HTML': 'រៀបចំ HTML',
    'Format XML': 'រៀបចំ XML',
    'Format YAML': 'រៀបចំ YAML',
    'Format SQL': 'រៀបចំ SQL',
    'Generate TypeScript': 'បង្កើត TypeScript',
    'Generate UUIDs': 'បង្កើត UUIDs',
    'Parse URL': 'បកស្រាយ URL',
    'Encode URL': 'អ៊ិនកូដ URL',
    'Decode URL': 'ឌិកូដ URL',
    'Test Regex': 'សាកល្បង Regex',
    'Generate Hash': 'បង្កើត Hash',
    'Generate Password': 'បង្កើតពាក្យសម្ងាត់',
    'Generate QR Code': 'បង្កើត QR Code',
    'Read Image': 'អានរូបភាព',
    'Upload Image': 'ផ្ទុករូបភាពឡើង',
    'Paste Image': 'បិទភ្ជាប់រូបភាព',
    'Upload File': 'ផ្ទុកឯកសារឡើង',
    'Paste from clipboard': 'បិទភ្ជាប់ពីក្ដារតម្បៀតខ្ទាស់',
    'Use camera': 'ប្រើកាមេរ៉ា',
    'No QR code scanned yet': 'មិនទាន់បានស្កេន QR Code ទេ',
    'Scanned Image': 'រូបភាពដែលបានស្កេន',
    'Decoded Result': 'លទ្ធផលដែលបានបកស្រាយ',
    'Tag Validation': 'ការផ្ទៀងផ្ទាត់ Tag',
    'Original (A)': 'ដើម (A)',
    'Modified (B)': 'បានកែប្រែ (B)',
    Split: 'បំបែកទិដ្ឋភាព',
    Unified: 'ទិដ្ឋភាពរួម',
    'Regular Expression': 'កន្សោមធម្មតា',
    'Uppercase output': 'លទ្ធផលជាអក្សរធំ',
    'JWT Token': 'JWT Token',
    'Common Encodings': 'ទម្រង់អ៊ិនកូដទូទៅ',
    'Encode string': 'អ៊ិនកូដអត្ថបទ',
    Foreground: 'ពណ៌ផ្ទៃខាងមុខ',
    Background: 'ពណ៌ផ្ទៃខាងក្រោយ',
    'Apply Changes': 'អនុវត្តការផ្លាស់ប្តូរ',
    'Copy to clipboard': 'ចម្លងទៅក្ដារតម្បៀតខ្ទាស់',
    'Copy image': 'ចម្លងរូបភាព',
    Preview: 'មើលជាមុន',
    'Preview image': 'មើលរូបភាពជាមុន',
    'Show JSON': 'បង្ហាញ JSON',
    'Show formatted JSON': 'បង្ហាញ JSON ដែលបានរៀបចំ',
    'No output yet': 'មិនទាន់មានលទ្ធផលទេ',
    'No matches found': 'រកមិនឃើញលទ្ធផលត្រូវគ្នាទេ',
    'Paste content in both panels to see the diff': 'បិទភ្ជាប់ទិន្នន័យក្នុងផ្ទាំងទាំងពីរ ដើម្បីមើលភាពខុសគ្នា',
    'Saved data': 'ទិន្នន័យដែលបានរក្សាទុក',
    'Synced to your account': 'ធ្វើសមកាលកម្មជាមួយគណនីរបស់អ្នក',
    Name: 'ឈ្មោះ',
    'Text or tool data': 'អត្ថបទ ឬទិន្នន័យឧបករណ៍',
    'e.g. Production config': 'ឧ. ការកំណត់រចនាសម្ព័ន្ធប្រព័ន្ធ',
    'Paste the result or data you want to keep…': 'បិទភ្ជាប់លទ្ធផល ឬទិន្នន័យដែលអ្នកចង់រក្សាទុក…',
    'Stored as text in the database, not automatically collected. Don’t save secrets.': 'រក្សាទុកជាអត្ថបទក្នុងមូលដ្ឋានទិន្នន័យ មិនប្រមូលដោយស្វ័យប្រវត្តិទេ។ កុំរក្សាទុកព័ត៌មានសម្ងាត់។',
    'Saving…': 'កំពុងរក្សាទុក…',
    'Save data': 'រក្សាទុកទិន្នន័យ',
    'Previously saved': 'បានរក្សាទុកពីមុន',
    'Loading saved data…': 'កំពុងផ្ទុកទិន្នន័យដែលបានរក្សាទុក…',
    'Nothing saved for this tool yet.': 'មិនទាន់មានទិន្នន័យរក្សាទុកសម្រាប់ឧបករណ៍នេះទេ។',
    Updated: 'បានធ្វើបច្ចុប្បន្នភាព',
    'Copy saved data': 'ចម្លងទិន្នន័យដែលបានរក្សាទុក',
    'Delete saved data': 'លុបទិន្នន័យដែលបានរក្សាទុក',
    'Sign in with Google to save and sync data for this tool across devices.': 'ចូលដោយប្រើ Google ដើម្បីរក្សាទុក និងធ្វើសមកាលកម្មទិន្នន័យឧបករណ៍នេះនៅលើឧបករណ៍ផ្សេងៗ។',
    'Paste your input here…': 'បិទភ្ជាប់ទិន្នន័យរបស់អ្នកនៅទីនេះ…',
    'Paste JSON here…': 'បិទភ្ជាប់ JSON នៅទីនេះ…',
    'Paste XML here…': 'បិទភ្ជាប់ XML នៅទីនេះ…',
    'Paste YAML here…': 'បិទភ្ជាប់ YAML នៅទីនេះ…',
    'Paste HTML here…': 'បិទភ្ជាប់ HTML នៅទីនេះ…',
    'Paste CSS / SCSS here…': 'បិទភ្ជាប់ CSS / SCSS នៅទីនេះ…',
    'Paste JavaScript or TypeScript here…': 'បិទភ្ជាប់ JavaScript ឬ TypeScript នៅទីនេះ…',
    'Formatted output appears here…': 'លទ្ធផលដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Formatted XML appears here…': 'XML ដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Formatted YAML appears here…': 'YAML ដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Formatted CSS appears here…': 'CSS ដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Formatted HTML appears here…': 'HTML ដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Formatted code appears here…': 'កូដដែលបានរៀបចំនឹងបង្ហាញនៅទីនេះ…',
    'Generate Models': 'បង្កើត Models',
    'Copied output.txt': 'បានទាញយក output.txt',
  };
  if (translations[text]) return translations[text];
  const lineCopy = text.match(/^Copy line (\d+)$/);
  if (lineCopy) return `ចម្លងបន្ទាត់ ${lineCopy[1]}`;
  const copiedLine = text.match(/^Line (\d+) copied$/);
  if (copiedLine) return `បានចម្លងបន្ទាត់ ${copiedLine[1]}`;
  return text;
}

export function localizeControlContent(node: ReactNode, locale: Locale, inControl = false): ReactNode {
  if (typeof node === 'string') return inControl ? translateText(node, locale) : node;
  if (Array.isArray(node)) return node.map((child) => localizeControlContent(child, locale, inControl));
  if (!isValidElement<Record<string, unknown>>(node)) return node;

  const tagName = typeof node.type === 'string' ? node.type : '';
  const translateChildren = inControl || ['button', 'label', 'option'].includes(tagName);
  const props: Record<string, unknown> = {};
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    const value = node.props[attribute];
    if (typeof value === 'string') props[attribute] = translateText(value, locale);
  }
  const children = node.props.children as ReactNode;
  return cloneElement(node, props, localizeControlContent(children, locale, translateChildren));
}
