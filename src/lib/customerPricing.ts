import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { Customer, CategoryMarkup, VendorMarkup } from './customers';
import { getCatalog, CUSTOMER_AVAIL_LABEL, ORIGIN_ACOUSTICS_VENDOR } from './catalog';

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

/**
 * Origin Acoustics' manually-uploaded Stock List, reshaped the same way as the manual Apple sheet.
 * This is the availability-only fallback — used when a customer has the brand enabled but no
 * vendorMarkup entry for it (see getVendorPricedItemsForCustomer for the priced path).
 */
export async function getOriginAcousticsCatalogItems(): Promise<ManualStockCatalogItem[]> {
  const stock = await getStoredList('stock_origin_acoustics');
  if (!stock) return [];

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, [], stock.mapping);

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
 * Asbis Brands table), not retailPrice — retailPrice is IT4Profit's own suggested price and never
 * feeds into what the customer sees.
 */
async function getIt4ProfitPricedItems(
  enabled: Set<string>,
  markupByVendor: Map<string, VendorMarkup>
): Promise<VendorPricedItem[]> {
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

/**
 * Origin Acoustics priced the same way as any IT4Profit vendor brand (per-customer vendorMarkup on
 * top of its own manually-uploaded cost), even though it isn't part of the IT4Profit feed. Since its
 * stock list is a raw quantity (not a yes/on-demand/limited status), it's reduced to "Available" when
 * in stock — same convention as its own availability-only fallback in getOriginAcousticsCatalogItems.
 */
async function getOriginAcousticsPricedItems(
  enabled: Set<string>,
  markupByVendor: Map<string, VendorMarkup>
): Promise<VendorPricedItem[]> {
  if (!enabled.has(ORIGIN_ACOUSTICS_VENDOR)) return [];
  const markup = markupByVendor.get(ORIGIN_ACOUSTICS_VENDOR);
  if (!markup) return [];

  const [stock, price] = await Promise.all([getStoredList('stock_origin_acoustics'), getStoredList('price_origin_acoustics')]);
  if (!stock || !price) return [];

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  const results: VendorPricedItem[] = [];
  for (const row of merged.rows) {
    if (row.stock === null || row.stock <= 0 || row.price === null) continue;
    results.push({
      partNumber: row.partNumber,
      description: row.description,
      category: row.category,
      vendor: ORIGIN_ACOUSTICS_VENDOR,
      availability: 'Available',
      price: applyMarkup(row.price, markup),
    });
  }
  return results;
}

/**
 * getIt4ProfitPricedItems scans the full IT4Profit catalog (thousands of items) to build this
 * result, which is expensive to redo on every ~15s portal poll — especially for customers who've
 * been given a markup on most/all vendors, where the scan can't be narrowed down by vendor. The
 * priced result only actually changes when an admin re-syncs the catalog or edits this customer's
 * markups, so it's safe to reuse a short-lived per-customer copy instead of recomputing every poll.
 */
const pricedItemsCache = new Map<string, { data: VendorPricedItem[]; expiresAt: number }>();
const PRICED_ITEMS_CACHE_TTL_MS = 45_000;

export async function getVendorPricedItemsForCustomer(
  customer: Pick<Customer, 'id' | 'enabledBrands' | 'vendorMarkups'>
): Promise<VendorPricedItem[]> {
  if (customer.vendorMarkups.length === 0) return [];

  const now = Date.now();
  const cached = pricedItemsCache.get(customer.id);
  if (cached && cached.expiresAt > now) return cached.data;

  const enabled = new Set(customer.enabledBrands);
  const markupByVendor = new Map(customer.vendorMarkups.map((m) => [m.vendor, m]));

  const [it4profitItems, originAcousticsItems] = await Promise.all([
    getIt4ProfitPricedItems(enabled, markupByVendor),
    getOriginAcousticsPricedItems(enabled, markupByVendor),
  ]);
  const result = [...it4profitItems, ...originAcousticsItems];
  pricedItemsCache.set(customer.id, { data: result, expiresAt: now + PRICED_ITEMS_CACHE_TTL_MS });
  return result;
}
