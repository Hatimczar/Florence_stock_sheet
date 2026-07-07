'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { LogOut, Search, PackageSearch, RefreshCw } from 'lucide-react';
import { Card, SectionHeader, Field, TextInput, StatCard, Badge } from '@/components/ui';

interface CustomerInfo {
  name: string;
  email: string;
}

interface LookupResult {
  partNumber: string;
  description: string;
  category: string;
  stock: number;
  price: number;
}

export default function PortalPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [items, setItems] = useState<LookupResult[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const handleLogin = async () => {
    setLoginError(null);
    if (!email || !password) {
      setLoginError('Enter your email and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; name?: string; email?: string; error?: string };
      if (!res.ok || !data.ok) {
        setLoginError(data.error || 'Invalid email or password');
        return;
      }
      setCustomer({ name: data.name!, email: data.email! });
      setPassword('');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
    setItems([]);
    setSearch('');
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {logoBadge}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Florence <span className="text-accent">Client Portal</span>
            </h1>
            <p className="text-xs text-muted">Sign in to check stock and pricing</p>
          </div>
        </div>
        <Card>
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="you@company.com"
            />
          </Field>
          <div className="mt-3">
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
              />
            </Field>
          </div>
          {loginError && <p className="mt-3 text-xs text-loss">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loggingIn ? 'Signing in…' : 'Sign In'}
          </button>
        </Card>
      </div>
    );
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

        <div className="mb-3">
          <StatCard label="Items Available" value={loadingItems ? '…' : String(filtered.length)} />
        </div>

        <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-surface-muted">
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
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
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <PackageSearch size={24} />
                      {items.length === 0 ? 'Nothing available yet — check back soon.' : 'No matches for this search.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.partNumber} className="border-t border-border/60">
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
