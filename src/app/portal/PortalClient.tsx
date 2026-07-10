'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Search, PackageSearch, RefreshCw, MessageCircle, Check } from 'lucide-react';
import { PortalAuthForm } from '@/components/PortalAuthForm';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlorenceLogo } from '@/components/FlorenceLogo';
import { fetchCustomerCatalog, CustomerCatalogItem } from '@/lib/catalogApi';

const MANUAL_STOCK_VENDOR = 'Apple';

interface CustomerInfo {
  name: string;
  email: string;
  companyName: string;
  enabledBrands: string[];
  appleShowPrices: boolean;
}

interface PricedItem {
  partNumber: string;
  description: string;
  category: string;
  stock: number;
  price: number;
}

const WHATSAPP_NUMBER = '971525348090';
const STOCK_POLL_INTERVAL_MS = 15_000;

const AVAIL_CLASS: Record<string, string> = {
  Available: 'avail-yes',
  'On Demand': 'avail-ondemand',
  Limited: 'avail-limited',
};

export default function PortalClient() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

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
        if (data.customer) setActiveBrand(data.customer.enabledBrands[0] ?? null);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const loadCatalog = async (silent = false) => {
    if (!silent) setLoadingCatalog(true);
    try {
      const catalog = await fetchCustomerCatalog();
      setCatalogItems(catalog);
    } finally {
      if (!silent) setLoadingCatalog(false);
    }
  };

  const loadPriced = async (silent = false) => {
    if (!silent) setLoadingPriced(true);
    try {
      const res = await fetch('/api/customer/browse');
      const data = (await res.json()) as { items: PricedItem[] };
      setPricedItems(data.items ?? []);
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

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
    setCatalogItems([]);
    setPricedItems([]);
    setCatalogSelected(new Set());
    setPricedSelected(new Set());
    setSearch('');
    setPricedSearch('');
  };

  const toggleCatalogSelected = (wic: string) => {
    setCatalogSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wic)) next.delete(wic);
      else next.add(wic);
      return next;
    });
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
  const showApplePriced = isAppleTab && !!customer?.appleShowPrices;

  // ---- Availability view (every brand except priced-Apple) ----
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

  // ---- Priced Apple view ----
  const pricedCategories = useMemo(
    () => Array.from(new Set(pricedItems.map((i) => i.category).filter(Boolean))).sort(),
    [pricedItems]
  );

  const pricedFiltered = useMemo(() => {
    const q = pricedSearch.trim().toLowerCase();
    return pricedItems.filter(
      (i) =>
        (pricedCategory === 'all' || i.category === pricedCategory) &&
        (!q || i.partNumber.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    );
  }, [pricedItems, pricedCategory, pricedSearch]);

  const handleSendPricedWhatsApp = () => {
    const selectedItems = pricedItems.filter((i) => pricedSelected.has(i.partNumber));
    if (selectedItems.length === 0) return;
    const lines = selectedItems.map(
      (i, idx) => `${idx + 1}. ${i.partNumber}${i.description ? ` — ${i.description}` : ''}\n   Stock: ${i.stock} | Price: AED ${i.price.toFixed(2)}`
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
    return (
      <PortalAuthForm
        onLoggedIn={(c) => {
          setCustomer(c as CustomerInfo);
          setActiveBrand(c.enabledBrands[0] ?? null);
        }}
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col" style={{ position: 'relative' }}>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FlorenceLogo size={26} />
              Florence <span style={{ color: 'var(--accent)' }}>Client Portal</span>
            </h1>
            <div className="sub">{customer.name} · {customer.email}</div>
          </div>
          <ThemeToggle />
        </div>
        <div className="sub" style={{ marginTop: 8 }}>
          <span style={{ color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={handleLogout} role="button">
            <LogOut size={13} /> Log Out
          </span>
        </div>
      </div>

      <div className="ios-content">
        {customer.enabledBrands.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', textAlign: 'center', color: 'var(--muted)' }}>
            <PackageSearch size={24} />
            No brands are enabled on your account yet. Ask Florence to enable at least one brand.
          </div>
        ) : (
          <>
            {/* Single-select brand slider — one brand's stock shown at a time */}
            <div className="brand-toggle-row" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
              {customer.enabledBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setActiveBrand(brand)}
                  className={`brand-btn ${activeBrand === brand ? 'active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  <BrandLogo vendor={brand} size={15} />
                  {brand}
                </button>
              ))}
            </div>

            {showApplePriced ? (
              <>
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Stock &amp; Pricing</span>
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
                        {loadingPriced ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                              Loading…
                            </td>
                          </tr>
                        ) : pricedFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--muted)' }}>
                              {pricedItems.length === 0 ? 'Nothing available yet — check back soon.' : 'No matches for this search.'}
                            </td>
                          </tr>
                        ) : (
                          pricedFiltered.map((item) => (
                            <tr key={item.partNumber}>
                              <td>
                                <button
                                  className={`select-dot ${pricedSelected.has(item.partNumber) ? 'checked' : ''}`}
                                  onClick={() => togglePricedSelected(item.partNumber)}
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
                      <div className="ios-group">
                        {groupItems.map((item) => (
                          <div key={item.wic} className="ios-row" style={{ alignItems: 'flex-start' }}>
                            <button
                              className={`select-dot ${catalogSelected.has(item.wic) ? 'checked' : ''}`}
                              onClick={() => toggleCatalogSelected(item.wic)}
                            >
                              <Check />
                            </button>
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt=""
                                width={36}
                                height={36}
                                className="thumb-hover"
                                style={{ borderRadius: 8, objectFit: 'contain', background: 'var(--fill-secondary)', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fill-secondary)', flexShrink: 0 }} />
                            )}
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
          </>
        )}
      </div>
    </div>
  );
}
