'use client';

import { useMemo, useState } from 'react';
import { Download, Search, AlertTriangle, ListRestart, Pencil, Check, X } from 'lucide-react';
import { MergeResult, MergedRow } from '@/lib/merge';
import { downloadMergedCSV } from '@/lib/export';

type SortKey = 'fileOrder' | 'partNumber' | 'stock' | 'price';

export function MergedTable({
  result,
  onUpdateStock,
}: {
  result: MergeResult;
  onUpdateStock?: (partNumber: string, newStock: number) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fileOrder');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingPartNumber, setEditingPartNumber] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let rows = result.rows;
    if (q) {
      rows = rows.filter(
        (r) => r.partNumber.includes(q) || r.description.toUpperCase().includes(q) || r.category.toUpperCase().includes(q)
      );
    }
    if (sortKey === 'fileOrder') return rows;
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'partNumber') cmp = a.partNumber.localeCompare(b.partNumber);
      else if (sortKey === 'stock') cmp = (a.stock ?? -1) - (b.stock ?? -1);
      else cmp = (a.price ?? -1) - (b.price ?? -1);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [result.rows, search, sortKey, sortDir]);

  const toggleSort = (key: Exclude<SortKey, 'fileOrder'>) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const statusBadge = (row: MergedRow) => {
    if (row.status === 'matched') return <span className="pill pill-green">Matched</span>;
    if (row.status === 'missing-stock') return <span className="pill pill-orange">No Stock Data</span>;
    return <span className="pill pill-orange">No Price Data</span>;
  };

  const startEdit = (row: MergedRow) => {
    setEditingPartNumber(row.partNumber);
    setEditValue(String(row.stock ?? 0));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingPartNumber(null);
    setEditError(null);
  };

  const saveEdit = async (partNumber: string) => {
    const parsed = Number(editValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditError('Enter a valid stock quantity.');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await onUpdateStock?.(partNumber, parsed);
      setEditingPartNumber(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not update stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span>③ Merged View · {result.rows.length} Unique Part Numbers</span>
        <button
          onClick={() => downloadMergedCSV(`florence-stock-sheet-${new Date().toISOString().slice(0, 10)}.csv`, result.rows)}
          disabled={result.rows.length === 0}
          className="toolbar-btn primary"
          style={{ textTransform: 'none', letterSpacing: 0 }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="k">Total Parts</div>
          <div className="v">{result.rows.length}</div>
        </div>
        <div className="stat tone-green">
          <div className="k">Matched</div>
          <div className="v">{result.totalMatched}</div>
        </div>
        <div className="stat tone-orange">
          <div className="k">Missing Stock</div>
          <div className="v">{result.totalMissingStock}</div>
        </div>
        <div className="stat tone-orange">
          <div className="k">Missing Price</div>
          <div className="v">{result.totalMissingPrice}</div>
        </div>
      </div>

      {result.duplicatePartNumbers.length > 0 && (
        <div
          className="pill pill-orange"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', marginBottom: 16, borderRadius: 'var(--r-md)', whiteSpace: 'normal' }}
        >
          <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            {result.duplicatePartNumbers.length} part number{result.duplicatePartNumbers.length === 1 ? '' : 's'} appeared more than
            once in a list (stock quantities were summed; price used the last row found):{' '}
            {result.duplicatePartNumbers.slice(0, 8).join(', ')}
            {result.duplicatePartNumbers.length > 8 ? ', …' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="search-field" style={{ flex: 1 }}>
          <Search />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search part number or description…" />
        </div>
        {sortKey !== 'fileOrder' && (
          <button className="toolbar-btn" onClick={() => setSortKey('fileOrder')} style={{ marginBottom: 16 }}>
            <ListRestart size={13} /> Stock File Order
          </button>
        )}
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="apple-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('partNumber')}>
                  Part Number {sortKey === 'partNumber' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th>Description</th>
                <th>Category</th>
                <th className="num" style={{ cursor: 'pointer' }} onClick={() => toggleSort('stock')}>
                  Stock {sortKey === 'stock' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="num" style={{ cursor: 'pointer' }} onClick={() => toggleSort('price')}>
                  Price {sortKey === 'price' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                    {result.rows.length === 0 ? 'Upload both lists to see the merged view.' : 'No matches for this search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.partNumber}>
                    <td className="mono">{row.partNumber}</td>
                    <td className="desc-cell">{row.description || '—'}</td>
                    <td>{row.category}</td>
                    <td className="num mono stock-cell">
                      {editingPartNumber === row.partNumber ? (
                        <span className="stock-edit">
                          <input
                            type="number"
                            min={0}
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(row.partNumber);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            disabled={saving}
                            style={{
                              width: 56,
                              borderRadius: 6,
                              border: '1px solid var(--accent)',
                              background: 'var(--background)',
                              color: 'var(--foreground)',
                              padding: '2px 6px',
                              font: 'inherit',
                            }}
                          />
                          <button onClick={() => saveEdit(row.partNumber)} disabled={saving} title="Save">
                            <Check />
                          </button>
                          <button onClick={cancelEdit} disabled={saving} title="Cancel">
                            <X />
                          </button>
                          {editError && (
                            <span style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--loss)' }}>{editError}</span>
                          )}
                        </span>
                      ) : (
                        <span className="stock-edit">
                          {row.stock === null ? '—' : row.stock}
                          {onUpdateStock && (
                            <button onClick={() => startEdit(row)} title="Edit stock">
                              <Pencil />
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="num mono price-cell">{row.price === null ? '—' : row.price.toFixed(2)}</td>
                    <td>{statusBadge(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
