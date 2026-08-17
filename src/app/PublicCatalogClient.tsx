'use client';

import { useEffect, useMemo, useState, SyntheticEvent } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Lock, Package, LogIn } from 'lucide-react';
import { FlorenceLogo } from '@/components/FlorenceLogo';

const WHATSAPP_NUMBER = '971525348090';
const REFRESH_INTERVAL_MS = 15_000;
const PAGE_SIZE = 24;

interface PublicCatalogItem {
  wic: string;
  description: string;
  vendor: string;
  group: string;
  availability: string;
  image: string | null;
}

interface PricedItem {
  partNumber: string;
  price: number;
}

interface CustomerInfo {
  name: string;
  companyName: string;
}

const AVAIL_CLASS: Record<string, string> = {
  Available: 'avail-yes',
  'On Demand': 'avail-ondemand',
  Limited: 'avail-limited',
};

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

// The vendor CDN sometimes "succeeds" with a 1x1 placeholder gif instead of 404ing, so onError alone won't
// catch it — treat a suspiciously tiny decoded image as broken too.
function handleImgLoad(e: SyntheticEvent<HTMLImageElement>, onBroken: () => void) {
  if (e.currentTarget.naturalWidth <= 4 || e.currentTarget.naturalHeight <= 4) onBroken();
}

export default function PublicCatalogClient() {
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [pricedByPart, setPricedByPart] = useState<Map<string, number>>(new Map());

  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const markImageBroken = (wic: string) => setBrokenImages((prev) => (prev.has(wic) ? prev : new Set(prev).add(wic)));

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      const res = await fetch('/api/public/catalog');
      const data = (await res.json()) as { items: PublicCatalogItem[] };
      if (!cancelled) {
        setItems(data.items);
        setLoading(false);
      }
    };
    loadCatalog();
    const interval = setInterval(loadCatalog, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/customer/me');
      if (!res.ok) return;
      const data = (await res.json()) as { customer: CustomerInfo | null };
      setCustomer(data.customer);
    })();
  }, []);

  // /api/customer/browse already returns every item this specific customer has pricing on — Apple via
  // categoryMarkups, any other vendor (Logitech, Origin Acoustics, ...) via vendorMarkups — so no vendor
  // logic needs replicating here; just overlay whatever it returns.
  useEffect(() => {
    if (!customer) {
      setPricedByPart(new Map());
      return;
    }
    (async () => {
      const res = await fetch('/api/customer/browse');
      if (!res.ok) return;
      const data = (await res.json()) as { items: PricedItem[] };
      setPricedByPart(new Map(data.items.map((p) => [p.partNumber, p.price])));
    })();
  }, [customer]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    return counts;
  }, [items]);

  const topGroups = useMemo(
    () =>
      Array.from(groupCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([group]) => group),
    [groupCounts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeGroup !== 'all' && item.group !== activeGroup) return false;
      if (!q) return true;
      return (
        item.description.toLowerCase().includes(q) ||
        item.wic.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q)
      );
    });
  }, [items, search, activeGroup]);

  const spotlight = useMemo(() => {
    const withImages = items.filter((i) => i.image && !brokenImages.has(i.wic) && i.availability === 'Available');
    if (withImages.length === 0) return null;
    // Stable-ish pick: rotate by the hour so it doesn't feel random on every reload, but still varies.
    const idx = new Date().getHours() % withImages.length;
    return withImages[idx];
  }, [items, brokenImages]);

  const visibleItems = filtered.slice(0, visibleCount);
  const vendorCount = useMemo(() => new Set(items.map((i) => i.vendor)).size, [items]);

  return (
    <>
      <div className="utility-bar">
        <span className="dot" /> Live from Florence Trading FZCO
      </div>

      <nav className="pc-nav">
        <div className="pc-brand">
          <FlorenceLogo size={26} />
          <span className="pc-brand-badge">TRADE</span>
        </div>
        <div className="pc-nav-mid">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${items.length || '5,300+'} SKUs — try "RTX 5070" or a part number`}
          />
        </div>
        <div className="pc-nav-right">
          {customer ? (
            <Link href="/portal" className="pc-nav-icon-btn">
              {customer.companyName || customer.name}
            </Link>
          ) : (
            <Link href="/portal" className="pc-pill-btn">
              <LogIn size={13} /> Sign in
            </Link>
          )}
        </div>
      </nav>

      <section className="pc-hero">
        <div className="pc-hero-eyebrow">
          <span>●</span> Now live — {vendorCount || '40+'} authorized vendors, one catalog
        </div>
        <h1 className="pc-hero-title">
          Florence Trading FZCO <em>Live Stock</em>
        </h1>
        <p className="pc-hero-sub">
          Apple, Samsung, Logitech, Ubiquiti and {items.length ? items.length.toLocaleString() : '5,300+'} SKUs,
          updated in real time. Sign in for trade pricing — everyone else can still see what’s in stock right now.
        </p>
        <div className="pc-hero-ctas">
          <Link href="/portal" className="pc-cta-primary">
            {customer ? 'Go to my portal' : 'Request trade account'} →
          </Link>
          {!customer && (
            <Link href="/portal" className="pc-cta-secondary">
              I have an account
            </Link>
          )}
        </div>
        <div className="pc-hero-wa-row">
          <a
            className="pc-wa-pill"
            href={waLink('Hi, I have a question about your stock')}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} />
            Chat on WhatsApp
          </a>
        </div>
        <div className="pc-stat-strip">
          <div className="pc-stat-cell">
            <div className="pc-stat-num tabular">{items.length ? items.length.toLocaleString() : '—'}</div>
            <div className="pc-stat-label">SKUs tracked</div>
          </div>
          <div className="pc-stat-cell">
            <div className="pc-stat-num tabular">15s</div>
            <div className="pc-stat-label">stock refresh</div>
          </div>
          <div className="pc-stat-cell">
            <div className="pc-stat-num tabular">{vendorCount || '50+'}</div>
            <div className="pc-stat-label">authorized vendors</div>
          </div>
          <div className="pc-stat-cell">
            <div className="pc-stat-num">WhatsApp</div>
            <div className="pc-stat-label">instant reply</div>
          </div>
        </div>
      </section>

      <div className="pc-cat-rail">
        <button type="button" className={`pc-cat-chip ${activeGroup === 'all' ? 'active' : ''}`} onClick={() => setActiveGroup('all')}>
          All stock
        </button>
        {topGroups.map((group) => (
          <button
            type="button"
            key={group}
            className={`pc-cat-chip ${activeGroup === group ? 'active' : ''}`}
            onClick={() => setActiveGroup(group)}
          >
            {group} <span className="pc-cat-count">{groupCounts.get(group)}</span>
          </button>
        ))}
      </div>

      {spotlight && (
        <section className="pc-section" style={{ paddingBottom: 44 }}>
          <div className="pc-spotlight">
            <div className="pc-spotlight-copy">
              <div className="pc-spotlight-eyebrow">
                <span className="pc-dot" /> Trade spotlight
              </div>
              <h3>{spotlight.description}</h3>
              <p>
                {spotlight.vendor} · {spotlight.group} · in stock now.
              </p>
              <div className="pc-spotlight-ctas">
                <a className="pc-cta-primary" href={waLink(`Hi, I'm interested in ${spotlight.description} (${spotlight.wic})`)} target="_blank" rel="noreferrer">
                  Ask on WhatsApp
                </a>
                {!customer && (
                  <Link href="/portal" className="pc-cta-ghost">
                    Unlock trade price
                  </Link>
                )}
              </div>
            </div>
            <div className="pc-spotlight-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element -- external vendor CDN image, unknown dimensions */}
              <img
                src={spotlight.image ?? ''}
                alt={spotlight.description}
                onError={() => markImageBroken(spotlight.wic)}
                onLoad={(e) => handleImgLoad(e, () => markImageBroken(spotlight.wic))}
              />
            </div>
          </div>
        </section>
      )}

      <section className="pc-section">
        <div className="pc-section-head">
          <div>
            <div className="pc-section-title">{activeGroup === 'all' ? 'Newly landed' : activeGroup}</div>
            <div className="pc-section-sub">
              {loading ? 'Loading live stock…' : `${filtered.length.toLocaleString()} items ${search ? 'matching your search' : 'in stock'}`}
            </div>
          </div>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="pc-empty">No items match “{search}”. Try a different search or category.</div>
        )}

        <div className="pc-grid">
          {visibleItems.map((item) => {
            const price = pricedByPart.get(item.wic);
            return (
              <div className="pc-card" key={`${item.vendor}-${item.wic}`}>
                <div className="pc-card-img">
                  <span className={`pc-avail-pill ${AVAIL_CLASS[item.availability] ?? 'avail-ondemand'}`}>
                    {item.availability}
                  </span>
                  {item.image && !brokenImages.has(item.wic) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external vendor CDN image, unknown dimensions
                    <img
                      src={item.image}
                      alt={item.description}
                      onError={() => markImageBroken(item.wic)}
                      onLoad={(e) => handleImgLoad(e, () => markImageBroken(item.wic))}
                    />
                  ) : (
                    <Package size={34} strokeWidth={1.3} style={{ color: 'var(--muted-2)' }} />
                  )}
                </div>
                <div className="pc-card-body">
                  <div className="pc-card-vendor">{item.vendor}</div>
                  <div className="pc-card-name">{item.description}</div>
                  <div className="pc-card-wic">{item.wic}</div>
                  <div className="pc-card-foot">
                    {price !== undefined ? (
                      <div className="pc-price-unlocked">
                        <span className="cur">AED</span>
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : !customer ? (
                      <Link href="/portal" className="pc-price-locked">
                        <Lock size={11} /> Sign in for price
                      </Link>
                    ) : (
                      <a
                        className="pc-ask-btn"
                        href={waLink(`Hi, I'm interested in ${item.description} (${item.wic})`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={12} /> Ask for pricing
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visibleCount < filtered.length && (
          <div className="pc-load-more">
            <button className="pc-cta-secondary" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Show more ({filtered.length - visibleCount} left)
            </button>
          </div>
        )}
      </section>

      <footer className="pc-footer">
        Florence Trading FZCO · DAFZA & JAFZA, Dubai · Trade pricing shown to approved accounts only
      </footer>
    </>
  );
}
