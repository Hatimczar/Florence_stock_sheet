import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { Customer } from './customers';

export interface CustomerLookupResult {
  partNumber: string;
  description: string;
  stock: number;
  price: number;
}

export function applyMarkup(cost: number, customer: Pick<Customer, 'markupType' | 'markupValue'>): number {
  const price = customer.markupType === 'percent' ? cost * (1 + customer.markupValue) : cost + customer.markupValue;
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

/**
 * Looks up a part number for a customer-facing request. Only ever returns
 * partNumber, description, stock, and the final marked-up price — never the
 * underlying cost or the customer's markup rate.
 */
export async function lookupPartNumberForCustomer(
  rawPartNumber: string,
  customer: Pick<Customer, 'markupType' | 'markupValue'>
): Promise<CustomerLookupResult | null> {
  const [stock, price] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (!stock || !price) return null;

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  const target = normalizePartNumber(rawPartNumber);
  const row = merged.rows.find((r) => r.partNumber === target);
  if (!row) return null;
  if (row.stock === null || row.price === null) return null; // don't quote parts missing cost or stock data

  return {
    partNumber: row.partNumber,
    description: row.description,
    stock: row.stock,
    price: applyMarkup(row.price, customer),
  };
}
