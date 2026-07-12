import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hashPassword } from './auth';

export type MarkupType = 'percent' | 'fixed';
export type CustomerStatus = 'pending' | 'approved';

export interface CategoryMarkup {
  category: string;
  markupType: MarkupType;
  markupValue: number; // 0.20 for 20% if percent, or AED amount if fixed
}

export interface VendorMarkup {
  vendor: string;
  markupType: MarkupType;
  markupValue: number; // 0.20 for 20% if percent, or USD amount if fixed
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  companyName: string;
  passwordHash: string;
  status: CustomerStatus;
  // Only categories present here are visible to the customer; each has its own markup.
  categoryMarkups: CategoryMarkup[];
  // Vendor/brand names (from the IT4Profit catalog, plus "Apple" for the manual sheet) this customer is allowed to browse.
  enabledBrands: string[];
  // Apple is the one brand that can show real pricing (with this customer's category markup applied). Admin can turn it
  // off per customer to make Apple behave like every other brand — availability only, no price.
  appleShowPrices: boolean;
  // Vendor-catalog brands (Logitech, Kingston, etc.) with their own markup — same idea as categoryMarkups, but
  // keyed by vendor since customers pick whole brands rather than categories for this pipeline. A brand only shows
  // priced (retail price + markup) when it has an entry here; otherwise it stays availability-only.
  vendorMarkups: VendorMarkup[];
  createdAt: string;
}

export type PublicCustomer = Omit<Customer, 'passwordHash'>;

const CUSTOMERS_KEY = 'customers';

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STOCK_SHEET_KV;
}

// Older records predate companyName/status — default them so existing accounts keep working.
function normalizeCustomer(raw: Partial<Customer> & Pick<Customer, 'id' | 'email' | 'passwordHash'>): Customer {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name ?? '',
    companyName: raw.companyName ?? '',
    passwordHash: raw.passwordHash,
    status: raw.status ?? 'approved',
    categoryMarkups: raw.categoryMarkups ?? [],
    enabledBrands: raw.enabledBrands ?? [],
    appleShowPrices: raw.appleShowPrices ?? true,
    vendorMarkups: raw.vendorMarkups ?? [],
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const kv = await getKv();
  const raw = await kv.get(CUSTOMERS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as Array<Partial<Customer> & Pick<Customer, 'id' | 'email' | 'passwordHash'>>;
  return parsed.map(normalizeCustomer);
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

/** Admin-created customer: active immediately, admin sets categories up front. */
export async function createCustomer(params: {
  email: string;
  name: string;
  companyName?: string;
  password: string;
  categoryMarkups: CategoryMarkup[];
  enabledBrands?: string[];
  appleShowPrices?: boolean;
  vendorMarkups?: VendorMarkup[];
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
    companyName: params.companyName?.trim() ?? '',
    passwordHash: await hashPassword(params.password),
    status: 'approved',
    categoryMarkups: params.categoryMarkups,
    enabledBrands: params.enabledBrands ?? [],
    appleShowPrices: params.appleShowPrices ?? true,
    vendorMarkups: params.vendorMarkups ?? [],
    createdAt: new Date().toISOString(),
  };
  customers.push(customer);
  await saveCustomers(customers);
  const { passwordHash: _passwordHash, ...publicCustomer } = customer;
  return publicCustomer;
}

/** Customer self-signup via the portal: created with no category access until an admin approves them. */
export async function createSignup(params: {
  email: string;
  name: string;
  companyName: string;
  password: string;
}): Promise<PublicCustomer> {
  const customers = await listCustomers();
  const normalizedEmail = params.email.trim().toLowerCase();
  if (customers.some((c) => c.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists');
  }
  const customer: Customer = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: params.name.trim(),
    companyName: params.companyName.trim(),
    passwordHash: await hashPassword(params.password),
    status: 'pending',
    categoryMarkups: [],
    enabledBrands: [],
    appleShowPrices: true,
    vendorMarkups: [],
    createdAt: new Date().toISOString(),
  };
  customers.push(customer);
  await saveCustomers(customers);
  const { passwordHash: _passwordHash, ...publicCustomer } = customer;
  return publicCustomer;
}

/** Admin approves a pending signup by granting category and/or brand access. */
export async function approveCustomer(
  id: string,
  categoryMarkups: CategoryMarkup[],
  enabledBrands: string[] = [],
  vendorMarkups: VendorMarkup[] = []
): Promise<PublicCustomer | null> {
  const customers = await listCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated: Customer = { ...customers[idx], status: 'approved', categoryMarkups, enabledBrands, vendorMarkups };
  customers[idx] = updated;
  await saveCustomers(customers);
  const { passwordHash: _passwordHash, ...publicCustomer } = updated;
  return publicCustomer;
}

export async function updateCustomer(
  id: string,
  patch: Partial<
    Pick<Customer, 'name' | 'companyName' | 'categoryMarkups' | 'enabledBrands' | 'appleShowPrices' | 'vendorMarkups'>
  > & {
    password?: string;
  }
): Promise<PublicCustomer | null> {
  const customers = await listCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const existing = customers[idx];
  const updated: Customer = {
    ...existing,
    name: patch.name ?? existing.name,
    companyName: patch.companyName ?? existing.companyName,
    categoryMarkups: patch.categoryMarkups ?? existing.categoryMarkups,
    enabledBrands: patch.enabledBrands ?? existing.enabledBrands,
    appleShowPrices: patch.appleShowPrices ?? existing.appleShowPrices,
    vendorMarkups: patch.vendorMarkups ?? existing.vendorMarkups,
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
