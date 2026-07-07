'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Copy, Check, UserPlus, LogOut } from 'lucide-react';
import { PublicCustomer, MarkupType } from '@/lib/customers';
import { fetchCustomers, createCustomerApi } from '@/lib/customerApi';
import { Card, SectionHeader, Field, TextInput, NumberInput, SelectInput } from '@/components/ui';
import { CustomerRow } from '@/components/CustomerRow';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [markupType, setMarkupType] = useState<MarkupType>('percent');
  const [markupValue, setMarkupValue] = useState(20);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPortalUrl(`${window.location.origin}/portal`);
    fetchCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    setCreating(true);
    try {
      const customer = await createCustomerApi({
        name,
        email,
        password,
        markupType,
        markupValue: markupType === 'percent' ? markupValue / 100 : markupValue,
      });
      setCustomers((prev) => [...prev, customer]);
      setName('');
      setEmail('');
      setPassword('');
      setMarkupValue(20);
      setMarkupType('percent');
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
        <SectionHeader title="Customer Portal Link" subtitle="Share this link — customers log in with their own email/password" />
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

      <Card className="mb-5">
        <SectionHeader step="①" title="Add Customer" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Customer Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Al Futtaim Trading" />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set an initial password" />
          </Field>
          <Field label="Markup Type">
            <SelectInput
              value={markupType}
              onValueChange={(v) => setMarkupType(v as MarkupType)}
              options={[
                { value: 'percent', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed Amount (AED)' },
              ]}
            />
          </Field>
          <Field label={markupType === 'percent' ? 'Markup %' : 'Markup (AED)'}>
            <NumberInput value={markupValue} onValueChange={setMarkupValue} />
          </Field>
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
        <SectionHeader step="②" title="Customers" subtitle={`${customers.length} account${customers.length === 1 ? '' : 's'}`} />
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted">No customers yet — add one above.</p>
        ) : (
          <div>
            {customers.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
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
