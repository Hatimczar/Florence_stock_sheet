'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Copy, Check, UserPlus, LogOut } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { fetchCustomers, createCustomerApi, fetchCategories } from '@/lib/customerApi';
import { Card, SectionHeader, Field, TextInput, Badge } from '@/components/ui';
import { CustomerRow } from '@/components/CustomerRow';
import { PendingCustomerRow } from '@/components/PendingCustomerRow';
import { CategoryMarkupEditor } from '@/components/CategoryMarkupEditor';
import { AdminGate } from '@/components/AdminGate';

export default function CustomersPage() {
  return (
    <AdminGate>
      <CustomersContent />
    </AdminGate>
  );
}

function CustomersContent() {
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalUrl, setPortalUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [categoryMarkups, setCategoryMarkups] = useState<CategoryMarkup[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPortalUrl(`${window.location.origin}/portal`);
    fetchCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
    fetchCategories().then(setCategories);
  }, []);

  const pending = useMemo(() => customers.filter((c) => c.status === 'pending'), [customers]);
  const active = useMemo(() => customers.filter((c) => c.status !== 'pending'), [customers]);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (categoryMarkups.length === 0) {
      setError('Enable at least one category for this customer.');
      return;
    }
    setCreating(true);
    try {
      const customer = await createCustomerApi({ name, companyName, email, password, categoryMarkups });
      setCustomers((prev) => [...prev, customer]);
      setName('');
      setCompanyName('');
      setEmail('');
      setPassword('');
      setCategoryMarkups([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create customer');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLogout = async () => {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2">
          <Image src="/florence-icon.png" alt="Florence" width={28} height={28} className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Customer <span className="text-accent">Accounts</span>
          </h1>
          <p className="text-xs text-muted sm:text-sm">Manage who can access the customer portal, and their markup</p>
        </div>
        <Link
          href="/"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
        >
          <LogOut size={14} /> Log Out
        </button>
      </header>

      <Card className="mb-5">
        <SectionHeader title="Customer Portal Link" subtitle="Share this link — customers sign up with their own details" />
        <div className="flex items-center gap-2">
          <TextInput readOnly value={portalUrl} className="flex-1" />
          <button
            onClick={handleCopyLink}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </Card>

      {!loading && pending.length > 0 && (
        <Card className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <SectionHeader title="Pending Approval" subtitle="Customers who signed up themselves — review and grant access" />
            <Badge tone="warn">{pending.length}</Badge>
          </div>
          <div>
            {pending.map((c) => (
              <PendingCustomerRow
                key={c.id}
                customer={c}
                categories={categories}
                onApproved={(approved) => setCustomers((prev) => prev.map((p) => (p.id === approved.id ? approved : p)))}
                onRejected={(id) => setCustomers((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-5">
        <SectionHeader step="①" title="Add Customer Manually" subtitle="Optional — customers can also sign up themselves via the portal link above" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Customer Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Khan" />
          </Field>
          <Field label="Company Name">
            <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Al Futtaim Trading" />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set an initial password" />
          </Field>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Categories this customer can see, with their own markup
          </span>
          <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />
        </div>
        {error && <p className="mt-3 text-xs text-loss">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          <UserPlus size={15} /> {creating ? 'Creating…' : 'Create Customer'}
        </button>
      </Card>

      <Card>
        <SectionHeader step="②" title="Active Customers" subtitle={`${active.length} account${active.length === 1 ? '' : 's'}`} />
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted">No active customers yet.</p>
        ) : (
          <div>
            {active.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                categories={categories}
                onUpdated={(updated) => setCustomers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
                onDeleted={(id) => setCustomers((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
