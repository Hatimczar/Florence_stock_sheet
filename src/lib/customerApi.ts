import { PublicCustomer, CategoryMarkup } from './customers';

export async function fetchCustomers(): Promise<PublicCustomer[]> {
  const res = await fetch('/api/admin/customers', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load customers');
  const data = (await res.json()) as { customers: PublicCustomer[] };
  return data.customers;
}

export async function fetchCategories(): Promise<string[]> {
  const res = await fetch('/api/admin/categories', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load categories');
  const data = (await res.json()) as { categories: string[] };
  return data.categories;
}

export async function createCustomerApi(params: {
  email: string;
  name: string;
  companyName?: string;
  password: string;
  categoryMarkups: CategoryMarkup[];
  enabledBrands?: string[];
}): Promise<PublicCustomer> {
  const res = await fetch('/api/admin/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { customer?: PublicCustomer; error?: string };
  if (!res.ok || !data.customer) throw new Error(data.error || 'Failed to create customer');
  return data.customer;
}

export async function updateCustomerApi(
  id: string,
  patch: { name?: string; password?: string; categoryMarkups?: CategoryMarkup[]; enabledBrands?: string[] }
): Promise<PublicCustomer> {
  const res = await fetch(`/api/admin/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as { customer?: PublicCustomer; error?: string };
  if (!res.ok || !data.customer) throw new Error(data.error || 'Failed to update customer');
  return data.customer;
}

export async function deleteCustomerApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete customer');
}

export async function approveCustomerApi(
  id: string,
  categoryMarkups: CategoryMarkup[],
  enabledBrands: string[] = []
): Promise<PublicCustomer> {
  const res = await fetch(`/api/admin/customers/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryMarkups, enabledBrands }),
  });
  const data = (await res.json()) as { customer?: PublicCustomer; error?: string };
  if (!res.ok || !data.customer) throw new Error(data.error || 'Failed to approve customer');
  return data.customer;
}

export async function fetchCatalogVendors(): Promise<string[]> {
  const res = await fetch('/api/admin/catalog/vendors', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { vendors: string[] };
  return data.vendors;
}
