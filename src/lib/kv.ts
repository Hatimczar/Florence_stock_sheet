import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ParsedFile, normalizePartNumber } from './parseFile';
import { ListMapping } from './merge';

export interface StoredList {
  file: ParsedFile;
  mapping: ListMapping;
  uploadedAt: string;
}

export type ListKind = 'stock' | 'price' | 'stock_origin_acoustics';

export async function getStoredList(kind: ListKind): Promise<StoredList | null> {
  const { env } = await getCloudflareContext({ async: true });
  const raw = await env.STOCK_SHEET_KV.get(kind);
  if (!raw) return null;
  return JSON.parse(raw) as StoredList;
}

export async function setStoredList(kind: ListKind, file: ParsedFile, mapping: ListMapping): Promise<StoredList> {
  const { env } = await getCloudflareContext({ async: true });
  const stored: StoredList = { file, mapping, uploadedAt: new Date().toISOString() };
  await env.STOCK_SHEET_KV.put(kind, JSON.stringify(stored));
  return stored;
}

export async function updateStoredMapping(kind: ListKind, mapping: Partial<ListMapping>): Promise<StoredList | null> {
  const existing = await getStoredList(kind);
  if (!existing) return null;
  const { env } = await getCloudflareContext({ async: true });
  const updated: StoredList = { ...existing, mapping: { ...existing.mapping, ...mapping } };
  await env.STOCK_SHEET_KV.put(kind, JSON.stringify(updated));
  return updated;
}

export async function clearStoredList(kind: ListKind): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  await env.STOCK_SHEET_KV.delete(kind);
}

function parseRowNumber(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const n = parseFloat(String(raw ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Manually overrides the stock quantity for one part number, e.g. when a sale
 * happens before the next stock file is uploaded. If the part number appears
 * in more than one row (already flagged elsewhere as a duplicate), the delta
 * is applied to the first matching row so the aggregated total lands on
 * `newValue`, rather than guessing how to split it across rows.
 */
export async function updateStockItemValue(
  partNumber: string,
  newValue: number,
  kind: Extract<ListKind, 'stock' | 'stock_origin_acoustics'> = 'stock'
): Promise<StoredList | null> {
  const existing = await getStoredList(kind);
  if (!existing) return null;

  const target = normalizePartNumber(partNumber);
  const { partNumberCol, valueCol } = existing.mapping;
  const matches = existing.file.rows
    .map((row, idx) => ({ idx, row }))
    .filter(({ row }) => {
      const raw = row[partNumberCol];
      return raw !== undefined && raw !== null && String(raw).trim() !== '' && normalizePartNumber(raw) === target;
    });
  if (matches.length === 0) return null;

  const rows = [...existing.file.rows];
  if (matches.length === 1) {
    const idx = matches[0].idx;
    rows[idx] = { ...rows[idx], [valueCol]: newValue };
  } else {
    const currentTotal = matches.reduce((sum, { row }) => sum + parseRowNumber(row[valueCol]), 0);
    const delta = newValue - currentTotal;
    const idx = matches[0].idx;
    rows[idx] = { ...rows[idx], [valueCol]: parseRowNumber(rows[idx][valueCol]) + delta };
  }

  const updated: StoredList = { ...existing, file: { ...existing.file, rows }, uploadedAt: new Date().toISOString() };
  const { env } = await getCloudflareContext({ async: true });
  await env.STOCK_SHEET_KV.put(kind, JSON.stringify(updated));
  return updated;
}
