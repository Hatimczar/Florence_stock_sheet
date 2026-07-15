'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { PublicCustomer, CategoryMarkup, VendorMarkup } from '@/lib/customers';
import { updateCustomerApi, deleteCustomerApi } from '@/lib/customerApi';
import { MANUAL_STOCK_VENDOR } from '@/lib/catalog';

// Apple has its own separate pricing scheme (categoryMarkups), so it doesn't belong in the
// vendor-markup editor — everything else (IT4Profit brands, Origin Acoustics) does.
const VENDOR_MARKUP_EXCLUDED_BRANDS = new Set([MANUAL_STOCK_VENDOR]);
import { CategoryMarkupEditor } from './CategoryMarkupEditor';
import { VendorMarkupEditor } from './VendorMarkupEditor';
import { BrandAccessEditor } from './BrandAccessEditor';
import { BrandLogo } from './BrandLogo';

function formatMarkup(m: CategoryMarkup): string {
  return m.markupType === 'percent' ? `${(m.markupValue * 100).toFixed(1)}%` : `AED ${m.markupValue.toFixed(2)} flat`;
}

function formatVendorMarkup(m: VendorMarkup): string {
  return m.markupType === 'percent' ? `${(m.markupValue * 100).toFixed(1)}%` : `$${m.markupValue.toFixed(2)} flat`;
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
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
  const [appleShowPrices, setAppleShowPrices] = useState(customer.appleShowPrices);
  const [vendorMarkups, setVendorMarkups] = useState<VendorMarkup[]>(customer.vendorMarkups);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasApple = enabledBrands.includes(MANUAL_STOCK_VENDOR);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomerApi(customer.id, {
        categoryMarkups,
        enabledBrands,
        appleShowPrices,
        vendorMarkups,
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

  return (
    <div className="customer-card">
      <div className="customer-card-head">
        <div className="customer-avatar">{initials(customer.name, customer.email)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="customer-name">{customer.name || customer.email}</div>
          <div className="customer-sub">
            {customer.email}
            {customer.companyName && ` · ${customer.companyName}`}
          </div>
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="toolbar-btn" onClick={() => setEditing(true)}>
              <Pencil />
            </button>
            <button className="toolbar-btn" onClick={handleDelete} style={{ color: 'var(--loss)' }}>
              <Trash2 />
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          <div className="perm-label">Categories &amp; markup</div>
          <div className="perm-row" style={{ marginBottom: 12 }}>
            {customer.categoryMarkups.length === 0 ? (
              <span className="pill pill-orange">No categories enabled</span>
            ) : (
              customer.categoryMarkups.map((m) => (
                <span key={m.category} className="pill" style={{ background: 'var(--fill)' }}>
                  {m.category}: {formatMarkup(m)}
                </span>
              ))
            )}
          </div>
          <div className="perm-label">Vendor catalog brands</div>
          <div className="perm-row">
            {customer.enabledBrands.length === 0 ? (
              <span className="pill pill-orange">No brands enabled</span>
            ) : (
              customer.enabledBrands.map((b) => (
                <span key={b} className="pill pill-green" style={{ gap: 4 }}>
                  <BrandLogo vendor={b} size={12} /> {b}
                </span>
              ))
            )}
            {customer.enabledBrands.includes(MANUAL_STOCK_VENDOR) && (
              <span className={`pill ${customer.appleShowPrices ? 'pill-green' : 'pill-orange'}`} style={{ gap: 4 }}>
                <Tag size={11} /> Apple prices: {customer.appleShowPrices ? 'On' : 'Off'}
              </span>
            )}
          </div>
          {customer.vendorMarkups.length > 0 && (
            <>
              <div className="perm-label">Vendor brand pricing</div>
              <div className="perm-row">
                {customer.vendorMarkups.map((m) => (
                  <span key={m.vendor} className="pill" style={{ background: 'var(--fill)', gap: 4 }}>
                    <Tag size={11} /> {m.vendor}: {formatVendorMarkup(m)}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="field-row" style={{ background: 'var(--background)', borderRadius: 'var(--r-sm)', marginBottom: 12 }}>
            <label>New Password (optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep current"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="perm-label">Categories &amp; markup</div>
          <CategoryMarkupEditor categories={categories} value={categoryMarkups} onChange={setCategoryMarkups} />
          <div className="perm-label" style={{ marginTop: 12 }}>
            Vendor catalog brands — priced brands (set below) show real pricing; everything else is availability only
          </div>
          <div className="perm-row">
            <BrandAccessEditor vendors={vendors} value={enabledBrands} onChange={setEnabledBrands} />
          </div>
          {hasApple && (
            <button
              type="button"
              onClick={() => setAppleShowPrices((v) => !v)}
              className={`perm-chip ${appleShowPrices ? 'on' : 'off'}`}
              style={{ marginTop: 8 }}
            >
              <Tag size={13} /> Apple prices: {appleShowPrices ? 'On (customer sees price)' : 'Off (availability only)'}
            </button>
          )}
          {enabledBrands.filter((b) => !VENDOR_MARKUP_EXCLUDED_BRANDS.has(b)).length > 0 && (
            <>
              <div className="perm-label" style={{ marginTop: 12 }}>
                Vendor brand pricing — brands this customer can see, with their own markup
              </div>
              <VendorMarkupEditor
                vendors={enabledBrands.filter((b) => !VENDOR_MARKUP_EXCLUDED_BRANDS.has(b))}
                value={vendorMarkups}
                onChange={setVendorMarkups}
              />
            </>
          )}
          {error && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving} className="toolbar-btn primary">
              <Check /> Save
            </button>
            <button onClick={() => setEditing(false)} className="toolbar-btn">
              <X /> Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
