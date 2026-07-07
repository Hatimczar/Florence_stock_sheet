'use client';

import { useMemo, useState } from 'react';
import { Download, Search, AlertTriangle } from 'lucide-react';
import { MergeResult, MergedRow } from '@/lib/merge';
import { downloadMergedCSV } from '@/lib/export';
import { Card, SectionHeader, Badge, StatCard } from './ui';

type SortKey = 'partNumber' | 'stock' | 'price';

export function MergedTable({ result }: { result: MergeResult }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('partNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let rows = result.rows;
    if (q) {
      rows = rows.filter((r) => r.partNumber.includes(q) || r.description.toUpperCase().includes(q));
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'partNumber') cmp = a.partNumber.localeCompare(b.partNumber);
      else if (sortKey === 'stock') cmp = (a.stock ?? -1) - (b.stock ?? -1);
      else cmp = (a.price ?? -1) - (b.price ?? -1);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [result.rows, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const statusBadge = (row: MergedRow) => {
    if (row.status === 'matched') return <Badge tone="profit">Matched</Badge>;
    if (row.status === 'missing-stock') return <Badge tone="warn">No Stock Data</Badge>;
    return <Badge tone="warn">No Price Data</Badge>;
  };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeader step="③" title="Merged View" subtitle={`${result.rows.length} unique part numbers`} />
        <button
          onClick={() => downloadMergedCSV(`florence-stock-sheet-${new Date().toISOString().slice(0, 10)}.csv`, result.rows)}
          disabled={result.rows.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Parts" value={String(result.rows.length)} />
        <StatCard label="Matched" value={String(result.totalMatched)} tone="profit" />
        <StatCard label="Missing Stock" value={String(result.totalMissingStock)} tone="warn" />
        <StatCard label="Missing Price" value={String(result.totalMissingPrice)} tone="warn" />
      </div>

      {result.duplicatePartNumbers.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-bg p-3 text-xs text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {result.duplicatePartNumbers.length} part number{result.duplicatePartNumbers.length === 1 ? '' : 's'} appeared more than once in a list
            (stock quantities were summed; price used the last row found): {result.duplicatePartNumbers.slice(0, 8).join(', ')}
            {result.duplicatePartNumbers.length > 8 ? ', …' : ''}
          </span>
        </div>
      )}

      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search part number or description…"
          className="w-full rounded-lg border border-border bg-surface-muted py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-surface-muted">
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort('partNumber')}>
                Part Number {sortKey === 'partNumber' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-3 py-2">Description</th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort('stock')}>
                Stock {sortKey === 'stock' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="cursor-pointer select-none px-3 py-2" onClick={() => toggleSort('price')}>
                Price {sortKey === 'price' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  {result.rows.length === 0 ? 'Upload both lists to see the merged view.' : 'No matches for this search.'}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.partNumber} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{row.partNumber}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-muted">{row.description || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{row.stock === null ? '—' : row.stock}</td>
                  <td className="px-3 py-2 tabular-nums">{row.price === null ? '—' : row.price.toFixed(2)}</td>
                  <td className="px-3 py-2">{statusBadge(row)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
