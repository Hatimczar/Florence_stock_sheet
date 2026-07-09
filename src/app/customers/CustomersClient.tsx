'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, UserPlus, Tag } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { fetchCustomers, createCustomerApi, fetchCategories, fetchCatalogVendors } from '@/lib/customerApi';
import { MANUAL_STOCK_VENDOR } from '@/lib/catalog';
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
  const [appleShowPrices, setAppleShowPrices] = useState(true);
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
      const customer = await createCustomerApi({ name, companyName, email, password, categoryMarkups, enabledBrands, appleShowPrices });
      setCustomers((prev) => [...prev, customer]);
      setName('');
      setCompanyName('');
      setEmail('');
      setPassword('');
      setCategoryMarkups([]);
      setEnabledBrands([]);
      setAppleShowPrices(true);
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
      <div className="section-header">Customer Portal Link</div>
      <div className="card">
        <div className="row">
          <input
            readOnly
            value={portalUrl}
            style={{ flex: 1, font: 'inherit', fontSize: 13, border: 'none', background: 'transparent', color: 'var(--foreground)' }}
          />
          <button onClick={handleCopyLink} className="toolbar-btn primary">
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {!loading && pending.length > 0 && (
        <>
          <div className="section-header">Pending Approval · {pending.length}</div>
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
        </>
      )}

      <div className="section-header">① Add Customer Manually</div>
      <div className="card">
        <div className="field-row">
          <label>Customer Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Khan" />
        </div>
        <div className="field-row">
          <label>Company Name</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Al Futtaim Trading" />
        </div>
        <div className="field-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
        </div>
        <div className="field-row">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set an initial password" />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="perm-label">Categories this customer can see, with their own markup</div>
        <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="perm-label">Vendor catalog brands — Apple shows real pricing (with markup); every other brand is availability only</div>
        <div className="perm-row">
          <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
        </div>
      </div>

      {enabledBrands.includes(MANUAL_STOCK_VENDOR) && (
        <button
          type="button"
          onClick={() => setAppleShowPrices((v) => !v)}
          className={`perm-chip ${appleShowPrices ? 'on' : 'off'}`}
          style={{ marginTop: 12 }}
        >
          <Tag size={13} /> Apple prices: {appleShowPrices ? 'On (customer sees price)' : 'Off (availability only)'}
        </button>
      )}

      {error && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}
      <button onClick={handleCreate} disabled={creating} className="toolbar-btn primary" style={{ marginTop: 16, padding: '9px 16px' }}>
        <UserPlus size={15} /> {creating ? 'Creating…' : 'Create Customer'}
      </button>

      <div className="section-header" style={{ marginTop: 28 }}>
        ② Active Customers · {active.length}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</p>
      ) : active.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No active customers yet.</p>
      ) : (
        active.map((c) => (
          <CustomerRow
            key={c.id}
            customer={c}
            categories={categories}
            vendors={vendors}
            onUpdated={(updated) => setCustomers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
            onDeleted={(id) => setCustomers((prev) => prev.filter((p) => p.id !== id))}
          />
        ))
      )}
    </AdminShell>
  );
}
