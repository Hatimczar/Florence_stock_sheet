import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { Customer, CategoryMarkup } from './customers';
import { getCatalog, CUSTOMER_AVAIL_LABEL } from './catalog';

export interface CustomerLookupResult {
  partNumber: string;
  description: string;
  category: string;
  stock: number;
  price: number;
}

export function applyMarkup(cost: number, markup: Pick<CategoryMarkup, 'markupType' | 'markupValue'>): number {
  const price = markup.markupType === 'percent' ? cost * (1 + markup.markupValue) : cost + markup.markupValue;
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

/**
 * Computes every part visible to this customer — i.e. every row that has both
 * stock and cost data, and whose category is in the customer's enabled list —
 * with markup already applied. Only partNumber/description/category/stock/price
 * ever come out of this; cost and the customer's markup rate never do.
 */
async function getVisiblePartsForCustomer(customer: Pick<Customer, 'categoryMarkups'>): Promise<CustomerLookupResult[]> {
  const [stock, price] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (!stock || !price) return [];

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  const results: CustomerLookupResult[] = [];

  for (const row of merged.rows) {
    if (row.stock === null || row.price === null) continue;
    const markup = customer.categoryMarkups.find((m) => m.category === row.category);
    if (!markup) continue;
    results.push({
      partNumber: row.partNumber,
      description: row.description,
      category: row.category,
      stock: row.stock,
      price: applyMarkup(row.price, markup),
    });
  }

  return results;
}

/**
 * Looks up a single part number for a customer-facing request. Returns null
 * (identical whether the part doesn't exist or its category just isn't
 * enabled for this customer) so customers can't discover what they don't
 * have access to.
 */
export async function lookupPartNumberForCustomer(
  rawPartNumber: string,
  customer: Pick<Customer, 'categoryMarkups'>
): Promise<CustomerLookupResult | null> {
  const target = normalizePartNumber(rawPartNumber);
  const visible = await getVisiblePartsForCustomer(customer);
  return visible.find((r) => r.partNumber === target) ?? null;
}

/** Every part this customer is allowed to browse, for the portal's list view. */
export async function browsePartsForCustomer(customer: Pick<Customer, 'categoryMarkups'>): Promise<CustomerLookupResult[]> {
  return getVisiblePartsForCustomer(customer);
}

export interface ManualStockCatalogItem {
  wic: string;
  description: string;
  group: string;
  availability: 'Available';
}

/**
 * The manually-uploaded Stock/Price sheet, reshaped into the same brand-catalog
 * item format as the IT4Profit feed — exposed to customers under the "Apple"
 * brand toggle. No price ever comes out of this; only parts with stock > 0 are
 * included (unstocked/unknown-stock parts are never shown, same as "no" avail
 * on the IT4Profit side).
 */
export async function getManualStockCatalogItems(): Promise<ManualStockCatalogItem[]> {
  const [stock, price] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (!stock) return [];

  const merged = price
    ? mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping)
    : mergeStockAndPrice(stock.file.rows, stock.mapping, [], stock.mapping);

  return merged.rows
    .filter((row) => row.stock !== null && row.stock > 0)
    .map((row) => ({
      wic: row.partNumber,
      description: row.description,
      group: row.category,
      availability: 'Available' as const,
    }));
}

export interface VendorPricedItem {
  partNumber: string;
  description: string;
  category: string;
  vendor: string;
  availability: string;
  price: number;
}

/**
 * Vendor-catalog (IT4Profit) items priced with this customer's per-brand markup — the same idea as
 * Apple's categoryMarkups, but keyed by vendor since customers pick whole brands here rather than
 * categories. A brand only comes out of this when it has a markup entry; unmatched brands stay
 * availability-only via /api/customer/catalog instead. There's no numeric stock count on this feed
 * (only a yes/on-demand/limited status), so availability replaces the Stock column Apple has.
 * Markup is applied on top of myPrice (the admin's own cost, shown as "Cost (USD)" in the admin
 * Vendor Catalog table), not retailPrice — retailPrice is IT4Profit's own suggested price and never
 * feeds into what the customer sees.
 */
export async function getVendorPricedItemsForCustomer(
  customer: Pick<Customer, 'enabledBrands' | 'vendorMarkups'>
): Promise<VendorPricedItem[]> {
  if (customer.vendorMarkups.length === 0) return [];
  const enabled = new Set(customer.enabledBrands);
  const markupByVendor = new Map(customer.vendorMarkups.map((m) => [m.vendor, m]));

  const catalog = await getCatalog();
  if (!catalog) return [];

  const results: VendorPricedItem[] = [];
  for (const item of catalog.items) {
    if (!enabled.has(item.vendor)) continue;
    const markup = markupByVendor.get(item.vendor);
    if (!markup) continue;
    const availLabel = CUSTOMER_AVAIL_LABEL[item.avail];
    if (!availLabel) continue;
    if (item.myPrice === null) continue;
    results.push({
      partNumber: item.wic,
      description: item.description,
      category: item.group,
      vendor: item.vendor,
      availability: availLabel,
      price: applyMarkup(item.myPrice, markup),
    });
  }
  return results;
}
