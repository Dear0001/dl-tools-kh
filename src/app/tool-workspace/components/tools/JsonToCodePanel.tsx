'use client';

import { useEffect, useState } from 'react';
import type { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';
import CodeOutput from '../CodeOutput';
import { useDebouncedValue } from '../useDebouncedValue';
import JsonToTS from 'json-to-ts';

type Target = 'typescript' | 'go' | 'python' | 'pydantic' | 'rust' | 'zod' | 'dart';
const SAMPLE = `{"user":{"id":42,"name":"Dara","active":true,"roles":["admin","editor"]}}`;
const pascal = (name: string) => {
  const value = name.replace(/[^a-zA-Z0-9]+(.)/g, (_m, char: string) => char.toUpperCase()).replace(/^[a-z]/, (char) => char.toUpperCase()) || 'Model';
  return /^[A-Za-z_]/.test(value) ? value : `Model${value}`;
};
const snake = (name: string) => {
  const value = name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase() || 'field';
  const reserved = new Set(['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'false', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'none', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'true', 'try', 'while', 'with', 'yield', 'type', 'match', 'case', 'ref', 'self', 'new', 'this', 'final', 'var']);
  const valid = /^\d/.test(value) ? `field_${value}` : value;
  return reserved.has(valid) ? `${valid}_` : valid;
};
const quote = (name: string) => JSON.stringify(name);

function generateCode(value: unknown, root: string, target: Target): string {
  if (target === 'typescript') return JsonToTS(value, { rootName: root }).join('\n\n');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The root JSON value must be an object.');

  const definitions = new Map<string, Record<string, unknown>>();
  const collect = (name: string, item: Record<string, unknown>) => {
    const className = pascal(name);
    if (definitions.has(className)) return;
    definitions.set(className, item);
    for (const [key, field] of Object.entries(item)) {
      if (field && typeof field === 'object' && !Array.isArray(field)) collect(pascal(key), field as Record<string, unknown>);
      if (Array.isArray(field)) {
        const nested = field.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
        if (nested) collect(`${pascal(key)}Item`, nested as Record<string, unknown>);
      }
    }
  };
  collect(root, value as Record<string, unknown>);

  const typeOf = (item: unknown, name: string): string => {
    if (item === null) return target === 'rust' ? 'Option<serde_json::Value>' : target === 'typescript' ? 'unknown' : 'Any';
    if (Array.isArray(item)) {
      if (!item.length) return target === 'rust' ? 'Vec<serde_json::Value>' : target === 'go' ? '[]any' : target === 'dart' ? 'List<dynamic>' : 'List[Any]';
      const sample = item[0];
      if (sample && typeof sample === 'object') return target === 'rust' ? `Vec<${pascal(`${name}Item`)}>` : target === 'go' ? `[]${pascal(`${name}Item`)}` : target === 'dart' ? `List<${pascal(`${name}Item`)}>` : `List[${pascal(`${name}Item`)}]`;
      const scalar = typeOf(sample, name);
      return target === 'rust' ? `Vec<${scalar}>` : target === 'go' ? `[]${scalar}` : target === 'dart' ? `List<${scalar}>` : `List[${scalar}]`;
    }
    if (item && typeof item === 'object') return pascal(name);
    if (typeof item === 'string') return target === 'go' ? 'string' : target === 'dart' ? 'String' : target === 'rust' ? 'String' : target === 'typescript' || target === 'zod' ? 'string' : 'str';
    if (typeof item === 'boolean') return target === 'go' ? 'bool' : target === 'dart' ? 'bool' : target === 'rust' ? 'bool' : target === 'typescript' || target === 'zod' ? 'boolean' : 'bool';
    if (typeof item === 'number') return target === 'go' ? (Number.isInteger(item) ? 'int64' : 'float64') : target === 'dart' ? (Number.isInteger(item) ? 'int' : 'double') : target === 'rust' ? (Number.isInteger(item) ? 'i64' : 'f64') : target === 'typescript' || target === 'zod' ? 'number' : (target === 'python' || target === 'pydantic') ? (Number.isInteger(item) ? 'int' : 'float') : 'number';
    return 'Any';
  };

  if (target === 'zod') {
    const schemaFor = (item: unknown, name: string): string => {
      if (item === null) return 'z.null()';
      if (Array.isArray(item)) return item.length ? `z.array(${schemaFor(item[0], name)})` : 'z.array(z.unknown())';
      if (item && typeof item === 'object') return `z.object({ ${Object.entries(item).map(([key, child]) => `${quote(key)}: ${schemaFor(child, key)}`).join(', ')} })`;
      if (typeof item === 'string') return 'z.string()';
      if (typeof item === 'number') return 'z.number()';
      if (typeof item === 'boolean') return 'z.boolean()';
      return 'z.unknown()';
    };
    return `import { z } from 'zod';\n\nexport const ${pascal(root)}Schema = ${schemaFor(value, root)};\nexport type ${pascal(root)} = z.infer<typeof ${pascal(root)}Schema>;`;
  }

  const render = (name: string, fields: Record<string, unknown>): string => {
    const className = pascal(name);
    const entries = Object.entries(fields);
    if (target === 'go') return `type ${className} struct {\n${entries.map(([key, item]) => `  ${pascal(key)} ${typeOf(item, key)} \`json:${quote(key)}\``).join('\n')}\n}`;
    if (target === 'rust') return `#[derive(Debug, serde::Serialize, serde::Deserialize)]\npub struct ${className} {\n${entries.map(([key, item]) => `    #[serde(rename = ${quote(key)})]\n    pub ${snake(key)}: ${typeOf(item, key)},`).join('\n')}\n}`;
    if (target === 'dart') return `class ${className} {\n${entries.map(([key, item]) => `  final ${typeOf(item, key)} ${snake(key)};`).join('\n')}\n\n  ${className}({${entries.map(([key]) => `required this.${snake(key)}`).join(', ')}});\n}`;
    const isPydantic = target === 'pydantic';
    const pythonFields = entries.map(([key, item]) => {
      const fieldType = typeOf(item, key);
      const fieldName = snake(key);
      const alias = fieldName !== key ? ` = Field(alias=${quote(key)})` : '';
      return `    ${fieldName}: ${fieldType}${alias}`;
    }).join('\n');
    const pythonClass = isPydantic ? `class ${className}(BaseModel):\n${pythonFields || '    pass'}` : `@dataclass\nclass ${className}:\n${pythonFields || '    pass'}`;
    if (target === 'python' || isPydantic) {
      const imports = isPydantic ? 'from typing import Any, List\nfrom pydantic import BaseModel, Field' : 'from dataclasses import dataclass\nfrom typing import Any, List';
      return `${imports}\n\n${Array.from(definitions.entries()).map(([modelName, model]) => modelName === className ? pythonClass : (isPydantic ? `class ${modelName}(BaseModel):\n${Object.entries(model).map(([key, item]) => `    ${snake(key)}: ${typeOf(item, key)}${snake(key) !== key ? ` = Field(alias=${quote(key)})` : ''}`).join('\n') || '    pass'}` : `@dataclass\nclass ${modelName}:\n${Object.entries(model).map(([key, item]) => `    ${snake(key)}: ${typeOf(item, key)}`).join('\n') || '    pass'}`)).join('\n\n')}`;
    }
    return '';
  };

  return Array.from(definitions.entries()).reverse().map(([name, fields]) => render(name, fields)).join('\n\n');
}

export default function JsonToCodePanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [target, setTarget] = useState<Target>(tool.id === 'tool-json-to-dart' ? 'dart' : 'typescript');
  const [rootName, setRootName] = useState('RootModel');
  const [error, setError] = useState('');
  const debouncedInput = useDebouncedValue(input);
  const generate = (source = input) => {
    try { setOutput(generateCode(JSON.parse(source), rootName || 'RootModel', target)); setError(''); }
    catch (cause) { setOutput(''); setError(cause instanceof Error ? cause.message : 'Could not generate code.'); }
  };
  useEffect(() => {
    if (input !== debouncedInput || !debouncedInput.trim()) { setOutput(''); setError(''); return; }
    generate(debouncedInput);
  }, [input, debouncedInput, rootName, target]);

  const language: 'typescript' | 'text' = target === 'zod' || target === 'typescript' ? 'typescript' : 'text';
  return <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
      <label className="text-xs text-muted-foreground">Root name <input className="input-code ml-1 py-1 px-2 text-xs w-32" value={rootName} onChange={(event) => setRootName(event.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Language <select className="select-input ml-1" value={target} onChange={(event) => setTarget(event.target.value as Target)}>
        <option value="typescript">TypeScript</option><option value="go">Go</option><option value="python">Python dataclass</option><option value="pydantic">Python Pydantic</option><option value="rust">Rust</option><option value="zod">Zod</option><option value="dart">Dart</option>
      </select></label>
      <button className="btn-primary text-xs ml-auto" onClick={() => generate()}>Generate</button>
    </div>
    <div className="flex-1 min-h-0 p-4"><PanelLayout inputPanel={<CodeEditor value={input} onChange={setInput} minHeight="100%" placeholder="Paste a JSON object…" />} outputPanel={<CodeOutput value={output} language={language} placeholder="Generated types appear here…" />} outputText={output} outputStatus={error ? 'error' : output ? 'success' : 'idle'} errorMessage={error} onClear={() => { setInput(''); setOutput(''); setError(''); }} /></div>
  </div>;
}
