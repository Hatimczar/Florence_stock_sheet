import { CatalogItem } from './catalog';

export interface CustomerCatalogItem {
  wic: string;
  description: string;
  vendor: string;
  group: string;
  availability: string;
}

export async function fetchAdminCatalog(): Promise<{ items: CatalogItem[]; syncedAt: string | null }> {
  const res = await fetch('/api/admin/catalog', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load catalog');
  return (await res.json()) as { items: CatalogItem[]; syncedAt: string | null };
}

export async function syncCatalogApi(): Promise<{ itemCount: number; syncedAt: string }> {
  const res = await fetch('/api/admin/catalog/sync', { method: 'POST' });
  const data = (await res.json()) as { itemCount?: number; syncedAt?: string; error?: string };
  if (!res.ok || data.itemCount === undefined || !data.syncedAt) {
    throw new Error(data.error || 'Sync failed');
  }
  return { itemCount: data.itemCount, syncedAt: data.syncedAt };
}

export async function fetchCustomerCatalog(): Promise<CustomerCatalogItem[]> {
  const res = await fetch('/api/customer/catalog', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: CustomerCatalogItem[] };
  return data.items;
}
