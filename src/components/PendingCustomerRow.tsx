'use client';

import { useState } from 'react';
import { Trash2, UserCheck } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { approveCustomerApi, deleteCustomerApi } from '@/lib/customerApi';
import { CategoryMarkupEditor } from './CategoryMarkupEditor';
import { BrandAccessEditor } from './BrandAccessEditor';

export function PendingCustomerRow({
  customer,
  categories,
  vendors,
  onApproved,
  onRejected,
}: {
  customer: PublicCustomer;
  categories: string[];
  vendors: string[];
  onApproved: (c: PublicCustomer) => void;
  onRejected: (id: string) => void;
}) {
  const [categoryMarkups, setCategoryMarkups] = useState<CategoryMarkup[]>([]);
  const [enabledBrands, setEnabledBrands] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    if (categoryMarkups.length === 0 && enabledBrands.length === 0) {
      setError('Enable at least one category or brand to approve this customer.');
      return;
    }
    setSaving(true);
    try {
      const approved = await approveCustomerApi(customer.id, categoryMarkups, enabledBrands);
      onApproved(approved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve customer');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(`Reject and delete the signup from ${customer.email}?`)) return;
    await deleteCustomerApi(customer.id);
    onRejected(customer.id);
  };

  return (
    <div className="customer-card">
      <div className="customer-card-head">
        <div className="customer-avatar">{(customer.name || customer.email).slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="customer-name">
            {customer.name} <span className="pill pill-orange">Pending</span>
          </div>
          <div className="customer-sub">
            {customer.companyName} · {customer.email} · Signed up {new Date(customer.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="perm-label">Grant access to categories</div>
      <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />

      <div className="perm-label" style={{ marginTop: 12 }}>
        Grant access to vendor catalog brands
      </div>
      <div className="perm-row">
        <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
      </div>

      {error && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleApprove} disabled={saving} className="toolbar-btn primary">
          <UserCheck /> {saving ? 'Approving…' : 'Approve'}
        </button>
        <button onClick={handleReject} className="toolbar-btn" style={{ color: 'var(--loss)' }}>
          <Trash2 /> Reject
        </button>
      </div>
    </div>
  );
}
