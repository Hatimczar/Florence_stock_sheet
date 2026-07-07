'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { PublicCustomer, MarkupType } from '@/lib/customers';
import { updateCustomerApi, deleteCustomerApi } from '@/lib/customerApi';
import { Field, TextInput, NumberInput, SelectInput, Badge } from './ui';

function formatMarkup(type: MarkupType, value: number): string {
  return type === 'percent' ? `${(value * 100).toFixed(1)}%` : `AED ${value.toFixed(2)} flat`;
}

export function CustomerRow({
  customer,
  onUpdated,
  onDeleted,
}: {
  customer: PublicCustomer;
  onUpdated: (c: PublicCustomer) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [markupType, setMarkupType] = useState<MarkupType>(customer.markupType);
  const [markupValue, setMarkupValue] = useState(customer.markupType === 'percent' ? customer.markupValue * 100 : customer.markupValue);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomerApi(customer.id, {
        markupType,
        markupValue: markupType === 'percent' ? markupValue / 100 : markupValue,
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
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{customer.name || customer.email}</span>
            <Badge tone="accent">{formatMarkup(customer.markupType, customer.markupValue)}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted">{customer.email}</div>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <Field label="New Password (optional)">
          <TextInput
            type="password"
            placeholder="Leave blank to keep current"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </div>
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
