import { normalizePartNumber } from './parseFile';

export const UNCATEGORIZED = 'Uncategorized';

export interface ListMapping {
  partNumberCol: string;
  valueCol: string;
  descriptionCol?: string | null;
  categoryCol?: string | null;
}

export interface MergedRow {
  partNumber: string;
  description: string;
  category: string;
  stock: number | null;
  price: number | null;
  stockDuplicateCount: number;
  priceDuplicateCount: number;
  status: 'matched' | 'missing-stock' | 'missing-price';
}

export interface MergeResult {
  rows: MergedRow[];
  totalMatched: number;
  totalMissingStock: number;
  totalMissingPrice: number;
  duplicatePartNumbers: string[];
}

function parseNumeric(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface Aggregated {
  value: number;
  description: string;
  category: string;
  occurrences: number;
}

function aggregate(
  rows: Record<string, string | number>[],
  mapping: ListMapping,
  combine: 'sum' | 'last'
): Map<string, Aggregated> {
  const map = new Map<string, Aggregated>();

  for (const row of rows) {
    const rawPartNumber = row[mapping.partNumberCol];
    if (rawPartNumber === undefined || rawPartNumber === null || String(rawPartNumber).trim() === '') continue;
    const partNumber = normalizePartNumber(rawPartNumber);

    const value = parseNumeric(row[mapping.valueCol]);
    const description = mapping.descriptionCol ? String(row[mapping.descriptionCol] ?? '').trim() : '';
    const category = mapping.categoryCol ? String(row[mapping.categoryCol] ?? '').trim() : '';

    const existing = map.get(partNumber);
    if (!existing) {
      map.set(partNumber, { value: value ?? 0, description, category, occurrences: 1 });
      continue;
    }

    existing.occurrences += 1;
    if (!existing.description && description) existing.description = description;
    if (!existing.category && category) existing.category = category;
    if (value !== null) {
      existing.value = combine === 'sum' ? existing.value + value : value;
    }
  }

  return map;
}

export function mergeStockAndPrice(
  stockRows: Record<string, string | number>[],
  stockMapping: ListMapping,
  priceRows: Record<string, string | number>[],
  priceMapping: ListMapping
): MergeResult {
  const stockMap = aggregate(stockRows, stockMapping, 'sum');
  const priceMap = aggregate(priceRows, priceMapping, 'last');

  // Preserve Stock File order: stock rows first (in their original sequence),
  // then any price-only part numbers appended in their price-file sequence.
  const orderedPartNumbers = [
    ...stockMap.keys(),
    ...Array.from(priceMap.keys()).filter((partNumber) => !stockMap.has(partNumber)),
  ];
  const duplicatePartNumbers: string[] = [];

  const rows: MergedRow[] = orderedPartNumbers.map((partNumber) => {
    const stockEntry = stockMap.get(partNumber);
    const priceEntry = priceMap.get(partNumber);

    if ((stockEntry && stockEntry.occurrences > 1) || (priceEntry && priceEntry.occurrences > 1)) {
      duplicatePartNumbers.push(partNumber);
    }

    const status: MergedRow['status'] = !stockEntry ? 'missing-stock' : !priceEntry ? 'missing-price' : 'matched';

    return {
      partNumber,
      description: stockEntry?.description || priceEntry?.description || '',
      category: stockEntry?.category || priceEntry?.category || UNCATEGORIZED,
      stock: stockEntry ? stockEntry.value : null,
      price: priceEntry ? priceEntry.value : null,
      stockDuplicateCount: stockEntry?.occurrences ?? 0,
      priceDuplicateCount: priceEntry?.occurrences ?? 0,
      status,
    };
  });

  return {
    rows,
    totalMatched: rows.filter((r) => r.status === 'matched').length,
    totalMissingStock: rows.filter((r) => r.status === 'missing-stock').length,
    totalMissingPrice: rows.filter((r) => r.status === 'missing-price').length,
    duplicatePartNumbers,
  };
}

export function distinctCategories(result: MergeResult): string[] {
  const set = new Set(result.rows.map((r) => r.category));
  return Array.from(set).sort();
}
