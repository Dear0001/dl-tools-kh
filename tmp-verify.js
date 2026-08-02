function deepParseJsonStrings(value, depth = 0, maxDepth = 10) {
  if (depth >= maxDepth) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return deepParseJsonStrings(parsed, depth + 1, maxDepth);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => deepParseJsonStrings(item, depth, maxDepth));
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, child]) => {
      acc[key] = deepParseJsonStrings(child, depth, maxDepth);
      return acc;
    }, {});
  }
  return value;
}
const input = JSON.stringify({ responseObj: '{"status":"ok","items":[{"id":1},{"id":2}]}', nested: { payload: '{"foo":"bar"}' }, text: 'keep me as text' });
const parsed = JSON.parse(input);
const hydrated = deepParseJsonStrings(parsed);
console.log('responseObj-type=' + typeof hydrated.responseObj);
console.log('responseObj-json=' + JSON.stringify(hydrated.responseObj));
console.log('nested-type=' + typeof hydrated.nested.payload);
console.log('nested-json=' + JSON.stringify(hydrated.nested.payload));
