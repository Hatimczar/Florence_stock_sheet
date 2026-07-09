'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CatalogItem } from '@/lib/catalog';
import { fetchAdminCatalog, syncCatalogApi } from '@/lib/catalogApi';
import { Card, SectionHeader, StatCard, SelectInput, Badge } from '@/components/ui';
import { AdminGate } from '@/components/AdminGate';
import { AdminShell } from '@/components/AdminShell';

const AVAIL_LABEL: Record<string, string> = { yes: 'Available', 'on demand': 'On Demand', limited: 'Limited' };
const AVAIL_TONE: Record<string, 'profit' | 'warn' | 'loss'> = { yes: 'profit', 'on demand': 'warn', limited: 'loss' };

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

  const load = async () => {
    const data = await fetchAdminCatalog();
    setItems(data.items);
    setSyncedAt(data.syncedAt);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
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

  return (
    <AdminShell
      active="catalog"
      title="Vendor Catalog"
      toolbarActions={
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-md-a bg-accent px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync from IT4Profit'}</span>
        </button>
      }
    >
      <p className="mb-4 text-xs text-muted">
        {syncedAt ? `Synced from IT4Profit ${new Date(syncedAt).toLocaleString()}` : 'Not synced yet'}
      </p>

      {error && <p className="mb-3 text-xs text-loss">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No catalog synced yet. Click <strong>Sync from IT4Profit</strong> to fetch brands, categories, availability, and
            pricing from the vendor feed.
          </p>
        </Card>
      ) : (
        <Card>
          <SectionHeader
            title="Merged Vendor Catalog"
            subtitle="WIC, description, brand, category, both prices, and availability — pulled directly from IT4Profit"
          />

          <div className="mb-4 flex flex-wrap gap-2">
            <SelectInput
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
              className="w-auto min-w-[10rem]"
            />
            <SelectInput
              value={availFilter}
              onValueChange={setAvailFilter}
              options={[
                { value: 'all', label: 'All Availability' },
                { value: 'yes', label: 'Available' },
                { value: 'on demand', label: 'On Demand' },
                { value: 'limited', label: 'Limited' },
              ]}
              className="w-auto min-w-[10rem]"
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Parts" value={String(filtered.length)} />
            <StatCard label="Available" value={String(counts.yes)} tone="profit" />
            <StatCard label="On Demand" value={String(counts['on demand'])} tone="warn" />
            <StatCard label="Limited" value={String(counts.limited)} tone="loss" />
          </div>

          <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-surface-muted">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Part Number</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Retail Price</th>
                  <th className="px-3 py-2 text-right">My Price</th>
                  <th className="px-3 py-2">Availability</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      No parts match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.wic} className="border-t border-border/60">
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-medium">{item.wic}</td>
                      <td className="max-w-[280px] truncate px-3 py-2 text-muted">{item.description || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">{item.vendor}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">{item.group}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-accent">
                        {item.retailPrice !== null ? item.retailPrice.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-accent">
                        {item.myPrice !== null ? item.myPrice.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={AVAIL_TONE[item.avail] ?? 'neutral'}>{AVAIL_LABEL[item.avail] ?? (item.avail || '—')}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
