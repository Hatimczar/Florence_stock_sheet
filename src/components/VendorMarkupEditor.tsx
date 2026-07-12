'use client';

import { useState } from 'react';
import { VendorMarkup, MarkupType } from '@/lib/customers';
import { SelectInput, NumberInput } from './ui';

/** Same idea as CategoryMarkupEditor, but keyed by vendor brand (IT4Profit catalog) instead of
 * category, and priced in USD to match the vendor feed's own currency. Only brands the customer
 * already has access to (via BrandAccessEditor) are offered here — pricing without access makes
 * no sense. */
export function VendorMarkupEditor({
  vendors,
  value,
  onChange,
}: {
  vendors: string[];
  value: VendorMarkup[];
  onChange: (value: VendorMarkup[]) => void;
}) {
  const [bulkType, setBulkType] = useState<MarkupType>('percent');
  const [bulkValue, setBulkValue] = useState(20);

  const findEntry = (vendor: string) => value.find((m) => m.vendor === vendor);

  const toggle = (vendor: string, enabled: boolean) => {
    if (enabled) {
      onChange([...value, { vendor, markupType: 'percent', markupValue: 0.2 }]);
    } else {
      onChange(value.filter((m) => m.vendor !== vendor));
    }
  };

  const updateEntry = (vendor: string, patch: Partial<VendorMarkup>) => {
    onChange(value.map((m) => (m.vendor === vendor ? { ...m, ...patch } : m)));
  };

  const allSelected = vendors.length > 0 && vendors.every((v) => findEntry(v));
  const toggleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(vendors.map((v) => findEntry(v) ?? { vendor: v, markupType: 'percent', markupValue: 0.2 }));
    }
  };

  const applyToAll = () => {
    const markupValue = bulkType === 'percent' ? bulkValue / 100 : bulkValue;
    onChange(vendors.map((v) => ({ vendor: v, markupType: bulkType, markupValue })));
  };

  if (vendors.length === 0) {
    return <p className="text-xs text-muted">Enable at least one vendor brand above to set pricing for it.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-muted p-3">
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-border accent-[var(--accent)]"
          />
          Select All
        </label>
        <span className="hidden text-border sm:inline">|</span>
        <span className="text-xs text-muted">Apply to all:</span>
        <SelectInput
          value={bulkType}
          onValueChange={(v) => setBulkType(v as MarkupType)}
          options={[
            { value: 'percent', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed (USD)' },
          ]}
          className="w-auto min-w-[7.5rem]"
        />
        <NumberInput
          value={bulkValue}
          onValueChange={setBulkValue}
          placeholder={bulkType === 'percent' ? 'e.g. 20 for 20%' : 'e.g. 50 USD'}
          className="w-24"
        />
        <button
          onClick={applyToAll}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Apply to All
        </button>
      </div>

      <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border">
        {vendors.map((vendor) => {
          const entry = findEntry(vendor);
          const enabled = !!entry;
          return (
            <div key={vendor} className="p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggle(vendor, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                />
                <span className="font-medium">{vendor}</span>
              </label>
              {enabled && entry && (
                <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                  <SelectInput
                    value={entry.markupType}
                    onValueChange={(v) => {
                      const newType = v as MarkupType;
                      const newValue =
                        newType === 'percent' && entry.markupType === 'fixed'
                          ? 0.2
                          : newType === 'fixed' && entry.markupType === 'percent'
                            ? 0
                            : entry.markupValue;
                      updateEntry(vendor, { markupType: newType, markupValue: newValue });
                    }}
                    options={[
                      { value: 'percent', label: 'Percentage' },
                      { value: 'fixed', label: 'Fixed (USD)' },
                    ]}
                  />
                  <NumberInput
                    value={entry.markupType === 'percent' ? +(entry.markupValue * 100).toFixed(2) : entry.markupValue}
                    onValueChange={(n) => updateEntry(vendor, { markupValue: entry.markupType === 'percent' ? n / 100 : n })}
                    placeholder={entry.markupType === 'percent' ? 'e.g. 20 for 20%' : 'e.g. 50 USD'}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
