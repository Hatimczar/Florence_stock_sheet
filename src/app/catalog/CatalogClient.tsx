'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CatalogItem } from '@/lib/catalog';
import { fetchAdminCatalog, syncCatalogApi } from '@/lib/catalogApi';
import { guessStockColumn, ParsedFile } from '@/lib/parseFile';
import { mergeStockAndPrice, ListMapping } from '@/lib/merge';
import { fetchList, uploadList, updateListMapping, clearList, updateStockItem, StoredList } from '@/lib/api';
import { AdminGate } from '@/components/AdminGate';
import { AdminShell } from '@/components/AdminShell';
import { ProductThumb } from '@/components/ProductThumb';
import { UploadCard } from '@/components/UploadCard';
import { MergedTable } from '@/components/MergedTable';

const AVAIL_LABEL: Record<string, string> = { yes: 'Available', 'on demand': 'On Demand', limited: 'Limited' };
const AVAIL_CLASS: Record<string, string> = { yes: 'pill-green', 'on demand': 'pill-orange', limited: 'pill-red' };

export default function CatalogClient() {
  return (
    <AdminGate>
      <CatalogContent />
    </AdminGate>
  );
}

function CatalogContent() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');
  const [oaStock, setOaStock] = useState<StoredList | null>(null);

  const load = async () => {
    const data = await fetchAdminCatalog();
    setItems(data.items);
    setSyncedAt(data.syncedAt);
  };

  useEffect(() => {
    Promise.all([load(), fetchList('stock-origin-acoustics').then(setOaStock)]).finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncCatalogApi();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.group).filter(Boolean))).sort(), [items]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) => (categoryFilter === 'all' || i.group === categoryFilter) && (availFilter === 'all' || i.avail === availFilter)
      ),
    [items, categoryFilter, availFilter]
  );

  const counts = useMemo(() => {
    const c = { yes: 0, 'on demand': 0, limited: 0 };
    filtered.forEach((i) => {
      if (i.avail in c) c[i.avail as keyof typeof c]++;
    });
    return c;
  }, [filtered]);

  const oaMergeResult = useMemo(() => {
    if (!oaStock) {
      return { rows: [], totalMatched: 0, totalMissingStock: 0, totalMissingPrice: 0, duplicatePartNumbers: [] };
    }
    return mergeStockAndPrice(oaStock.file.rows, oaStock.mapping, [], oaStock.mapping);
  }, [oaStock]);

  const handleOaStockParsed = async (file: ParsedFile, mapping: ListMapping) => {
    setOaStock(await uploadList('stock-origin-acoustics', file, mapping));
  };
  const handleOaStockMappingChange = async (mapping: Partial<ListMapping>) => {
    setOaStock(await updateListMapping('stock-origin-acoustics', mapping));
  };
  const handleClearOaStock = async () => {
    await clearList('stock-origin-acoustics');
    setOaStock(null);
  };
  const handleUpdateOaStock = async (partNumber: string, newStock: number) => {
    setOaStock(await updateStockItem(partNumber, newStock, 'stock-origin-acoustics'));
  };

  return (
    <AdminShell
      active="catalog"
      title="Asbis Brands"
      toolbarActions={
        <button onClick={handleSync} disabled={syncing} className="toolbar-btn primary">
          <RefreshCw style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {syncing ? 'Syncing…' : 'Sync from IT4Profit'}
        </button>
      }
    >
      <div className="section-header">Origin Acoustics · Stock Only (No Pricing)</div>
      <UploadCard
        step="①"
        title="Stock List"
        valueLabel="Stock Quantity"
        valueGuess={guessStockColumn}
        listState={oaStock}
        onFileParsed={handleOaStockParsed}
        onMappingChange={handleOaStockMappingChange}
        onClear={handleClearOaStock}
      />
      <MergedTable result={oaMergeResult} onUpdateStock={handleUpdateOaStock} hasPricing={false} step="②" />

      <div className="section-header" style={{ marginTop: 32 }}>
        IT4Profit Vendor Feed
      </div>
      <p style={{ marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>
        {syncedAt ? `Synced from IT4Profit ${new Date(syncedAt).toLocaleString()}` : 'Not synced yet'}
      </p>

      {error && <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            No catalog synced yet. Click <strong>Sync from IT4Profit</strong> to fetch brands, categories, availability, and
            pricing from the vendor feed.
          </p>
        </div>
      ) : (
        <>
          <div className="section-header">Merged Asbis Brands Catalog · WIC, description, brand, category, both prices, availability</div>

          <div className="filter-bar">
            <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="filter-select" value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
              <option value="all">All Availability</option>
              <option value="yes">Available</option>
              <option value="on demand">On Demand</option>
              <option value="limited">Limited</option>
            </select>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="k">Total Parts</div>
              <div className="v">{filtered.length}</div>
            </div>
            <div className="stat tone-green">
              <div className="k">Available</div>
              <div className="v">{counts.yes}</div>
            </div>
            <div className="stat tone-orange">
              <div className="k">On Demand</div>
              <div className="v">{counts['on demand']}</div>
            </div>
            <div className="stat tone-red">
              <div className="k">Limited</div>
              <div className="v">{counts.limited}</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-scroll">
              <table className="apple-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}></th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th className="num">Retail Price (USD)</th>
                    <th className="num">Cost (USD)</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                        No parts match these filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.wic}>
                        <td>
                          <ProductThumb src={item.image} size={32} radius={6} />
                        </td>
                        <td className="mono">{item.wic}</td>
                        <td className="desc-cell">{item.description || '—'}</td>
                        <td>{item.vendor}</td>
                        <td>{item.group}</td>
                        <td className="num mono price-cell">{item.retailPrice !== null ? `$${item.retailPrice.toFixed(2)}` : '—'}</td>
                        <td className="num mono price-cell">{item.myPrice !== null ? `$${item.myPrice.toFixed(2)}` : '—'}</td>
                        <td>
                          <span className={`pill ${AVAIL_CLASS[item.avail] ?? ''}`}>{AVAIL_LABEL[item.avail] ?? (item.avail || '—')}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
