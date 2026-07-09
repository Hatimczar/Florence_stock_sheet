'use client';

import { useState } from 'react';
import { CategoryMarkup, MarkupType } from '@/lib/customers';
import { SelectInput, NumberInput } from './ui';

export function CategoryMarkupEditor({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: CategoryMarkup[];
  onChange: (value: CategoryMarkup[]) => void;
}) {
  const [bulkType, setBulkType] = useState<MarkupType>('percent');
  const [bulkValue, setBulkValue] = useState(20);

  const findEntry = (category: string) => value.find((m) => m.category === category);

  const toggle = (category: string, enabled: boolean) => {
    if (enabled) {
      onChange([...value, { category, markupType: 'percent', markupValue: 0.2 }]);
    } else {
      onChange(value.filter((m) => m.category !== category));
    }
  };

  const updateEntry = (category: string, patch: Partial<CategoryMarkup>) => {
    onChange(value.map((m) => (m.category === category ? { ...m, ...patch } : m)));
  };

  const allSelected = categories.length > 0 && categories.every((c) => findEntry(c));
  const toggleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(categories.map((c) => findEntry(c) ?? { category: c, markupType: 'percent', markupValue: 0.2 }));
    }
  };

  const applyToAll = () => {
    const markupValue = bulkType === 'percent' ? bulkValue / 100 : bulkValue;
    onChange(categories.map((c) => ({ category: c, markupType: bulkType, markupValue })));
  };

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted">
        No categories found yet — upload a Stock/Price file with a Category column mapped to see options here.
      </p>
    );
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
            { value: 'fixed', label: 'Fixed (AED)' },
          ]}
          className="w-auto min-w-[7.5rem]"
        />
        <NumberInput
          value={bulkValue}
          onValueChange={setBulkValue}
          placeholder={bulkType === 'percent' ? 'e.g. 20 for 20%' : 'e.g. 50 AED'}
          className="w-24"
        />
        <button
          onClick={applyToAll}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
        >
          Apply to All
        </button>
      </div>

      <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border">
        {categories.map((category) => {
          const entry = findEntry(category);
          const enabled = !!entry;
          return (
            <div key={category} className="p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggle(category, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                />
                <span className="font-medium">{category}</span>
              </label>
              {enabled && entry && (
                <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                  <SelectInput
                    value={entry.markupType}
                    onValueChange={(v) => {
                      // Convert the displayed number when switching units so the value doesn't jump unexpectedly.
                      const newType = v as MarkupType;
                      const newValue =
                        newType === 'percent' && entry.markupType === 'fixed'
                          ? 0.2
                          : newType === 'fixed' && entry.markupType === 'percent'
                            ? 0
                            : entry.markupValue;
                      updateEntry(category, { markupType: newType, markupValue: newValue });
                    }}
                    options={[
                      { value: 'percent', label: 'Percentage' },
                      { value: 'fixed', label: 'Fixed (AED)' },
                    ]}
                  />
                  <NumberInput
                    value={entry.markupType === 'percent' ? +(entry.markupValue * 100).toFixed(2) : entry.markupValue}
                    onValueChange={(n) => updateEntry(category, { markupValue: entry.markupType === 'percent' ? n / 100 : n })}
                    placeholder={entry.markupType === 'percent' ? 'e.g. 20 for 20%' : 'e.g. 50 AED'}
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
