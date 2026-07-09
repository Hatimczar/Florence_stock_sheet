'use client';

import clsx from 'clsx';
import { Check, X } from 'lucide-react';

/** Toggle chips granting a customer access to specific IT4Profit vendor/brand catalogs. No pricing is ever shown to customers. */
export function BrandAccessEditor({
  vendors,
  value,
  onChange,
}: {
  vendors: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (vendor: string) => {
    onChange(value.includes(vendor) ? value.filter((v) => v !== vendor) : [...value, vendor]);
  };

  if (vendors.length === 0) {
    return <p className="text-xs text-muted">No brands found yet — sync the IT4Profit catalog from the Catalog page first.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {vendors.map((vendor) => {
        const enabled = value.includes(vendor);
        return (
          <button
            key={vendor}
            type="button"
            onClick={() => toggle(vendor)}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
              enabled ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'
            )}
          >
            {enabled ? <Check size={12} /> : <X size={12} />} {vendor}
          </button>
        );
      })}
    </div>
  );
}
