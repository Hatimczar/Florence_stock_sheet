import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { Customer, CategoryMarkup } from './customers';

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
