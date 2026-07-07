'use client';

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

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted">
        No categories found yet — upload a Stock/Price file with a Category column mapped to see options here.
      </p>
    );
  }

  return (
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
  );
}
