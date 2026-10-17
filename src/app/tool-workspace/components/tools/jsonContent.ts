export type DetectedInputFormat = 'empty' | 'json' | 'string' | 'mixed' | 'invalid-json';
export type InputFormatOption = 'auto' | 'string' | 'json' | 'mixed';
export type OutputFormatOption = 'auto' | 'string' | 'json';

export interface JsonFragment {
  start: number;
  end: number;
  source: string;
  value: unknown;
}

export function formatContentOutput(
  input: string,
  format: 'json' | 'string' | 'mixed',
  value: unknown,
  fragments: JsonFragment[],
  outputFormat: OutputFormatOption,
  indent: number,
  minify: boolean,
  formatJson: (value: unknown) => string,
): string {
  const formatValue = (item: unknown) => (minify ? JSON.stringify(item) : formatJson(item));
  const formattedMixed =
    format === 'mixed' ? formatMixedContent(input, fragments, formatValue) : input;

  if (outputFormat === 'json') {
    if (format === 'json') {
      return formatValue(value);
    }
    return JSON.stringify(formattedMixed, null, minify ? undefined : indent);
  }

  if (format === 'json') {
    if (outputFormat === 'string' && typeof value === 'string') {
      return value;
    }
    return formatValue(value);
  }

  return formattedMixed;
}

export function findJsonFragments(input: string): JsonFragment[] {
  const fragments: JsonFragment[] = [];

  for (let start = 0; start < input.length; start += 1) {
    const first = input[start];
    if (first !== '{' && first !== '[') continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let end = start; end < input.length; end += 1) {
      const character = input[end];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{' || character === '[') {
        stack.push(character);
      } else if (character === '}' || character === ']') {
        const opening = stack.pop();
        if ((character === '}' && opening !== '{') || (character === ']' && opening !== '[')) {
          break;
        }

        if (stack.length === 0) {
          const source = input.slice(start, end + 1);
          try {
            fragments.push({ start, end: end + 1, source, value: JSON.parse(source) });
            start = end;
          } catch {
            break;
          }
        }
      }
    }
  }

  return fragments;
}

export function detectInputFormat(input: string): {
  format: DetectedInputFormat;
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { format: 'empty' };

  try {
    JSON.parse(trimmed);
    return { format: 'json' };
  } catch (error) {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const message = error instanceof Error ? error.message : 'Invalid JSON syntax.';
      return { format: 'invalid-json', error: `Invalid JSON: ${message}` };
    }
  }

  if (findJsonFragments(input).length > 0) return { format: 'mixed' };
  return { format: 'string' };
}

export function formatMixedContent(
  input: string,
  fragments: JsonFragment[],
  formatJson: (value: unknown) => string,
): string {
  let output = '';
  let cursor = 0;

  for (const fragment of fragments) {
    output += input.slice(cursor, fragment.start);
    output += formatJson(fragment.value);
    cursor = fragment.end;
  }

  return output + input.slice(cursor);
}
