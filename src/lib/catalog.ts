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

/**
 * The feed's SMALL_IMAGE URLs default to a 60x60 crop (content.it4profit.com/pimg/s/resize/60x60x.../file.png).
 * The same CDN serves larger crops of the identical asset if the leading WxH is swapped out, so callers needing
 * a real product photo (vs. a thumbnail) should upsize through this rather than using the raw feed URL.
 */
export function upsizeIt4ProfitImage(url: string, size = 500): string {
  if (/resize\/\d+x\d+x/.test(url)) return url.replace(/resize\/\d+x\d+x/, `resize/${size}x${size}x`);
  if (/RESIZE=\d+x\d+x/i.test(url)) return url.replace(/RESIZE=\d+x\d+x/i, `RESIZE=${size}x${size}x`);
  return url;
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

/**
 * In-isolate cache for the parsed catalog. The IT4Profit feed is thousands of items (multi-MB as
 * JSON) and only changes when an admin manually syncs, but customer portals poll pricing endpoints
 * that read it every ~15s — re-fetching and JSON.parsing that blob on every poll was blowing past
 * the Worker's per-request CPU time limit for customers with many priced brands. A short TTL keeps
 * pricing responsive to a fresh sync without paying that cost on every single request.
 */
let cachedCatalog: { data: StoredCatalog; expiresAt: number } | null = null;
const CATALOG_CACHE_TTL_MS = 30_000;

export async function getCatalog(): Promise<StoredCatalog | null> {
  const now = Date.now();
  if (cachedCatalog && cachedCatalog.expiresAt > now) return cachedCatalog.data;

  const kv = await getKv();
  const raw = await kv.get(CATALOG_KEY);
  if (!raw) {
    cachedCatalog = null;
    return null;
  }
  const parsed = JSON.parse(raw) as StoredCatalog;
  cachedCatalog = { data: parsed, expiresAt: now + CATALOG_CACHE_TTL_MS };
  return parsed;
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
  cachedCatalog = { data: stored, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
  return stored;
}

export function distinctVendors(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.vendor).filter(Boolean))).sort();
}

export function distinctGroups(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.group).filter(Boolean))).sort();
}
