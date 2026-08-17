'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, MessageCircle, Lock, LogIn } from 'lucide-react';
import { FlorenceLogo } from '@/components/FlorenceLogo';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCarousel } from '@/components/CategoryCarousel';

const WHATSAPP_NUMBER = '971525348090';
const REFRESH_INTERVAL_MS = 15_000;
const PAGE_SIZE = 24;
const CAROUSEL_SIZE = 14;
const CAROUSEL_ROWS = 8;

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

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * The full cross-vendor catalog browsing experience — hero, spotlight, per-category carousels, search,
 * and a filtered grid once you search or pick a category. Used both signed-out (public homepage, every
 * card locked behind "Sign in for price") and signed-in inside the portal's Home tab (priced=true: real
 * prices where this customer has a markup, "Ask for pricing" WhatsApp fallback otherwise, and the
 * standalone nav bar/hero sign-in CTAs are dropped since the portal shell already provides that chrome).
 */
export function CatalogHome({ priced }: { priced: boolean }) {
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  // /api/customer/browse returns every item this specific customer has pricing on — Apple via
  // categoryMarkups, any other vendor via vendorMarkups — so no vendor logic needs replicating here;
  // just overlay whatever it returns. Only relevant inside the portal (priced=true); the public
  // homepage never has a session to read pricing from.
  useEffect(() => {
    if (!priced) return;
    let cancelled = false;
    const loadPriced = async () => {
      const res = await fetch('/api/customer/browse');
      if (!res.ok) return;
      const data = (await res.json()) as { items: PricedItem[] };
      if (!cancelled) setPricedByPart(new Map(data.items.map((p) => [p.partNumber, p.price])));
    };
    loadPriced();
    const interval = setInterval(loadPriced, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [priced]);

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

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, PublicCatalogItem[]>();
    for (const item of items) {
      const list = map.get(item.group);
      if (list) list.push(item);
      else map.set(item.group, [item]);
    }
    return map;
  }, [items]);

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
  const browsingAll = activeGroup === 'all' && !search.trim();

  const renderFoot = (item: PublicCatalogItem) => {
    const price = priced ? pricedByPart.get(item.wic) : undefined;
    if (price !== undefined) {
      return (
        <div className="pc-price-unlocked">
          <span className="cur">AED</span>
          {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      );
    }
    if (priced) {
      return (
        <a className="pc-ask-btn" href={waLink(`Hi, I'm interested in ${item.description} (${item.wic})`)} target="_blank" rel="noreferrer">
          <MessageCircle size={12} /> Ask for pricing
        </a>
      );
    }
    return (
      <Link href="/portal" className="pc-price-locked">
        <Lock size={11} /> Sign in for price
      </Link>
    );
  };

  const renderCard = (item: PublicCatalogItem) => (
    <ProductCard
      vendor={item.vendor}
      description={item.description}
      wic={item.wic}
      availability={item.availability}
      image={item.image}
      imageBroken={brokenImages.has(item.wic)}
      onImageBroken={() => markImageBroken(item.wic)}
      foot={renderFoot(item)}
    />
  );

  return (
    <>
      {!priced && (
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
              <Link href="/portal" className="pc-pill-btn">
                <LogIn size={13} /> Sign in
              </Link>
            </div>
          </nav>
        </>
      )}

      {priced && (
        <div className="search-field pc-home-search">
          <Search />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search part number, description, or category…" />
        </div>
      )}

      <section className="pc-hero">
        <div className="pc-hero-eyebrow">
          <span>●</span> Now live — {vendorCount || '40+'} authorized vendors, one catalog
        </div>
        <h1 className="pc-hero-title">
          Florence Trading FZCO <em>Live Stock</em>
        </h1>
        <p className="pc-hero-sub">
          {priced
            ? `Real-time trade pricing across ${items.length ? items.length.toLocaleString() : '5,300+'} SKUs and ${vendorCount || '50+'} vendors.`
            : `Apple, Samsung, Logitech, Ubiquiti and ${items.length ? items.length.toLocaleString() : '5,300+'} SKUs, updated in real time. Sign in for trade pricing — everyone else can still see what's in stock right now.`}
        </p>
        {!priced && (
          <div className="pc-hero-ctas">
            <Link href="/portal" className="pc-cta-primary">
              Request trade account →
            </Link>
            <Link href="/portal" className="pc-cta-secondary">
              I have an account
            </Link>
          </div>
        )}
        <div className="pc-hero-wa-row">
          <a className="pc-wa-pill" href={waLink('Hi, I have a question about your stock')} target="_blank" rel="noreferrer">
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
                <a
                  className="pc-cta-primary"
                  href={waLink(`Hi, I'm interested in ${spotlight.description} (${spotlight.wic})`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ask on WhatsApp
                </a>
                {!priced && (
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
                onLoad={(e) => {
                  if (e.currentTarget.naturalWidth <= 4) markImageBroken(spotlight.wic);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {browsingAll ? (
        <>
          {loading && <div className="pc-empty">Loading live stock…</div>}
          {!loading &&
            topGroups.slice(0, CAROUSEL_ROWS).map((group) => (
              <CategoryCarousel
                key={group}
                title={group}
                count={groupCounts.get(group) ?? 0}
                items={(itemsByGroup.get(group) ?? []).slice(0, CAROUSEL_SIZE)}
                renderCard={renderCard}
              />
            ))}
        </>
      ) : (
        <section className="pc-section">
          <div className="pc-section-head">
            <div>
              <div className="pc-section-title">{activeGroup === 'all' ? 'Search results' : activeGroup}</div>
              <div className="pc-section-sub">
                {loading ? 'Loading live stock…' : `${filtered.length.toLocaleString()} items ${search ? 'matching your search' : 'in stock'}`}
              </div>
            </div>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="pc-empty">No items match “{search}”. Try a different search or category.</div>
          )}

          <div className="pc-grid">
            {visibleItems.map((item) => (
              <div key={`${item.vendor}-${item.wic}`}>{renderCard(item)}</div>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="pc-load-more">
              <button className="pc-cta-secondary" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Show more ({filtered.length - visibleCount} left)
              </button>
            </div>
          )}
        </section>
      )}

      {!priced && (
        <footer className="pc-footer">Florence Trading FZCO · DAFZA & JAFZA, Dubai · Trade pricing shown to approved accounts only</footer>
      )}
    </>
  );
}
