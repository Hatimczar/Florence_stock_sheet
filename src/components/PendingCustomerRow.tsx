'use client';

import { useState } from 'react';
import { Trash2, UserCheck } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { approveCustomerApi, deleteCustomerApi } from '@/lib/customerApi';
import { Badge } from './ui';
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
    <div className="border-t border-border/60 py-3 first:border-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{customer.name}</span>
        <Badge tone="warn">Pending</Badge>
      </div>
      <div className="mb-3 text-xs text-muted">
        {customer.companyName} · {customer.email} · Signed up {new Date(customer.createdAt).toLocaleDateString()}
      </div>
      <span className="mb-1.5 block text-xs font-medium text-muted">Grant access to categories</span>
      <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />
      <span className="mb-1.5 mt-3 block text-xs font-medium text-muted">Grant access to vendor catalog brands</span>
      <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
      {error && <p className="mt-2 text-xs text-loss">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleApprove}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <UserCheck size={14} /> {saving ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-loss hover:bg-loss-bg"
        >
          <Trash2 size={14} /> Reject
        </button>
      </div>
    </div>
  );
}
