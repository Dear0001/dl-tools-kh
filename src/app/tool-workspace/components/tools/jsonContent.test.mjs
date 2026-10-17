import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectInputFormat,
  findJsonFragments,
  formatContentOutput,
  formatMixedContent,
} from './jsonContent.ts';

test('detects empty, plain text, JSON, mixed content, and invalid JSON', () => {
  assert.equal(detectInputFormat(' \n\t').format, 'empty');
  assert.equal(detectInputFormat('Hello\nworld').format, 'string');
  assert.equal(detectInputFormat('{"name":"Ada","active":true}').format, 'json');
  assert.equal(detectInputFormat('prefix {"name":"Ada"} suffix').format, 'mixed');
  assert.equal(detectInputFormat('{"name": }').format, 'invalid-json');
});

test('finds nested objects and arrays while preserving string values and escapes', () => {
  const input = 'before {"nested":[{"message":"a } and \\"quote\\""}]} after';
  const fragments = findJsonFragments(input);

  assert.equal(fragments.length, 1);
  assert.deepEqual(fragments[0].value, { nested: [{ message: 'a } and "quote"' }] });
  assert.equal(input.slice(fragments[0].start, fragments[0].end), fragments[0].source);
});

test('finds multiple JSON values in text without mistaking malformed text for JSON', () => {
  const input = 'head {"a":1} middle [true,{"b":2}] tail {not json}';
  const fragments = findJsonFragments(input);

  assert.deepEqual(fragments.map(({ value }) => value), [{ a: 1 }, [true, { b: 2 }]]);
  assert.equal(
    formatMixedContent(input, fragments, (value) => JSON.stringify(value)),
    'head {"a":1} middle [true,{"b":2}] tail {not json}',
  );
});

test('formats mixed JSON fragments without changing surrounding text or Unicode', () => {
  const input = 'Привет:\n{"items":[1,2]} — done';
  const fragments = findJsonFragments(input);
  const output = formatMixedContent(input, fragments, (value) => JSON.stringify(value, null, 2));

  assert.equal(output, 'Привет:\n{\n  "items": [\n    1,\n    2\n  ]\n} — done');
});

test('leaves text without valid JSON fragments unchanged', () => {
  const input = 'line one\n{unfinished text\nline three';
  assert.deepEqual(findJsonFragments(input), []);
  assert.equal(formatMixedContent(input, [], JSON.stringify), input);
});

test('preserves plain text by default and only serializes it when JSON output is selected', () => {
  const input = 'Hello\nworld — keep this exactly';
  assert.equal(
    formatContentOutput(input, 'string', input, [], 'auto', 2, false, JSON.stringify),
    input,
  );
  assert.equal(
    formatContentOutput(input, 'string', input, [], 'json', 2, false, JSON.stringify),
    JSON.stringify(input, null, 2),
  );
});

test('supports readable and compact output for mixed content without changing its text segments', () => {
  const input = 'prefix {"items":[1,2]} suffix';
  const fragments = findJsonFragments(input);
  const pretty = formatContentOutput(input, 'mixed', undefined, fragments, 'auto', 2, false, (value) =>
    JSON.stringify(value, null, 2),
  );
  const compact = formatContentOutput(input, 'mixed', undefined, fragments, 'auto', 2, true, JSON.stringify);

  assert.equal(pretty, 'prefix {\n  "items": [\n    1,\n    2\n  ]\n} suffix');
  assert.equal(compact, 'prefix {"items":[1,2]} suffix');
});

test('renders a parsed JSON string as text only when plain-string output is selected', () => {
  const value = 'line one\nline two';
  assert.equal(formatContentOutput('', 'json', value, [], 'auto', 2, false, JSON.stringify), JSON.stringify(value));
  assert.equal(formatContentOutput('', 'json', value, [], 'string', 2, false, JSON.stringify), value);
});
