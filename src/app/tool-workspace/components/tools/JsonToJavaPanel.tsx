'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import PanelLayout from '../PanelLayout';
import CodeEditor from '../CodeEditor';

const SAMPLE = `{
  "user": {
    "id": "usr-12345",
    "name": "Sophea Chan",
    "email": "sophea@devtoolkit.io",
    "age": 30,
    "active": true,
    "roles": ["admin", "editor"],
    "profile": {
      "bio": "Developer",
      "followers": 1024
    }
  }
}`;

type Lang = 'java' | 'kotlin' | 'csharp';

function toPascal(str: string) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

function sanitizeIdentifier(name: string) {
  if (!name) return 'Field';
  const s = name.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(s)) return `_${s}`;
  return s;
}

function inferType(value: any) {
  if (value === null) return { kind: 'any' } as const;
  if (Array.isArray(value)) return { kind: 'array', items: value } as const;
  const t = typeof value;
  if (t === 'string') return { kind: 'string' } as const;
  if (t === 'number') return { kind: Number.isInteger(value) ? 'int' : 'double' } as const;
  if (t === 'boolean') return { kind: 'boolean' } as const;
  if (t === 'object') return { kind: 'object', value } as const;
  return { kind: 'any' } as const;
}

export default function JsonToJavaPanel({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [lang, setLang] = useState<Lang>('java');
  const [rootName, setRootName] = useState('RootModel');
  const [error, setError] = useState('');

  const generate = () => {
    setError('');
    try {
      const parsed = JSON.parse(input);
      const models = new Map<string, string>();

      function gen(name: string, value: any) {
        const className = toPascal(name || 'Model');
        if (models.has(className)) return className;

        if (Array.isArray(value)) {
          if (value.length === 0) return 'Object';
          return gen(name, value[0]);
        }

        if (typeof value !== 'object' || value === null) {
          // primitive
          return mapType(lang, inferType(value));
        }

        // object
        const entries = Object.entries(value);
        const fields: string[] = [];
        for (const [k, v] of entries) {
          const id = sanitizeIdentifier(k);
          const t = inferType(v);
          if (t.kind === 'object') {
            const childName = toPascal(k);
            const childClass = gen(childName, t.value);
            fields.push(renderField(lang, id, childClass, k));
          } else if (t.kind === 'array') {
            // determine array item type
            let itemType = 'Object';
            if (t.items.length > 0) {
              const first = t.items[0];
              const it = inferType(first);
              if (it.kind === 'object') {
                const childName = toPascal(k + 'Item');
                itemType = gen(childName, first);
              } else {
                itemType = mapType(lang, it);
              }
            }
            fields.push(renderArrayField(lang, id, itemType, k));
          } else {
            fields.push(renderField(lang, id, mapType(lang, t), k));
          }
        }

        const code = renderClass(lang, className, fields);
        models.set(className, code);
        return className;
      }

      // start generation
      gen(rootName, parsed);

      // join models in reverse insertion order so dependencies appear first
      const result = Array.from(models.values()).reverse().join('\n\n');
      setOutput(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
      setOutput('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/30 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Root name</label>
          <input type="text" value={rootName} onChange={(e) => setRootName(e.target.value)} className="input-code py-1 px-2 text-xs w-36" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground">Language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="select-input text-xs">
            <option value="java">Java</option>
            <option value="kotlin">Kotlin</option>
            <option value="csharp">C#</option>
          </select>
        </div>
        <div className="ml-auto">
          <button className="btn-primary text-xs" onClick={generate}>Generate Models</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <PanelLayout
          inputPanel={<CodeEditor value={input} onChange={setInput} placeholder='Paste JSON here… {"key": "value"}' minHeight="100%" />}
          outputPanel={<CodeEditor value={output} onChange={() => {}} readOnly placeholder="Generated models appear here…" minHeight="100%" className="text-sky-300" />}
          outputText={output}
          outputStatus={error ? 'error' : output ? 'success' : 'idle'}
          errorMessage={error}
          onClear={() => { setInput(''); setOutput(''); setError(''); }}
        />
      </div>
    </div>
  );
}

function mapType(lang: Lang, t: any): string {
  if (t.kind === 'string') return lang === 'kotlin' ? 'String' : lang === 'csharp' ? 'string' : 'String';
  if (t.kind === 'int') return lang === 'kotlin' ? 'Int' : lang === 'csharp' ? 'int' : 'int';
  if (t.kind === 'double') return lang === 'kotlin' ? 'Double' : lang === 'csharp' ? 'double' : 'double';
  if (t.kind === 'boolean') return lang === 'kotlin' ? 'Boolean' : lang === 'csharp' ? 'bool' : 'boolean';
  return lang === 'kotlin' ? 'Any' : lang === 'csharp' ? 'object' : 'Object';
}

function renderField(lang: Lang, id: string, typeName: string, originalKey?: string) {
  const propName = lang === 'csharp' ? toPascal(id) : id;
  if (lang === 'java') return `  public ${typeName} ${id};`;
  if (lang === 'kotlin') return `  val ${id}: ${typeName}? = null`;
  if (lang === 'csharp') return `  public ${typeName} ${propName} { get; set; }`;
  return '';
}

function renderArrayField(lang: Lang, id: string, itemType: string, originalKey?: string) {
  if (lang === 'java') return `  public java.util.List<${itemType}> ${id};`;
  if (lang === 'kotlin') return `  val ${id}: List<${itemType}>? = null`;
  if (lang === 'csharp') return `  public List<${itemType}> ${toPascal(id)} { get; set; }`;
  return '';
}

function renderClass(lang: Lang, className: string, fields: string[]) {
  if (lang === 'java') {
    return `public class ${className} {\n${fields.join('\n')}\n}`;
  }
  if (lang === 'kotlin') {
    return `data class ${className}(\n${fields.join(',\n')}\n)`;
  }
  if (lang === 'csharp') {
    return `public class ${className} {\n${fields.join('\n')}\n}`;
  }
  return '';
}
