import crc16 from './crc16';

export interface EmvTlvTag {
  tag: string;
  length: number;
  value: string;
  label: string;
  children?: EmvTlvTag[];
}

const TAG_LABELS: Record<string, string> = {
  '00': 'Payload Format Indicator',
  '01': 'Point of Initiation Method',
  '26': 'Merchant Account Information Template',
  '27': 'Merchant Account Information Template',
  '29': 'Merchant Account Info (KHQR)',
  '40': 'Merchant Account Information Template (Dual Currency)',
  '52': 'Merchant Category Code',
  '53': 'Transaction Currency',
  '54': 'Transaction Amount',
  '55': 'Tip or Convenience Indicator',
  '58': 'Country Code',
  '59': 'Merchant Name',
  '60': 'Merchant City',
  '61': 'Postal Code',
  '62': 'Additional Data Field Template',
  '63': 'CRC',
};

const NESTED_TLV_TAGS = new Set(['26', '27', '29', '40', '62']);

export interface EmvQrDetails {
  tags: EmvTlvTag[];
  isEmvQr: boolean;
  currencyCode: string | null;
  currencyName: string | null;
  hasDualCurrency: boolean | null;
  merchantAccountCount: number;
  crcValid: boolean | null;
}

function isMerchantAccountTemplate(tag: string): boolean {
  const tagNumber = Number(tag);
  return tagNumber >= 26 && tagNumber <= 51;
}

export function parseEmvTlv(data: string): EmvTlvTag[] {
  const tags: EmvTlvTag[] = [];
  let index = 0;

  while (index + 4 <= data.length) {
    const tag = data.slice(index, index + 2);
    const lengthText = data.slice(index + 2, index + 4);
    if (!/^\d{2}$/.test(lengthText)) break;
    const length = Number.parseInt(lengthText, 10);
    if (index + 4 + length > data.length) break;

    const value = data.slice(index + 4, index + 4 + length);
    tags.push({
      tag,
      length,
      value,
      label: TAG_LABELS[tag] || `Tag ${tag}`,
      children: NESTED_TLV_TAGS.has(tag) ? parseEmvTlv(value) : undefined,
    });
    index += 4 + length;
  }

  return tags;
}

export function getEmvQrDetails(data: string): EmvQrDetails {
  const tags = parseEmvTlv(data);
  const isEmvQr = tags.some((tag) => tag.tag === '00' && tag.value === '01');
  const currencyCode = tags.find((tag) => tag.tag === '53')?.value ?? null;
  const merchantAccountCount = tags.filter((tag) => isMerchantAccountTemplate(tag.tag)).length;
  const hasDualCurrency = isEmvQr ? tags.some((tag) => tag.tag === '40') : null;
  const currencyName =
    currencyCode === '116'
      ? 'KHR'
      : currencyCode === '840'
        ? 'USD'
        : currencyCode
          ? `ISO 4217 ${currencyCode}`
          : null;
  let crcValid: boolean | null = null;
  const lastTag = tags[tags.length - 1];
  if (lastTag?.tag === '63' && lastTag.length === 4) {
    const crcIndex = data.length - 8;
    crcValid = lastTag.value.toUpperCase() === crc16(data.slice(0, crcIndex + 4));
  }

  return { tags, isEmvQr, currencyCode, currencyName, hasDualCurrency, merchantAccountCount, crcValid };
}
