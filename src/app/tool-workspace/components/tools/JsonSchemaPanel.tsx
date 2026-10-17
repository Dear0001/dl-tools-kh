'use client';

import { useState } from 'react';
import Ajv from 'ajv';
import type { Tool } from '@/data/tools';
import CodeEditor from '../CodeEditor';

const SAMPLE_DATA = `{"user":{"name":"Dara","age":29},"active":true}`;
const SAMPLE_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["user", "active"],
  "properties": {
    "user": { "type": "object", "required": ["name"], "properties": { "name": { "type": "string" }, "age": { "type": "integer", "minimum": 0 } } },
    "active": { "type": "boolean" }
  }
}`;

export default function JsonSchemaPanel({ tool: _tool }: { tool: Tool }) {
  const [data, setData] = useState(SAMPLE_DATA);
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    try {
      const parsedSchema = JSON.parse(schema);
      const parsedData = JSON.parse(data);
      const ajv = new Ajv({ allErrors: true, jsonPointers: true, schemaId: 'auto' });
      const valid = ajv.validate(parsedSchema, parsedData);
      if (valid) {
        setResult('Valid: JSON data matches the schema.');
        setError('');
      } else {
        const errors = ajv.errors ?? [];
        setResult(errors.map((issue) => `${issue.dataPath || '/'} ${issue.message ?? 'is invalid'}`).join('\n'));
        setError('Schema validation failed.');
      }
    } catch (cause) {
      setResult('');
      setError(cause instanceof Error ? cause.message : 'Could not validate this schema.');
    }
  };

  return <div className="h-full flex flex-col">
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/30">
      <span className="text-xs text-muted-foreground">JSON Schema draft-07</span>
      <button className="btn-primary text-xs" onClick={validate}>Validate JSON</button>
    </div>
    <div className="flex-1 min-h-0 grid grid-rows-2 gap-3 p-4">
      <section className="flex flex-col min-h-0"><label className="text-xs text-muted-foreground mb-1">JSON data</label><div className="flex-1 min-h-0 border border-border rounded-lg bg-input"><CodeEditor value={data} onChange={setData} minHeight="100%" placeholder="JSON data…" /></div></section>
      <section className="flex flex-col min-h-0"><label className="text-xs text-muted-foreground mb-1">JSON Schema</label><div className="flex-1 min-h-0 border border-border rounded-lg bg-input"><CodeEditor value={schema} onChange={setSchema} minHeight="100%" placeholder="JSON Schema…" /></div></section>
    </div>
    <div className={`m-4 mt-0 p-3 rounded-lg border text-sm whitespace-pre-wrap ${error ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-border bg-secondary/20 text-foreground'}`} aria-live="polite">{result || error || 'Validation results will appear here.'}{result && error && <div className="text-red-300 mt-1">{error}</div>}</div>
  </div>;
}
