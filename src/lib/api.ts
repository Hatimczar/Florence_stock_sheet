import { ParsedFile } from './parseFile';
import { ListMapping } from './merge';

export interface StoredList {
  file: ParsedFile;
  mapping: ListMapping;
  uploadedAt: string;
}

export type ListKind = 'stock' | 'price';

export async function fetchList(kind: ListKind): Promise<StoredList | null> {
  const res = await fetch(`/api/${kind}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${kind} list`);
  const data = (await res.json()) as { list: StoredList | null };
  return data.list;
}

export async function uploadList(kind: ListKind, file: ParsedFile, mapping: ListMapping): Promise<StoredList> {
  const res = await fetch(`/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, mapping }),
  });
  if (!res.ok) throw new Error(`Failed to upload ${kind} list`);
  const data = (await res.json()) as { list: StoredList };
  return data.list;
}

export async function updateListMapping(kind: ListKind, mapping: Partial<ListMapping>): Promise<StoredList> {
  const res = await fetch(`/api/${kind}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping }),
  });
  if (!res.ok) throw new Error(`Failed to update ${kind} mapping`);
  const data = (await res.json()) as { list: StoredList };
  return data.list;
}

export async function clearList(kind: ListKind): Promise<void> {
  const res = await fetch(`/api/${kind}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to clear ${kind} list`);
}

export async function updateStockItem(partNumber: string, newStock: number): Promise<StoredList> {
  const res = await fetch('/api/admin/stock-item', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partNumber, newStock }),
  });
  const data = (await res.json()) as { list?: StoredList; error?: string };
  if (!res.ok || !data.list) throw new Error(data.error || 'Failed to update stock');
  return data.list;
}
