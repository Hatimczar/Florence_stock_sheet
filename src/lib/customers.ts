import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hashPassword } from './auth';

export type MarkupType = 'percent' | 'fixed';

export interface CategoryMarkup {
  category: string;
  markupType: MarkupType;
  markupValue: number; // 0.20 for 20% if percent, or AED amount if fixed
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  // Only categories present here are visible to the customer; each has its own markup.
  categoryMarkups: CategoryMarkup[];
  createdAt: string;
}

export type PublicCustomer = Omit<Customer, 'passwordHash'>;

const CUSTOMERS_KEY = 'customers';

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STOCK_SHEET_KV;
}

export async function listCustomers(): Promise<Customer[]> {
  const kv = await getKv();
  const raw = await kv.get(CUSTOMERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Customer[];
}

export async function listPublicCustomers(): Promise<PublicCustomer[]> {
  const customers = await listCustomers();
  return customers.map(({ passwordHash: _passwordHash, ...rest }) => rest);
}

async function saveCustomers(customers: Customer[]): Promise<void> {
  const kv = await getKv();
  await kv.put(CUSTOMERS_KEY, JSON.stringify(customers));
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const customers = await listCustomers();
  const normalized = email.trim().toLowerCase();
  return customers.find((c) => c.email.toLowerCase() === normalized) ?? null;
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  const customers = await listCustomers();
  return customers.find((c) => c.id === id) ?? null;
}

export async function createCustomer(params: {
  email: string;
  name: string;
  password: string;
  categoryMarkups: CategoryMarkup[];
}): Promise<PublicCustomer> {
  const customers = await listCustomers();
  const normalizedEmail = params.email.trim().toLowerCase();
  if (customers.some((c) => c.email.toLowerCase() === normalizedEmail)) {
    throw new Error('A customer with this email already exists');
  }
  const customer: Customer = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: params.name.trim(),
    passwordHash: await hashPassword(params.password),
    categoryMarkups: params.categoryMarkups,
    createdAt: new Date().toISOString(),
  };
  customers.push(customer);
  await saveCustomers(customers);
  const { passwordHash: _passwordHash, ...publicCustomer } = customer;
  return publicCustomer;
}

export async function updateCustomer(
  id: string,
  patch: Partial<Pick<Customer, 'name' | 'categoryMarkups'>> & { password?: string }
): Promise<PublicCustomer | null> {
  const customers = await listCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const existing = customers[idx];
  const updated: Customer = {
    ...existing,
    name: patch.name ?? existing.name,
    categoryMarkups: patch.categoryMarkups ?? existing.categoryMarkups,
    passwordHash: patch.password ? await hashPassword(patch.password) : existing.passwordHash,
  };
  customers[idx] = updated;
  await saveCustomers(customers);
  const { passwordHash: _passwordHash, ...publicCustomer } = updated;
  return publicCustomer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const customers = await listCustomers();
  await saveCustomers(customers.filter((c) => c.id !== id));
}
