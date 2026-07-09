'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { PublicCustomer, CategoryMarkup } from '@/lib/customers';
import { updateCustomerApi, deleteCustomerApi } from '@/lib/customerApi';
import { Field, TextInput, Badge } from './ui';
import { CategoryMarkupEditor } from './CategoryMarkupEditor';
import { BrandAccessEditor } from './BrandAccessEditor';

function formatMarkup(m: CategoryMarkup): string {
  return m.markupType === 'percent' ? `${(m.markupValue * 100).toFixed(1)}%` : `AED ${m.markupValue.toFixed(2)} flat`;
}

export function CustomerRow({
  customer,
  categories,
  vendors,
  onUpdated,
  onDeleted,
}: {
  customer: PublicCustomer;
  categories: string[];
  vendors: string[];
  onUpdated: (c: PublicCustomer) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [categoryMarkups, setCategoryMarkups] = useState<CategoryMarkup[]>(customer.categoryMarkups);
  const [enabledBrands, setEnabledBrands] = useState<string[]>(customer.enabledBrands);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomerApi(customer.id, {
        categoryMarkups,
        enabledBrands,
        ...(newPassword ? { password: newPassword } : {}),
      });
      onUpdated(updated);
      setEditing(false);
      setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${customer.email}? They will lose access immediately.`)) return;
    await deleteCustomerApi(customer.id);
    onDeleted(customer.id);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-border/60 py-3 first:border-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{customer.name || customer.email}</span>
            {customer.categoryMarkups.length === 0 ? (
              <Badge tone="warn">No categories enabled</Badge>
            ) : (
              customer.categoryMarkups.map((m) => (
                <Badge key={m.category} tone="accent">
                  {m.category}: {formatMarkup(m)}
                </Badge>
              ))
            )}
            {customer.enabledBrands.length === 0 ? (
              <Badge tone="warn">No brands enabled</Badge>
            ) : (
              customer.enabledBrands.map((b) => (
                <Badge key={b} tone="profit">
                  {b}
                </Badge>
              ))
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {customer.email}
            {customer.companyName && ` · ${customer.companyName}`}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setEditing(true)} className="rounded-lg border border-border p-1.5 hover:bg-surface-muted">
            <Pencil size={14} />
          </button>
          <button onClick={handleDelete} className="rounded-lg border border-border p-1.5 text-loss hover:bg-loss-bg">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 py-3 first:border-0">
      <div className="mb-2 text-sm font-medium">{customer.email}</div>
      <div className="mb-3">
        <Field label="New Password (optional)">
          <TextInput
            type="password"
            placeholder="Leave blank to keep current"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </div>
      <span className="mb-1.5 block text-xs font-medium text-muted">Categories & markup</span>
      <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />
      <span className="mb-1.5 mt-3 block text-xs font-medium text-muted">
        Vendor catalog brands (IT4Profit) — no price shown to customers
      </span>
      <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
      {error && <p className="mt-2 text-xs text-loss">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
        >
          <Check size={14} /> Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
