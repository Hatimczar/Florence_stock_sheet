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
 * Real part numbers are usually a base model number plus a variant suffix (e.g. Apple's color
 * codes: MGDR4AB/A vs MGDR4ZS/A), but people naturally think and type in terms of the base number
 * alone. Falls back to a prefix match across every variant sharing that base — but only resolves
 * it automatically when every matching variant has the exact same cost, so a genuine spec/price
 * difference between variants never gets silently guessed wrong.
 */
function resolveMatch<T>(target: string, rowsWithCost: T[], partNumberOf: (row: T) => string, costOf: (row: T) => number): T | null {
  const exact = rowsWithCost.find((r) => partNumberOf(r) === target);
  if (exact) return exact;

  const prefixMatches = rowsWithCost.filter((r) => partNumberOf(r).startsWith(target));
  if (prefixMatches.length === 0) return null;
  const distinctCosts = new Set(prefixMatches.map(costOf));
  if (distinctCosts.size !== 1) return null;
  return prefixMatches[0];
}

/**
 * Looks up a part's cost across every source Florence maintains, for the Price Calculator's
 * auto-fetch-by-Part-Number feature. Checked in this order: Apple's own manual price list (AED),
 * then Origin Acoustics (USD — its uploaded price column is literally "Exworks Price in USD"),
 * then the IT4Profit vendor feed (USD, the "myPrice" field — same cost shown as "Cost (USD)" in
 * the admin Asbis Brands table). Returns the first match; a part number is assumed unique within
 * each source (aside from the variant-suffix case resolveMatch handles).
 */
export async function lookupPartCost(rawPartNumber: string): Promise<PartLookupResult> {
  const target = normalizePartNumber(rawPartNumber);

  const [appleStock, applePrice] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (appleStock && applePrice) {
    const merged = mergeStockAndPrice(appleStock.file.rows, appleStock.mapping, applePrice.file.rows, applePrice.mapping);
    const rowsWithCost = merged.rows.filter((r) => r.price !== null);
    const row = resolveMatch(target, rowsWithCost, (r) => r.partNumber, (r) => r.price!);
    if (row) {
      return { found: true, partNumber: target, description: row.description, cost: row.price!, currency: 'AED', source: 'apple' };
    }
  }

  const [oaStock, oaPrice] = await Promise.all([getStoredList('stock_origin_acoustics'), getStoredList('price_origin_acoustics')]);
  if (oaStock && oaPrice) {
    const merged = mergeStockAndPrice(oaStock.file.rows, oaStock.mapping, oaPrice.file.rows, oaPrice.mapping);
    const rowsWithCost = merged.rows.filter((r) => r.price !== null);
    const row = resolveMatch(target, rowsWithCost, (r) => r.partNumber, (r) => r.price!);
    if (row) {
      return { found: true, partNumber: target, description: row.description, cost: row.price!, currency: 'USD', source: 'origin-acoustics' };
    }
  }

  const catalog = await getCatalog();
  if (catalog) {
    const itemsWithCost = catalog.items.filter((i) => i.myPrice !== null);
    const item = resolveMatch(target, itemsWithCost, (i) => normalizePartNumber(i.wic), (i) => i.myPrice!);
    if (item) {
      return {
        found: true,
        partNumber: target,
        description: item.description,
        cost: item.myPrice!,
        currency: 'USD',
        source: 'it4profit',
        vendor: item.vendor,
      };
    }
  }

  return { found: false, partNumber: target };
}
