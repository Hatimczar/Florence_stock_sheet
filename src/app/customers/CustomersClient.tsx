'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, UserPlus } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { fetchCustomers, createCustomerApi, fetchCategories, fetchCatalogVendors } from '@/lib/customerApi';
import { Card, SectionHeader, Field, TextInput, Badge } from '@/components/ui';
import { CustomerRow } from '@/components/CustomerRow';
import { PendingCustomerRow } from '@/components/PendingCustomerRow';
import { CategoryMarkupEditor } from '@/components/CategoryMarkupEditor';
import { BrandAccessEditor } from '@/components/BrandAccessEditor';
import { AdminGate } from '@/components/AdminGate';
import { AdminShell } from '@/components/AdminShell';

export default function CustomersClient() {
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
  const [enabledBrands, setEnabledBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPortalUrl(`${window.location.origin}/portal`);
    fetchCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
    fetchCategories().then(setCategories);
    fetchCatalogVendors().then(setVendors);
  }, []);

  const pending = useMemo(() => customers.filter((c) => c.status === 'pending'), [customers]);
  const active = useMemo(() => customers.filter((c) => c.status !== 'pending'), [customers]);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (categoryMarkups.length === 0 && enabledBrands.length === 0) {
      setError('Enable at least one category or brand for this customer.');
      return;
    }
    setCreating(true);
    try {
      const customer = await createCustomerApi({ name, companyName, email, password, categoryMarkups, enabledBrands });
      setCustomers((prev) => [...prev, customer]);
      setName('');
      setCompanyName('');
      setEmail('');
      setPassword('');
      setCategoryMarkups([]);
      setEnabledBrands([]);
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

  return (
    <AdminShell active="customers" title="Customers">
      <Card className="mb-5">
        <SectionHeader title="Customer Portal Link" subtitle="Share this link — customers sign up with their own details" />
        <div className="flex items-center gap-2">
          <TextInput readOnly value={portalUrl} className="flex-1" />
          <button
            onClick={handleCopyLink}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
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
                vendors={vendors}
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
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Vendor catalog brands this customer can browse — no price shown to them
          </span>
          <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
        </div>
        {error && <p className="mt-3 text-xs text-loss">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                vendors={vendors}
                onUpdated={(updated) => setCustomers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
                onDeleted={(id) => setCustomers((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
