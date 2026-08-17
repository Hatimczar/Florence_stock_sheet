import { getCatalog, CUSTOMER_AVAIL_LABEL, MANUAL_STOCK_VENDOR, ORIGIN_ACOUSTICS_VENDOR, upsizeIt4ProfitImage } from './catalog';
import { getManualStockCatalogItems, getOriginAcousticsCatalogItems } from './customerPricing';

export interface PublicCatalogItem {
  wic: string;
  description: string;
  vendor: string;
  group: string;
  availability: string;
  image: string | null;
}

/**
 * The full merged catalog (every vendor, every item with recognized availability), with no per-customer
 * enabledBrands filtering — this is what anonymous visitors and the public homepage see. No price ever
 * comes from here: any vendor can be priced for a given signed-in customer via categoryMarkups (Apple) or
 * vendorMarkups (everyone else, see customers.ts), so the public grid always shows availability only and
 * defers to /api/customer/browse — once signed in — for whichever items that specific customer has pricing on.
 */
export async function getPublicCatalog(): Promise<PublicCatalogItem[]> {
  const items: PublicCatalogItem[] = [];

  const [manualItems, originAcousticsItems] = await Promise.all([
    getManualStockCatalogItems(),
    getOriginAcousticsCatalogItems(),
  ]);

  for (const item of manualItems) {
    items.push({
      wic: item.wic,
      description: item.description,
      vendor: MANUAL_STOCK_VENDOR,
      group: item.group,
      availability: item.availability,
      image: item.image,
    });
  }

  for (const item of originAcousticsItems) {
    items.push({
      wic: item.wic,
      description: item.description,
      vendor: ORIGIN_ACOUSTICS_VENDOR,
      group: item.group,
      availability: item.availability,
      image: item.image,
    });
  }

  const catalog = await getCatalog();
  if (catalog) {
    for (const item of catalog.items) {
      const availability = CUSTOMER_AVAIL_LABEL[item.avail];
      if (!availability) continue;
      items.push({
        wic: item.wic,
        description: item.description,
        vendor: item.vendor,
        group: item.group,
        availability,
        image: item.image ? upsizeIt4ProfitImage(item.image, 500) : null,
      });
    }
  }

  return items;
}
