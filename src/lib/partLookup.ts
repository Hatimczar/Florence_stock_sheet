import { getStoredList } from './kv';
import { mergeStockAndPrice } from './merge';
import { normalizePartNumber } from './parseFile';
import { getCatalog } from './catalog';

export interface PartLookupResult {
  found: boolean;
  partNumber: string;
  description?: string;
  cost?: number;
  currency?: 'AED' | 'USD';
  source?: 'apple' | 'origin-acoustics' | 'it4profit';
  vendor?: string;
}

/**
 * Looks up a part's cost across every source Florence maintains, for the Price Calculator's
 * auto-fetch-by-Part-Number feature. Checked in this order: Apple's own manual price list (AED),
 * then Origin Acoustics (USD — its uploaded price column is literally "Exworks Price in USD"),
 * then the IT4Profit vendor feed (USD, the "myPrice" field — same cost shown as "Cost (USD)" in
 * the admin Asbis Brands table). Returns the first match; a part number is assumed unique within
 * each source.
 */
export async function lookupPartCost(rawPartNumber: string): Promise<PartLookupResult> {
  const target = normalizePartNumber(rawPartNumber);

  const [appleStock, applePrice] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (appleStock && applePrice) {
    const merged = mergeStockAndPrice(appleStock.file.rows, appleStock.mapping, applePrice.file.rows, applePrice.mapping);
    const row = merged.rows.find((r) => r.partNumber === target);
    if (row && row.price !== null) {
      return { found: true, partNumber: target, description: row.description, cost: row.price, currency: 'AED', source: 'apple' };
    }
  }

  const [oaStock, oaPrice] = await Promise.all([getStoredList('stock_origin_acoustics'), getStoredList('price_origin_acoustics')]);
  if (oaStock && oaPrice) {
    const merged = mergeStockAndPrice(oaStock.file.rows, oaStock.mapping, oaPrice.file.rows, oaPrice.mapping);
    const row = merged.rows.find((r) => r.partNumber === target);
    if (row && row.price !== null) {
      return { found: true, partNumber: target, description: row.description, cost: row.price, currency: 'USD', source: 'origin-acoustics' };
    }
  }

  const catalog = await getCatalog();
  if (catalog) {
    const item = catalog.items.find((i) => normalizePartNumber(i.wic) === target);
    if (item && item.myPrice !== null) {
      return {
        found: true,
        partNumber: target,
        description: item.description,
        cost: item.myPrice,
        currency: 'USD',
        source: 'it4profit',
        vendor: item.vendor,
      };
    }
  }

  return { found: false, partNumber: target };
}
