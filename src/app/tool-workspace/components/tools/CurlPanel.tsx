'use client';
import React, { useState } from 'react';
import { Tool } from '@/data/tools';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface FormValues {
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: string;
  authType: 'none' | 'bearer' | 'basic' | 'apikey';
  authValue: string;
  authUser: string;
  authPassword: string;
  apiKeyHeader: string;
  followRedirects: boolean;
  verbose: boolean;
}

export default function CurlPanel({ tool }: { tool: Tool }) {
  const [output, setCurl] = useState('');

  const { register, control, watch, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      method: 'GET',
      url: 'https://api.devtoolkit.io/v1/tools',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true },
      ],
      body: '',
      authType: 'bearer',
      authValue: 'your-token-here',
      authUser: '',
      authPassword: '',
      apiKeyHeader: 'X-API-Key',
      followRedirects: true,
      verbose: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'headers' });
  const authType = watch('authType');
  const method = watch('method');

  const generate = (data: FormValues) => {
    const parts: string[] = ['curl'];
    if (data.verbose) parts.push('-v');
    if (data.followRedirects) parts.push('-L');
    parts.push(`-X ${data.method}`);

    // Auth
    if (data.authType === 'bearer') {
      parts.push(`-H "Authorization: Bearer ${data.authValue}"`);
    } else if (data.authType === 'basic') {
      parts.push(`-u "${data.authUser}:${data.authPassword}"`);
    } else if (data.authType === 'apikey') {
      parts.push(`-H "${data.apiKeyHeader}: ${data.authValue}"`);
    }

    // Headers
    data.headers.filter((h) => h.enabled && h.key).forEach((h) => {
      parts.push(`-H "${h.key}: ${h.value}"`);
    });

    // Body
    if (data.body && ['POST', 'PUT', 'PATCH'].includes(data.method)) {
      parts.push(`-d '${data.body}'`);
    }

    parts.push(`"${data.url}"`);

    setCurl(parts.join(' \\\n  '));
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success('cURL command copied');
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(generate)} className="flex flex-col gap-4">
          {/* Method + URL */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex gap-2">
              <select className="select-input w-28 flex-shrink-0" {...register('method')}>
                {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as HttpMethod[]).map((m) => (
                  <option key={`method-${m}`} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                {...register('url')}
                className="input-code flex-1 py-2"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>

          {/* Auth */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Authentication</h4>
            <div className="flex items-center gap-3 mb-3">
              <select className="select-input" {...register('authType')}>
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </select>
            </div>
            {authType === 'bearer' && (
              <input type="text" {...register('authValue')} className="input-code w-full py-2" placeholder="Bearer token value" />
            )}
            {authType === 'basic' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" {...register('authUser')} className="input-code py-2" placeholder="Username" />
                <input type="password" {...register('authPassword')} className="input-code py-2" placeholder="Password" />
              </div>
            )}
            {authType === 'apikey' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" {...register('apiKeyHeader')} className="input-code py-2" placeholder="Header name" />
                <input type="text" {...register('authValue')} className="input-code py-2" placeholder="API key value" />
              </div>
            )}
          </div>

          {/* Headers */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headers</h4>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => append({ key: '', value: '', enabled: true })}
              >
                <Plus size={12} />
                Add Header
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input type="checkbox" {...register(`headers.${i}.enabled`)} className="w-3.5 h-3.5 accent-primary flex-shrink-0" />
                  <input type="text" {...register(`headers.${i}.key`)} className="input-code flex-1 py-1.5 text-xs" placeholder="Header name" />
                  <input type="text" {...register(`headers.${i}.value`)} className="input-code flex-1 py-1.5 text-xs" placeholder="Value" />
                  <button type="button" className="btn-icon flex-shrink-0" onClick={() => remove(i)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Body</h4>
              <textarea
                {...register('body')}
                className="input-code w-full"
                rows={5}
                placeholder='{"key": "value"}'
                spellCheck={false}
              />
            </div>
          )}

          {/* Options */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('followRedirects')} className="w-3.5 h-3.5 accent-primary" />
                <span className="text-xs text-muted-foreground">Follow redirects (-L)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('verbose')} className="w-3.5 h-3.5 accent-primary" />
                <span className="text-xs text-muted-foreground">Verbose output (-v)</span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary w-fit">Generate cURL Command</button>
        </form>

        {/* Output */}
        {output && (
          <div className="mt-4 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">cURL Command</span>
              <button className="btn-icon" onClick={copy}>
                <Copy size={13} />
              </button>
            </div>
            <pre className="output-code text-xs rounded-lg p-3 text-emerald-300 whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}