import { getCloudflareContext } from '@opennextjs/cloudflare';

/** One row from the IT4Profit PriceAvail.xml feed, already the unit of vendor/category/availability/pricing. */
export interface CatalogItem {
  wic: string;
  description: string;
  vendor: string;
  group: string;
  avail: string; // lowercased raw feed value: 'yes' | 'on demand' | 'limited' | 'no' | ''
  retailPrice: number | null;
  myPrice: number | null;
  image: string;
}

export interface StoredCatalog {
  items: CatalogItem[];
  syncedAt: string;
}

const CATALOG_KEY = 'it4profit_catalog';

/** The manually-uploaded Stock/Price sheet (admin's own inventory) is exposed to customers as this brand. */
export const MANUAL_STOCK_VENDOR = 'Apple';

/**
 * A second manually-uploaded stock sheet, managed from the Asbis Brands page rather than the Stock
 * Sheet page. Priced per-customer via vendorMarkups, same as any IT4Profit vendor brand — see
 * getVendorPricedItemsForCustomer.
 */
export const ORIGIN_ACOUSTICS_VENDOR = 'Origin Acoustics';

// Availability values the customer portal is allowed to surface; 'no' (and anything unrecognized) is never shown.
export const CUSTOMER_AVAIL_LABEL: Record<string, string> = {
  yes: 'Available',
  'on demand': 'On Demand',
  limited: 'Limited',
};

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.STOCK_SHEET_KV;
}

export async function getCatalog(): Promise<StoredCatalog | null> {
  const kv = await getKv();
  const raw = await kv.get(CATALOG_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as StoredCatalog;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeXmlEntities(m[1]) : '';
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Parses the flat <PRICES><PRICE>...</PRICE></PRICES> structure of the IT4Profit feed. */
export function parseIt4ProfitXml(xml: string): CatalogItem[] {
  const blocks = xml.match(/<PRICE>[\s\S]*?<\/PRICE>/g) ?? [];
  return blocks
    .map((block) => ({
      wic: extractTag(block, 'WIC'),
      description: extractTag(block, 'DESCRIPTION'),
      vendor: extractTag(block, 'VENDOR_NAME'),
      group: extractTag(block, 'GROUP_NAME'),
      avail: extractTag(block, 'AVAIL').toLowerCase(),
      retailPrice: parseNumber(extractTag(block, 'RETAIL_PRICE')),
      myPrice: parseNumber(extractTag(block, 'MY_PRICE')),
      image: extractTag(block, 'SMALL_IMAGE'),
    }))
    .filter((item) => item.wic);
}

/** Fetches the live IT4Profit feed and replaces the stored catalog. Admin-triggered only. */
export async function syncCatalogFromIt4Profit(): Promise<StoredCatalog> {
  const { env } = await getCloudflareContext({ async: true });
  const username = env.IT4PROFIT_USERNAME;
  const password = env.IT4PROFIT_PASSWORD;
  if (!username || !password) {
    throw new Error('IT4PROFIT_USERNAME / IT4PROFIT_PASSWORD are not configured');
  }
  const url = `https://services.it4profit.com/product/en/718/PriceAvail.xml?USERNAME=${encodeURIComponent(username)}&PASSWORD=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IT4Profit feed request failed: ${res.status}`);
  const xml = await res.text();
  const items = parseIt4ProfitXml(xml);
  if (items.length === 0) throw new Error('IT4Profit feed returned no parseable items');

  const stored: StoredCatalog = { items, syncedAt: new Date().toISOString() };
  const kv = await getKv();
  await kv.put(CATALOG_KEY, JSON.stringify(stored));
  return stored;
}

export function distinctVendors(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.vendor).filter(Boolean))).sort();
}

export function distinctGroups(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.group).filter(Boolean))).sort();
}
