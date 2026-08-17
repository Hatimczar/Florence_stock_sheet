import appleSkuManifest from './appleSkuManifest.json';

const SKU_SET = new Set(appleSkuManifest as string[]);

// Apple part numbers look like "MFEA4ZE/A" — the first 5 characters are the stable product/color code
// shared across storage-size and region suffixes, and that's what the product photos are named after.
function skuPrefix(wic: string): string {
  return wic.trim().toUpperCase().slice(0, 5);
}

// Ordered so the first matching keyword wins — check more specific product lines (e.g. "studio display")
// before generic ones. Matched against "<category> <description>" lowercased.
const CATEGORY_FALLBACKS: { slug: string; keywords: string[] }[] = [
  { slug: 'vision', keywords: ['vision pro', 'vision'] },
  { slug: 'studio', keywords: ['studio display'] },
  { slug: 'imac', keywords: ['imac'] },
  { slug: 'macbook', keywords: ['macbook', 'mac mini', 'mac studio'] },
  { slug: 'ipad', keywords: ['ipad'] },
  { slug: 'iphone', keywords: ['iphone'] },
  { slug: 'watch', keywords: ['watch'] },
  { slug: 'airpods', keywords: ['airpods'] },
  { slug: 'airtag', keywords: ['airtag'] },
  { slug: 'giftcard', keywords: ['gift card', 'giftcard'] },
];

/**
 * Resolves a product photo for an Apple stock item: an exact match on the part number's product/color
 * code first, then a category hero shot inferred from its category + description, else null (caller
 * falls back to a generic icon).
 */
export function getAppleImage(wic: string, category: string, description: string): string | null {
  const prefix = skuPrefix(wic);
  if (SKU_SET.has(prefix)) return `/apple-images/${prefix}.webp`;

  const haystack = `${category} ${description}`.toLowerCase();
  for (const { slug, keywords } of CATEGORY_FALLBACKS) {
    if (keywords.some((k) => haystack.includes(k))) return `/apple-images/category/${slug}.webp`;
  }
  return null;
}
