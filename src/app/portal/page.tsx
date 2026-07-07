'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { LogOut, Search, PackageSearch, RefreshCw, MessageCircle } from 'lucide-react';
import { Card, SectionHeader, StatCard, Badge } from '@/components/ui';
import { PortalAuthForm } from '@/components/PortalAuthForm';

interface CustomerInfo {
  name: string;
  email: string;
  companyName: string;
}

interface LookupResult {
  partNumber: string;
  description: string;
  category: string;
  stock: number;
  price: number;
}

const WHATSAPP_NUMBER = '971525348090';

export default function PortalPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  const [items, setItems] = useState<LookupResult[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customer/me');
        const data = (res.ok ? await res.json() : { customer: null }) as { customer: CustomerInfo | null };
        setCustomer(data.customer);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const loadItems = async () => {
    setItemsError(null);
    setLoadingItems(true);
    try {
      const res = await fetch('/api/customer/browse');
      if (res.status === 401) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { items: LookupResult[] };
      setItems(data.items);
    } catch {
      setItemsError('Could not load stock right now. Please try again.');
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (customer) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.partNumber.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
    setItems([]);
    setSearch('');
    setSelected(new Set());
  };

  const toggleSelected = (partNumber: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.partNumber));
  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((i) => next.delete(i.partNumber));
      } else {
        filtered.forEach((i) => next.add(i.partNumber));
      }
      return next;
    });
  };

  const handleSendWhatsApp = () => {
    const selectedItems = items.filter((i) => selected.has(i.partNumber));
    if (selectedItems.length === 0) return;

    const lines = selectedItems.map(
      (i, idx) =>
        `${idx + 1}. ${i.partNumber}${i.description ? ` — ${i.description}` : ''}\n   Stock: ${i.stock} | Price: AED ${i.price.toFixed(2)}`
    );
    const message = [
      `*Stock Request from ${customer!.name}${customer!.companyName ? ` (${customer!.companyName})` : ''}*`,
      '',
      ...lines,
    ].join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const logoBadge = (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2">
      <Image src="/florence-icon.png" alt="Florence" width={28} height={28} className="h-full w-full object-contain" />
    </div>
  );

  if (checkingSession) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (!customer) {
    return <PortalAuthForm onLoggedIn={setCustomer} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        {logoBadge}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Florence <span className="text-accent">Client Portal</span>
          </h1>
          <p className="truncate text-xs text-muted">
            {customer.name} · {customer.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
        >
          <LogOut size={14} /> Log Out
        </button>
      </header>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Stock & Pricing" subtitle="Search or browse everything available to you" />
          <button
            onClick={loadItems}
            disabled={loadingItems}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part number, description, or category…"
            className="w-full rounded-lg border border-border bg-surface-muted py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {itemsError && <p className="mb-3 text-xs text-loss">{itemsError}</p>}

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <StatCard label="Items Available" value={loadingItems ? '…' : String(filtered.length)} />
          {selected.size > 0 && (
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-black"
            >
              <MessageCircle size={16} /> Send {selected.size} Selected via WhatsApp
            </button>
          )}
        </div>

        <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="sticky top-0 bg-surface-muted">
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                  />
                </th>
                <th className="px-3 py-2">Part Number</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <PackageSearch size={24} />
                      {items.length === 0 ? 'Nothing available yet — check back soon.' : 'No matches for this search.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.partNumber} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.partNumber)}
                        onChange={() => toggleSelected(item.partNumber)}
                        className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium">{item.partNumber}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-muted">{item.description || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{item.category}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {item.stock > 0 ? item.stock : <Badge tone="loss">Out of Stock</Badge>}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium text-accent">AED {item.price.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
