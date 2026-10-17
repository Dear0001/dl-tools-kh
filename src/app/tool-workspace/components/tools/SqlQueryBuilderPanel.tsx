'use client';

import { useMemo, useState } from 'react';
import { Copy, Database, Play, Trash2 } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import { toast } from 'sonner';
import type { Tool } from '@/data/tools';

type Operation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export default function SqlQueryBuilderPanel({ tool: _tool }: { tool: Tool }) {
  const [operation, setOperation] = useState<Operation>('SELECT');
  const [table, setTable] = useState('users');
  const [columns, setColumns] = useState('*');
  const [values, setValues] = useState("'Ada Lovelace', 'ada@example.com'");
  const [assignments, setAssignments] = useState("name = 'Ada Lovelace'");
  const [condition, setCondition] = useState('id = 1');
  const [limit, setLimit] = useState('100');

  const query = useMemo(() => {
    const target = table.trim() || 'table_name';
    const selected = columns.trim() || '*';
    let sql = '';
    if (operation === 'SELECT') sql = `SELECT ${selected}\nFROM ${target}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''}${limit.trim() ? `\nLIMIT ${limit.trim()}` : ''};`;
    if (operation === 'INSERT') sql = `INSERT INTO ${target} (${selected === '*' ? 'column_1, column_2' : selected})\nVALUES (${values.trim() || 'value_1, value_2'});`;
    if (operation === 'UPDATE') sql = `UPDATE ${target}\nSET ${assignments.trim() || 'column_name = value'}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''};`;
    if (operation === 'DELETE') sql = `DELETE FROM ${target}${condition.trim() ? `\nWHERE ${condition.trim()}` : ''};`;
    try { return formatSql(sql, { language: 'sql' }); } catch { return sql; }
  }, [operation, table, columns, values, assignments, condition, limit]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      toast.success('SQL query copied');
    } catch {
      toast.error('Could not copy SQL query');
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto grid min-h-full max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="SQL query options">
          <div className="flex items-center gap-3"><div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary"><Database size={20} /></div><div><h2 className="text-lg font-semibold text-foreground">Build a SQL query</h2><p className="text-sm text-muted-foreground">Choose an operation and fill in its fields.</p></div></div>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Operation</span><select className="select-input w-full" value={operation} onChange={(event) => setOperation(event.target.value as Operation)}><option>SELECT</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option></select></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Table</span><input className="input-field w-full" value={table} onChange={(event) => setTable(event.target.value)} placeholder="table_name" /></label>
          {!['DELETE', 'UPDATE'].includes(operation) && <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Columns</span><input className="input-field w-full" value={columns} onChange={(event) => setColumns(event.target.value)} placeholder="id, name, email" /><span className="text-xs text-muted-foreground">Separate multiple column names with commas.</span></label>}
          {operation === 'INSERT' && <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Values</span><input className="input-field w-full" value={values} onChange={(event) => setValues(event.target.value)} placeholder="value_1, value_2" /></label>}
          {operation === 'UPDATE' && <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Assignments</span><textarea className="input-code min-h-20 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm" value={assignments} onChange={(event) => setAssignments(event.target.value)} placeholder="status = 'active'" /></label>}
          {operation !== 'INSERT' && <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">WHERE condition <span className="font-normal text-muted-foreground">(optional)</span></span><input className="input-field w-full" value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="id = 1" /></label>}
          {operation === 'SELECT' && <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">LIMIT <span className="font-normal text-muted-foreground">(optional)</span></span><input type="number" min="1" className="input-field w-full" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="100" /></label>}
        </section>
        <section className="flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card" aria-label="Generated SQL query">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-foreground">Generated SQL</h2><div className="flex gap-2"><button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-xs" onClick={() => { setTable(''); setColumns('*'); setCondition(''); setValues(''); setAssignments(''); setLimit(''); }}><Trash2 size={14} />Clear</button><button type="button" className="btn-primary inline-flex items-center gap-1.5 text-xs" onClick={copy}><Copy size={14} />Copy SQL</button></div></div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-sm leading-6 text-foreground"><code>{query}</code></pre>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">This builder creates SQL text only. Review identifiers, values, and conditions before running it in your database.</p>
        </section>
      </div>
    </div>
  );
}
