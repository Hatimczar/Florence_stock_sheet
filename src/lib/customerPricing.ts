import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { Customer, CategoryMarkup } from './customers';

export interface CustomerLookupResult {
  partNumber: string;
  description: string;
  stock: number;
  price: number;
}

export function applyMarkup(cost: number, markup: Pick<CategoryMarkup, 'markupType' | 'markupValue'>): number {
  const price = markup.markupType === 'percent' ? cost * (1 + markup.markupValue) : cost + markup.markupValue;
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

/**
 * Looks up a part number for a customer-facing request. Only ever returns
 * partNumber, description, stock, and the final marked-up price — never the
 * underlying cost, the category, or the customer's markup rate.
 *
 * If the part's category isn't in the customer's enabled category list, this
 * returns null (identical to "not found") so customers can't discover
 * categories or parts they don't have access to.
 */
export async function lookupPartNumberForCustomer(
  rawPartNumber: string,
  customer: Pick<Customer, 'categoryMarkups'>
): Promise<CustomerLookupResult | null> {
  const [stock, price] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (!stock || !price) return null;

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  const target = normalizePartNumber(rawPartNumber);
  const row = merged.rows.find((r) => r.partNumber === target);
  if (!row) return null;
  if (row.stock === null || row.price === null) return null; // don't quote parts missing cost or stock data

  const markup = customer.categoryMarkups.find((m) => m.category === row.category);
  if (!markup) return null; // category not enabled for this customer

  return {
    partNumber: row.partNumber,
    description: row.description,
    stock: row.stock,
    price: applyMarkup(row.price, markup),
  };
}
