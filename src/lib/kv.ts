import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ParsedFile } from './parseFile';
import { ListMapping } from './merge';

export interface StoredList {
  file: ParsedFile;
  mapping: ListMapping;
  uploadedAt: string;
}

export type ListKind = 'stock' | 'price';

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
