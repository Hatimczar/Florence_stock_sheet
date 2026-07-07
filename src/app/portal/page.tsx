'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { LogOut, Search, PackageSearch } from 'lucide-react';
import { Card, SectionHeader, Field, TextInput, StatCard, Badge } from '@/components/ui';

interface CustomerInfo {
  name: string;
  email: string;
}

interface LookupResult {
  partNumber: string;
  description: string;
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

  const [partNumber, setPartNumber] = useState('');
  const [result, setResult] = useState<LookupResult | null | undefined>(undefined); // undefined = no search yet
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
    setResult(undefined);
    setPartNumber('');
  };

  const handleSearch = async () => {
    setSearchError(null);
    if (!partNumber.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/customer/lookup?partNumber=${encodeURIComponent(partNumber.trim())}`);
      if (res.status === 401) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { result: LookupResult | null };
      setResult(data.result);
    } catch {
      setSearchError('Could not search right now. Please try again.');
    } finally {
      setSearching(false);
    }
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
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        {logoBadge}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Florence <span className="text-accent">Client Portal</span>
          </h1>
          <p className="truncate text-xs text-muted">{customer.name} · {customer.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
        >
          <LogOut size={14} /> Log Out
        </button>
      </header>

      <Card>
        <SectionHeader title="Check Stock & Price" subtitle="Enter a part number to look it up" />
        <div className="flex gap-2">
          <TextInput
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. MC123AB/A"
            className="flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            <Search size={15} /> {searching ? '…' : 'Search'}
          </button>
        </div>
        {searchError && <p className="mt-3 text-xs text-loss">{searchError}</p>}

        {result !== undefined && (
          <div className="mt-5 border-t border-border pt-5">
            {result === null ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
                <PackageSearch size={28} />
                <p className="text-sm">No match found for &ldquo;{partNumber}&rdquo;</p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{result.partNumber}</span>
                  {result.description && <span className="truncate text-sm text-muted">{result.description}</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Available Stock" value={String(result.stock)} tone={result.stock > 0 ? 'profit' : 'loss'} />
                  <StatCard label="Price" value={`AED ${result.price.toFixed(2)}`} tone="accent" />
                </div>
                {result.stock === 0 && (
                  <div className="mt-3">
                    <Badge tone="loss">Out of Stock</Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
