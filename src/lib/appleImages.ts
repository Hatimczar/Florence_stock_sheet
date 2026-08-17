import appleSkuManifest from './appleSkuManifest.json';

const SKU_SET = new Set(appleSkuManifest as string[]);

// Apple part numbers look like "MFEA4ZE/A" — the first 5 characters are the stable product/color code
// shared across storage-size and region suffixes, and that's what the product photos are named after.
function skuPrefix(wic: string): string {
  return wic.trim().toUpperCase().slice(0, 5);
}

// Ordered so the first matching keyword wins — check more specific product lines (e.g. "iPad Pro"
// or "MacBook Pro") before their generic catch-all ("ipad", "macbook"). Matched against
// "<category> <description>" lowercased.
const CATEGORY_FALLBACKS: { slug: string; keywords: string[] }[] = [
  { slug: 'vision', keywords: ['vision pro', 'vision'] },
  { slug: 'studio', keywords: ['studio display'] },
  { slug: 'imac', keywords: ['imac'] },
  // Mac Studio has no photo of its own — a Mac mini (another compact desktop box) reads far
  // closer than the laptop catch-all below, so it borrows that image rather than "macbook".
  { slug: 'mac-mini', keywords: ['mac mini', 'mac studio'] },
  { slug: 'macbook-pro', keywords: ['macbook pro'] },
  { slug: 'macbook', keywords: ['macbook'] },
  { slug: 'ipad-pro', keywords: ['ipad pro'] },
  { slug: 'ipad-mini', keywords: ['ipad mini'] },
  { slug: 'ipad', keywords: ['ipad'] },
  { slug: 'iphone-air', keywords: ['iphone air'] },
  { slug: 'iphone', keywords: ['iphone'] },
  { slug: 'watch-ultra', keywords: ['watch ultra'] },
  { slug: 'watch', keywords: ['watch'] },
  { slug: 'airpods-max', keywords: ['airpods max'] },
  { slug: 'airpods-pro', keywords: ['airpods pro'] },
  { slug: 'airpods', keywords: ['airpods'] },
  { slug: 'airtag', keywords: ['airtag'] },
  { slug: 'giftcard', keywords: ['gift card', 'giftcard'] },
];

// Categories that only ever hold accessories (cables, adapters, cases, bands, keyboards, etc.),
// never the device itself. Descriptions in these categories routinely mention a host device by
// name (e.g. "Apple 85W MagSafe 2 Power Adapter (for MacBook Pro...)", "EarPods (Lightning
// Connector)" filed under iPad Accessories) — matching CATEGORY_FALLBACKS against those would
// show a full device photo for what is actually a cable or case. Safer to show no photo (the
// caller's generic icon) than a confidently wrong one.
const ACCESSORY_ONLY_CATEGORIES = new Set([
  'apple mac accessories',
  'apple watch accessories',
  'apple ipad accessories',
  'apple iphone accessories',
  'bands',
  'cases & films',
  'creativity',
  'mac components',
  'mice & keyboards',
  'power & cables',
]);

/**
 * Resolves a product photo for an Apple stock item: an exact match on the part number's product/color
 * code first, then a category hero shot inferred from its category + description, else null (caller
 * falls back to a generic icon).
 */
export function getAppleImage(wic: string, category: string, description: string): string | null {
  const prefix = skuPrefix(wic);
  if (SKU_SET.has(prefix)) return `/apple-images/${prefix}.webp`;

  if (ACCESSORY_ONLY_CATEGORIES.has(category.trim().toLowerCase())) return null;

  // Apple's feed sometimes uses non-breaking spaces (e.g. "AirPods Pro 3") instead of
  // regular ones, which would silently break multi-word keyword matches below.
  const haystack = `${category} ${description}`.toLowerCase().replace(/\s+/g, ' ');
  for (const { slug, keywords } of CATEGORY_FALLBACKS) {
    if (keywords.some((k) => haystack.includes(k))) return `/apple-images/category/${slug}.webp`;
  }
  return null;
}
