'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Search, PackageSearch, RefreshCw, MessageCircle, Home, Menu } from 'lucide-react';
import { PortalAuthForm } from '@/components/PortalAuthForm';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlorenceLogo } from '@/components/FlorenceLogo';
import { ProductCard } from '@/components/ProductCard';
import { CatalogHome } from '@/components/CatalogHome';
import { CustomerCatalogItem } from '@/lib/catalogApi';

const MANUAL_STOCK_VENDOR = 'Apple';
const HOME_VIEW = 'home' as const;

interface CustomerInfo {
  name: string;
  email: string;
  companyName: string;
  enabledBrands: string[];
  appleShowPrices: boolean;
  pricedVendorBrands: string[];
}

interface PricedItem {
  partNumber: string;
  description: string;
  category: string;
  vendor: string;
  stock?: number;
  availability?: string;
  price: number;
  image: string | null;
}

interface StockToast {
  id: string;
  text: string;
}

const WHATSAPP_NUMBER = '971525348090';
const STOCK_POLL_INTERVAL_MS = 15_000;
const TOAST_LIFETIME_MS = 6_000;
const SPOTLIGHT_MIN_INTERVAL_MS = 16_000;
const SPOTLIGHT_MAX_INTERVAL_MS = 37_000;

export default function PortalClient() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [activeView, setActiveView] = useState<string>(HOME_VIEW);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const activeBrand = activeView === HOME_VIEW ? null : activeView;

  useEffect(() => {
    setSidebarOpen(window.innerWidth > 820);
  }, []);

  // Availability-only catalog — every brand except Apple (Apple joins this list only when its prices are off).
  const [catalogItems, setCatalogItems] = useState<CustomerCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [search, setSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogAvail, setCatalogAvail] = useState('all');
  const [catalogSelected, setCatalogSelected] = useState<Set<string>>(new Set());

  // Priced Apple items — real stock + this customer's markup-adjusted price.
  const [pricedItems, setPricedItems] = useState<PricedItem[]>([]);
  const [loadingPriced, setLoadingPriced] = useState(false);
  const [pricedSearch, setPricedSearch] = useState('');
  const [pricedCategory, setPricedCategory] = useState('all');
  const [pricedSelected, setPricedSelected] = useState<Set<string>>(new Set());

  // "Sold"/availability-change toasts — diffed against the previous poll's snapshot.
  const [toasts, setToasts] = useState<StockToast[]>([]);
  const prevStockRef = useRef<Map<string, number>>(new Map());
  const prevAvailRef = useRef<Map<string, string>>(new Map());

  const pushToast = (text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_LIFETIME_MS);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customer/me', { cache: 'no-store' });
        const data = (res.ok ? await res.json() : { customer: null }) as { customer: CustomerInfo | null };
        setCustomer(data.customer);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const loadCatalog = async (silent = false) => {
    if (!silent) setLoadingCatalog(true);
    try {
      const res = await fetch('/api/customer/catalog', { cache: 'no-store' });
      if (res.status === 401) {
        setCustomer(null);
        return;
      }
      const data = (res.ok ? await res.json() : { items: [] }) as { items: CustomerCatalogItem[] };
      const items = data.items ?? [];
      for (const item of items) {
        const prevAvail = prevAvailRef.current.get(item.wic);
        if (prevAvail !== undefined && prevAvail !== item.availability) {
          pushToast(`${item.description || item.wic} — now ${item.availability}`);
        }
      }
      prevAvailRef.current = new Map(items.map((i) => [i.wic, i.availability]));
      setCatalogItems(items);
    } finally {
      if (!silent) setLoadingCatalog(false);
    }
  };

  const loadPriced = async (silent = false) => {
    if (!silent) setLoadingPriced(true);
    try {
      const res = await fetch('/api/customer/browse', { cache: 'no-store' });
      if (res.status === 401) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { items: PricedItem[] };
      const items = data.items ?? [];
      for (const item of items) {
        if (typeof item.stock === 'number') {
          const prevStock = prevStockRef.current.get(item.partNumber);
          if (prevStock !== undefined && item.stock < prevStock) {
            const sold = prevStock - item.stock;
            pushToast(`${sold} ${sold === 1 ? 'unit' : 'units'} sold — ${item.description || item.partNumber}`);
          }
          prevStockRef.current.set(item.partNumber, item.stock);
        } else if (item.availability) {
          const prevAvail = prevAvailRef.current.get(item.partNumber);
          if (prevAvail !== undefined && prevAvail !== item.availability) {
            pushToast(`${item.description || item.partNumber} — now ${item.availability}`);
          }
          prevAvailRef.current.set(item.partNumber, item.availability);
        }
      }
      setPricedItems(items);
    } finally {
      if (!silent) setLoadingPriced(false);
    }
  };

  useEffect(() => {
    if (!customer) return;
    loadCatalog();
    loadPriced();
    const interval = setInterval(() => {
      loadCatalog(true);
      loadPriced(true);
    }, STOCK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Spotlight ticker — picks a random real item name from whatever brands this customer can see, on a
  // short randomized interval, and shows a "Sold X Units" marketing toast. The sold count is a
  // fabricated random number (1-20, occasionally 100-200) purely for engagement — it is NOT tied to
  // actual sales or stock changes (that's the real toast logic above).
  const catalogItemsRef = useRef<CustomerCatalogItem[]>([]);
  const pricedItemsRef = useRef<PricedItem[]>([]);
  useEffect(() => {
    catalogItemsRef.current = catalogItems;
  }, [catalogItems]);
  useEffect(() => {
    pricedItemsRef.current = pricedItems;
  }, [pricedItems]);

  useEffect(() => {
    if (!customer) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    const truncate = (text: string, max = 32) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
    const randomInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
    // Mostly a small 1-20 count, occasionally jumping to a 100-200 "big sale" number for variety.
    const randomSoldCount = () => (Math.random() < 0.15 ? randomInt(100, 200) : randomInt(1, 20));

    const spotlightOne = () => {
      const names: string[] = [
        ...catalogItemsRef.current.map((i) => i.description || i.wic),
        ...pricedItemsRef.current.map((i) => i.description || i.partNumber),
      ];
      if (names.length > 0) {
        const name = names[Math.floor(Math.random() * names.length)];
        const count = randomSoldCount();
        pushToast(`${truncate(name)} — Sold ${count} ${count === 1 ? 'Unit' : 'Units'}`);
      }
    };

    const scheduleNext = () => {
      const delay = SPOTLIGHT_MIN_INTERVAL_MS + Math.random() * (SPOTLIGHT_MAX_INTERVAL_MS - SPOTLIGHT_MIN_INTERVAL_MS);
      timeoutId = setTimeout(() => {
        spotlightOne();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
    setCatalogItems([]);
    setPricedItems([]);
    setCatalogSelected(new Set());
    setPricedSelected(new Set());
    setSearch('');
    setPricedSearch('');
    setToasts([]);
    prevStockRef.current = new Map();
    prevAvailRef.current = new Map();
  };

  const toggleCatalogSelected = (wic: string) => {
    setCatalogSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wic)) next.delete(wic);
      else next.add(wic);
      return next;
    });
  };

  // Selection sets are keyed by wic/partNumber, which aren't unique across brands — without this,
  // switching brands could leave a stale "Send N" button referencing another brand's items.
  const switchView = (view: string) => {
    setActiveView(view);
    setCatalogSelected(new Set());
    setPricedSelected(new Set());
    if (window.innerWidth <= 820) setSidebarOpen(false);
  };

  const togglePricedSelected = (partNumber: string) => {
    setPricedSelected((prev) => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
  };

  const isAppleTab = activeBrand === MANUAL_STOCK_VENDOR;
  const showBrandPriced = isAppleTab
    ? !!customer?.appleShowPrices
    : !!activeBrand && !!customer?.pricedVendorBrands.includes(activeBrand);

  // ---- Availability view (every brand not priced for this customer) ----
  const brandItems = useMemo(() => catalogItems.filter((i) => i.vendor === activeBrand), [catalogItems, activeBrand]);

  const catalogCategories = useMemo(
    () => Array.from(new Set(brandItems.map((i) => i.group).filter(Boolean))).sort(),
    [brandItems]
  );

  const catalogFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brandItems.filter(
      (i) =>
        (catalogCategory === 'all' || i.group === catalogCategory) &&
        (catalogAvail === 'all' || i.availability === catalogAvail) &&
        (!q || i.wic.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.group.toLowerCase().includes(q))
    );
  }, [brandItems, catalogCategory, catalogAvail, search]);

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
    const selectedItems = brandItems.filter((i) => catalogSelected.has(i.wic));
    if (selectedItems.length === 0) return;
    const lines = selectedItems.map(
      (i, idx) => `${idx + 1}. ${i.wic}${i.description ? ` — ${i.description}` : ''}\n   Availability: ${i.availability}`
    );
    const message = [`*Stock Request from ${customer!.name}${customer!.companyName ? ` (${customer!.companyName})` : ''}*`, '', ...lines].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ---- Priced view (Apple, or any vendor brand with a markup set for this customer) ----
  const brandPricedItems = useMemo(() => pricedItems.filter((i) => i.vendor === activeBrand), [pricedItems, activeBrand]);

  const pricedCategories = useMemo(
    () => Array.from(new Set(brandPricedItems.map((i) => i.category).filter(Boolean))).sort(),
    [brandPricedItems]
  );

  const pricedFiltered = useMemo(() => {
    const q = pricedSearch.trim().toLowerCase();
    return brandPricedItems.filter(
      (i) =>
        (pricedCategory === 'all' || i.category === pricedCategory) &&
        (!q || i.partNumber.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    );
  }, [brandPricedItems, pricedCategory, pricedSearch]);

  const handleSendPricedWhatsApp = () => {
    const selectedItems = brandPricedItems.filter((i) => pricedSelected.has(i.partNumber));
    if (selectedItems.length === 0) return;
    const lines = selectedItems.map(
      (i, idx) =>
        `${idx + 1}. ${i.partNumber}${i.description ? ` — ${i.description}` : ''}\n   ${
          typeof i.stock === 'number' ? `Stock: ${i.stock}` : `Availability: ${i.availability}`
        } | Price: ${isAppleTab ? 'AED' : 'USD'} ${i.price.toFixed(2)}`
    );
    const message = [`*Stock Request from ${customer!.name}${customer!.companyName ? ` (${customer!.companyName})` : ''}*`, '', ...lines].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (checkingSession) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  if (!customer) {
    return <PortalAuthForm onLoggedIn={(c) => setCustomer(c)} />;
  }

  return (
    <div className="mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mac-window portal-window">
        <div className={`mac-backdrop ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className={`mac-sidebar ${sidebarOpen ? 'sb-open' : 'sb-closed'}`}>
          <div className="mac-brand">
            <div className="mark">
              <FlorenceLogo size={20} />
            </div>
            <span className="name">Florence</span>
          </div>

          <button
            onClick={() => switchView(HOME_VIEW)}
            className={`mac-nav-item ${activeView === HOME_VIEW ? 'active' : ''}`}
          >
            <Home size={15} />
            Home
            <span className="sp" />
          </button>

          <div className="mac-nav-section">Brands</div>
          {customer.enabledBrands.map((brand) => (
            <button
              key={brand}
              onClick={() => switchView(brand)}
              className={`mac-nav-item ${activeView === brand ? 'active' : ''}`}
            >
              <BrandLogo vendor={brand} size={15} />
              {brand}
              <span className="sp" />
            </button>
          ))}

          <div className="portal-account" style={{ marginTop: 'auto', paddingTop: 14 }}>
            <div className="mac-nav-section" style={{ padding: '0 10px 4px' }}>
              Signed in as
            </div>
            <div style={{ padding: '0 10px', fontSize: 12, color: 'var(--muted)', wordBreak: 'break-word' }}>
              {customer.name}
              <br />
              {customer.email}
            </div>
          </div>
        </div>

        <div className="mac-main">
          <div className="mac-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="menu-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar">
                <Menu />
              </button>
              <h2>{activeView === HOME_VIEW ? 'Home' : activeBrand}</h2>
            </div>
            <div className="toolbar-actions">
              <ThemeToggle />
              <button className="toolbar-btn" onClick={handleLogout}>
                <LogOut /> Log Out
              </button>
            </div>
          </div>

          <div className="mac-scroll" style={activeView === HOME_VIEW ? { padding: 0 } : undefined}>
            {activeView === HOME_VIEW ? (
              <CatalogHome priced />
            ) : customer.enabledBrands.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', textAlign: 'center', color: 'var(--muted)' }}>
                <PackageSearch size={24} />
                No brands are enabled on your account yet. Ask Florence to enable at least one brand.
              </div>
            ) : showBrandPriced ? (
              <>
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{isAppleTab ? 'Stock & Pricing' : 'Availability & Pricing'}</span>
                  <button className="toolbar-btn" onClick={() => loadPriced()} disabled={loadingPriced}>
                    <RefreshCw /> Refresh
                  </button>
                </div>

                <div className="search-field">
                  <Search />
                  <input value={pricedSearch} onChange={(e) => setPricedSearch(e.target.value)} placeholder="Search part number, description, or category…" />
                </div>

                <div className="filter-bar">
                  <select className="filter-select" value={pricedCategory} onChange={(e) => setPricedCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {pricedCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="stat">
                    <div className="k">Items Available</div>
                    <div className="v">{loadingPriced ? '…' : pricedFiltered.length}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {pricedSelected.size > 0 && (
                      <button className="whatsapp-chip" onClick={handleSendPricedWhatsApp}>
                        <MessageCircle /> Send {pricedSelected.size}
                      </button>
                    )}
                  </div>
                </div>

                {loadingPriced ? (
                  <div className="pc-empty">Loading…</div>
                ) : pricedFiltered.length === 0 ? (
                  <div className="pc-empty">{brandPricedItems.length === 0 ? 'Nothing available yet — check back soon.' : 'No matches for this search.'}</div>
                ) : (
                  <div className="pc-grid">
                    {pricedFiltered.map((item) => (
                      <ProductCard
                        key={item.partNumber}
                        vendor={item.vendor}
                        description={item.description}
                        wic={item.partNumber}
                        availability={typeof item.stock === 'number' ? (item.stock > 0 ? 'Available' : 'Limited') : item.availability ?? ''}
                        image={item.image}
                        imageBroken={false}
                        onImageBroken={() => {}}
                        selected={pricedSelected.has(item.partNumber)}
                        onToggleSelect={() => togglePricedSelected(item.partNumber)}
                        foot={
                          <div className="pc-price-unlocked">
                            <span className="cur">{isAppleTab ? 'AED' : 'USD'}</span>
                            {item.price.toFixed(2)}
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Stock &amp; Availability · no pricing shown here</span>
                  <button className="toolbar-btn" onClick={() => loadCatalog()} disabled={loadingCatalog}>
                    <RefreshCw /> Refresh
                  </button>
                </div>

                <div className="search-field">
                  <Search />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search part number, description, or category…" />
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
                    No matches for these filters.
                  </div>
                ) : (
                  catalogGroups.map(([group, groupItems]) => (
                    <div key={group}>
                      <div className="section-header">{group}</div>
                      <div className="pc-grid">
                        {groupItems.map((item) => (
                          <ProductCard
                            key={item.wic}
                            vendor={item.vendor}
                            description={item.description}
                            wic={item.wic}
                            availability={item.availability}
                            image={item.image}
                            imageBroken={false}
                            onImageBroken={() => {}}
                            selected={catalogSelected.has(item.wic)}
                            onToggleSelect={() => toggleCatalogSelected(item.wic)}
                            foot={<span style={{ fontSize: 11.5, color: 'var(--muted)' }}>No pricing shown here</span>}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
