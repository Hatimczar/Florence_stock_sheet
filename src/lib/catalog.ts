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

/**
 * The ProductList.xml feed is a full catalog dump (100MB+) — far too big to load into memory
 * at once in a Worker. It's keyed by the same code as PriceAvail's WIC, and carries a richer
 * <Images> gallery that's often populated even when PriceAvail's own SMALL_IMAGE dead-ends into
 * IT4Profit's "no photo" placeholder. Streamed and scanned incrementally, one <Product> block at
 * a time, only keeping images for the WICs we actually need.
 */
async function fetchProductListImages(neededCodes: Set<string>, username: string, password: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (neededCodes.size === 0) return result;

  const url = `https://services.it4profit.com/product/en/718/ProductList.xml?USERNAME=${encodeURIComponent(username)}&PASSWORD=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) return result;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let closeIdx: number;
      while ((closeIdx = buffer.indexOf('</Product>')) !== -1) {
        const blockEnd = closeIdx + '</Product>'.length;
        const openIdx = buffer.indexOf('<Product>');
        if (openIdx === -1 || openIdx > closeIdx) {
          buffer = buffer.slice(blockEnd);
          continue;
        }
        const block = buffer.slice(openIdx, blockEnd);
        buffer = buffer.slice(blockEnd);

        const code = extractTag(block, 'ProductCode');
        if (code && neededCodes.has(code) && !result.has(code)) {
          const galleryMatch = block.match(/<Images>\s*<Image>([\s\S]*?)<\/Image>/);
          const image = galleryMatch ? decodeXmlEntities(galleryMatch[1]) : '';
          if (image) result.set(code, image);
        }
      }

      if (result.size >= neededCodes.size) break; // found everything we need — stop early
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return result;
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

  // Backfill/prefer a richer gallery photo from ProductList.xml wherever it exists — non-fatal if
  // this second fetch fails, since images are supplementary to the core stock/price/availability data.
  try {
    const allCodes = new Set(items.map((i) => i.wic));
    const galleryImages = await fetchProductListImages(allCodes, username, password);
    for (const item of items) {
      const gallery = galleryImages.get(item.wic);
      if (gallery) item.image = gallery;
    }
  } catch {
    // Ignore — the sync still succeeds with whatever SMALL_IMAGE PriceAvail already gave us.
  }

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
