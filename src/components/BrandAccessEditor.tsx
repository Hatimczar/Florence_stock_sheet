'use client';

import { BrandLogo } from './BrandLogo';

/** Toggle chips granting a customer access to specific brand catalogs (IT4Profit vendors + "Apple" for the manual sheet). No pricing is ever shown to customers. */
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
    return <p style={{ fontSize: 12, color: 'var(--muted)' }}>No brands found yet — sync the IT4Profit catalog from the Catalog page first.</p>;
  }

  return (
    <>
      {vendors.map((vendor) => {
        const enabled = value.includes(vendor);
        return (
          <button key={vendor} type="button" onClick={() => toggle(vendor)} className={`perm-chip ${enabled ? 'on' : 'off'}`}>
            <BrandLogo vendor={vendor} size={14} /> {vendor}
          </button>
        );
      })}
    </>
  );
}
