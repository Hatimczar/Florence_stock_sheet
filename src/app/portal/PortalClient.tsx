'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { LogOut, Search, PackageSearch, RefreshCw, MessageCircle, ShoppingBag } from 'lucide-react';
import { Card, SectionHeader, StatCard, Badge, SelectInput } from '@/components/ui';
import { PortalAuthForm } from '@/components/PortalAuthForm';
import { fetchCustomerCatalog, CustomerCatalogItem } from '@/lib/catalogApi';

interface CustomerInfo {
  name: string;
  email: string;
  companyName: string;
  enabledBrands: string[];
}

interface LookupResult {
  partNumber: string;
  description: string;
  category: string;
  stock: number;
  price: number;
}

interface SoldToast {
  id: string;
  text: string;
}

const WHATSAPP_NUMBER = '971525348090';
const STOCK_POLL_INTERVAL_MS = 15_000;
const TOAST_LIFETIME_MS = 6_000;

const AVAIL_TONE: Record<string, 'profit' | 'warn' | 'loss'> = {
  Available: 'profit',
  'On Demand': 'warn',
  Limited: 'loss',
};

export default function PortalClient() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  const [items, setItems] = useState<LookupResult[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<SoldToast[]>([]);
  const prevStockRef = useRef<Map<string, number> | null>(null);

  // Vendor catalog (IT4Profit) — brand toggles, category/availability filters, never shows price.
  const [catalogItems, setCatalogItems] = useState<CustomerCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogAvail, setCatalogAvail] = useState('all');
  const [catalogSelected, setCatalogSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customer/me');
        const data = (res.ok ? await res.json() : { customer: null }) as { customer: CustomerInfo | null };
        setCustomer(data.customer);
        if (data.customer) setSelectedBrands(new Set(data.customer.enabledBrands));
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const loadItems = async (silent = false) => {
    if (!silent) {
      setItemsError(null);
      setLoadingItems(true);
    }
    try {
      const res = await fetch('/api/customer/browse');
      if (res.status === 401) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { items: LookupResult[] };
      setItems(data.items);

      const prevStock = prevStockRef.current;
      if (prevStock) {
        const newToasts: SoldToast[] = [];
        for (const item of data.items) {
          const before = prevStock.get(item.partNumber);
          if (before !== undefined && item.stock < before) {
            const sold = before - item.stock;
            newToasts.push({
              id: `${item.partNumber}-${Date.now()}`,
              text: `${sold} ${sold === 1 ? 'unit' : 'units'} sold — ${item.description || item.partNumber}`,
            });
          }
        }
        if (newToasts.length > 0) {
          setToasts((prev) => [...prev, ...newToasts]);
          newToasts.forEach((t) => {
            setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), TOAST_LIFETIME_MS);
          });
        }
      }
      prevStockRef.current = new Map(data.items.map((i) => [i.partNumber, i.stock]));
    } catch {
      if (!silent) setItemsError('Could not load stock right now. Please try again.');
    } finally {
      if (!silent) setLoadingItems(false);
    }
  };

  const loadCatalog = async (silent = false) => {
    if (!silent) setLoadingCatalog(true);
    try {
      const catalog = await fetchCustomerCatalog();
      setCatalogItems(catalog);
    } finally {
      if (!silent) setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (!customer) return;
    loadItems();
    loadCatalog();
    const interval = setInterval(() => {
      loadItems(true);
      loadCatalog(true);
    }, STOCK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
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
    setToasts([]);
    setCatalogItems([]);
    setCatalogSelected(new Set());
    prevStockRef.current = null;
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

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const toggleCatalogSelected = (wic: string) => {
    setCatalogSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wic)) next.delete(wic);
      else next.add(wic);
      return next;
    });
  };

  const catalogCategories = useMemo(
    () => Array.from(new Set(catalogItems.map((i) => i.group).filter(Boolean))).sort(),
    [catalogItems]
  );

  const catalogFiltered = useMemo(
    () =>
      catalogItems.filter(
        (i) =>
          selectedBrands.has(i.vendor) &&
          (catalogCategory === 'all' || i.group === catalogCategory) &&
          (catalogAvail === 'all' || i.availability === catalogAvail)
      ),
    [catalogItems, selectedBrands, catalogCategory, catalogAvail]
  );

  const catalogGroups = useMemo(() => {
    const groups = new Map<string, CustomerCatalogItem[]>();
    catalogFiltered.forEach((item) => {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    });
    return Array.from(groups.entries());
  }, [catalogFiltered]);

  const handleSendCatalogWhatsApp = () => {
    const selectedItems = catalogItems.filter((i) => catalogSelected.has(i.wic));
    if (selectedItems.length === 0) return;

    const lines = selectedItems.map(
      (i, idx) => `${idx + 1}. ${i.wic}${i.description ? ` — ${i.description}` : ''}\n   Availability: ${i.availability}`
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
    return (
      <PortalAuthForm
        onLoggedIn={(c) => {
          setCustomer(c);
          setSelectedBrands(new Set(c.enabledBrands));
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col-reverse items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium shadow-lg"
          >
            <ShoppingBag size={14} className="shrink-0 text-accent" />
            {t.text}
          </div>
        ))}
      </div>

      <header className="mb-6 flex items-center gap-3">
        {logoBadge}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Florence <span className="text-accent">Client Portal</span>
          </h1>
          <p className="truncate text-xs text-muted">
            {customer.name} · {customer.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
        >
          <LogOut size={14} /> Log Out
        </button>
      </header>

      {customer.enabledBrands.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {customer.enabledBrands.map((brand) => {
              const active = selectedBrands.has(brand);
              return (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={
                    active
                      ? 'flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-black'
                      : 'flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface'
                  }
                >
                  <span className={active ? 'h-1.5 w-1.5 rounded-full bg-black' : 'h-1.5 w-1.5 rounded-full bg-muted'} />
                  {brand}
                </button>
              );
            })}
          </div>

          <Card className="mb-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title="Vendor Catalog" subtitle="Availability by brand — no pricing shown here" />
              <button
                onClick={() => loadCatalog()}
                disabled={loadingCatalog}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <SelectInput
                value={catalogCategory}
                onValueChange={setCatalogCategory}
                options={[{ value: 'all', label: 'All Categories' }, ...catalogCategories.map((c) => ({ value: c, label: c }))]}
                className="w-auto min-w-[9rem]"
              />
              <SelectInput
                value={catalogAvail}
                onValueChange={setCatalogAvail}
                options={[
                  { value: 'all', label: 'All Availability' },
                  { value: 'Available', label: 'Available' },
                  { value: 'On Demand', label: 'On Demand' },
                  { value: 'Limited', label: 'Limited' },
                ]}
                className="w-auto min-w-[9rem]"
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <StatCard label="Items Available" value={loadingCatalog ? '…' : String(catalogFiltered.length)} />
              {catalogSelected.size > 0 && (
                <button
                  onClick={handleSendCatalogWhatsApp}
                  className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-black"
                >
                  <MessageCircle size={16} /> Send {catalogSelected.size} Selected via WhatsApp
                </button>
              )}
            </div>

            {catalogGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
                <PackageSearch size={24} />
                {selectedBrands.size === 0 ? 'Toggle a brand above to see stock.' : 'No matches for these filters.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {catalogGroups.map(([group, groupItems]) => (
                  <div key={group}>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{group}</h4>
                    <div className="overflow-hidden rounded-xl border border-border">
                      {groupItems.map((item, idx) => (
                        <div
                          key={item.wic}
                          className={`flex items-start gap-3 px-3 py-2.5 ${idx > 0 ? 'border-t border-border/60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={catalogSelected.has(item.wic)}
                            onChange={() => toggleCatalogSelected(item.wic)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[var(--accent)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-sm font-medium">{item.wic}</div>
                            <div className="text-xs text-muted">{item.description || '—'}</div>
                          </div>
                          <Badge tone={AVAIL_TONE[item.availability] ?? 'neutral'}>{item.availability}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Stock & Pricing" subtitle="Search or browse everything available to you" />
          <button
            onClick={() => loadItems()}
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
