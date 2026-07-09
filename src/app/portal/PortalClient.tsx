'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Search, PackageSearch, RefreshCw, MessageCircle, ShoppingBag, Check } from 'lucide-react';
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

const AVAIL_CLASS: Record<string, string> = {
  Available: 'avail-yes',
  'On Demand': 'avail-ondemand',
  Limited: 'avail-limited',
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

  const [navScrolled, setNavScrolled] = useState(false);
  const largeTitleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const NAV_HEIGHT = 52;
    const onScroll = () => {
      const el = largeTitleRef.current;
      if (!el) return;
      setNavScrolled(el.getBoundingClientRect().bottom <= NAV_HEIGHT);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [customer]);

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

  if (checkingSession) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    );
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
    <div className="flex w-full min-w-0 flex-1 flex-col" style={{ position: 'relative' }}>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col-reverse items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto toast"
            style={{ position: 'static' }}
          >
            <ShoppingBag />
            {t.text}
          </div>
        ))}
      </div>

      {/* Collapsing large-title nav — ported 1:1 from the V3 demo's .ios-nav / .ios-nav-inline */}
      <div className={`ios-nav ${navScrolled ? 'scrolled' : ''}`}>
        <div className="ios-nav-inline">
          Client Portal
          <span className="logout-link" onClick={handleLogout} role="button">
            <LogOut size={13} /> Log Out
          </span>
        </div>
      </div>

      <div ref={largeTitleRef} className="ios-large-title">
        <h1>
          Florence <span style={{ color: 'var(--accent)' }}>Client Portal</span>
        </h1>
        <div className="sub">
          {customer.name} · {customer.email}
          <span style={{ float: 'right', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleLogout} role="button">
            <LogOut size={13} /> Log Out
          </span>
        </div>
      </div>

      <div className="ios-content">
        {customer.enabledBrands.length > 0 && (
          <>
            <div className="brand-toggle-row">
              {customer.enabledBrands.map((brand) => {
                const active = selectedBrands.has(brand);
                return (
                  <button key={brand} onClick={() => toggleBrand(brand)} className={`brand-btn ${active ? 'active' : ''}`}>
                    <span className="dot" />
                    {brand}
                  </button>
                );
              })}
            </div>

            <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Vendor Catalog · no pricing shown here</span>
              <button className="toolbar-btn" onClick={() => loadCatalog()} disabled={loadingCatalog}>
                <RefreshCw /> Refresh
              </button>
            </div>

            <div className="filter-bar">
              <select className="filter-select" value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {catalogCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select className="filter-select" value={catalogAvail} onChange={(e) => setCatalogAvail(e.target.value)}>
                <option value="all">All Availability</option>
                <option value="Available">Available</option>
                <option value="On Demand">On Demand</option>
                <option value="Limited">Limited</option>
              </select>
            </div>

            <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat">
                <div className="k">Items Available</div>
                <div className="v">{loadingCatalog ? '…' : catalogFiltered.length}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {catalogSelected.size > 0 && (
                  <button className="whatsapp-chip" onClick={handleSendCatalogWhatsApp}>
                    <MessageCircle /> Send {catalogSelected.size}
                  </button>
                )}
              </div>
            </div>

            {catalogGroups.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
                <PackageSearch size={24} />
                {selectedBrands.size === 0 ? 'Toggle a brand above to see stock.' : 'No matches for these filters.'}
              </div>
            ) : (
              catalogGroups.map(([group, groupItems]) => (
                <div key={group}>
                  <div className="section-header">{group}</div>
                  <div className="ios-group">
                    {groupItems.map((item) => (
                      <div key={item.wic} className="ios-row" style={{ alignItems: 'flex-start' }}>
                        <button
                          className={`select-dot ${catalogSelected.has(item.wic) ? 'checked' : ''}`}
                          onClick={() => toggleCatalogSelected(item.wic)}
                        >
                          <Check />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row-title mono" style={{ fontSize: 13 }}>
                            {item.wic}
                          </div>
                          <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                            {item.description || '—'}
                          </div>
                        </div>
                        <span className={`pill ${AVAIL_CLASS[item.availability] ?? ''}`} style={{ marginTop: 2 }}>
                          {item.availability}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Stock &amp; Pricing</span>
          <button className="toolbar-btn" onClick={() => loadItems()} disabled={loadingItems}>
            <RefreshCw /> Refresh
          </button>
        </div>

        <div className="search-field">
          <Search />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search part number, description, or category…" />
        </div>

        {itemsError && <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--loss)' }}>{itemsError}</p>}

        <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="stat">
            <div className="k">Items Available</div>
            <div className="v">{loadingItems ? '…' : filtered.length}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {selected.size > 0 && (
              <button className="whatsapp-chip" onClick={handleSendWhatsApp}>
                <MessageCircle /> Send {selected.size}
              </button>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table className="apple-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="num">Stock</th>
                  <th className="num">Price</th>
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                      {items.length === 0 ? 'Nothing available yet — check back soon.' : 'No matches for this search.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.partNumber}>
                      <td>
                        <button
                          className={`select-dot ${selected.has(item.partNumber) ? 'checked' : ''}`}
                          onClick={() => toggleSelected(item.partNumber)}
                        >
                          <Check />
                        </button>
                      </td>
                      <td className="mono">{item.partNumber}</td>
                      <td className="desc-cell">{item.description || '—'}</td>
                      <td>{item.category}</td>
                      <td className="num mono stock-cell">
                        {item.stock > 0 ? item.stock : <span className="pill pill-red">Out of Stock</span>}
                      </td>
                      <td className="num mono price-cell">AED {item.price.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
