import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { getCatalog, CUSTOMER_AVAIL_LABEL, MANUAL_STOCK_VENDOR, ORIGIN_ACOUSTICS_VENDOR } from '@/lib/catalog';
import { getManualStockCatalogItems, getOriginAcousticsCatalogItems } from '@/lib/customerPricing';
import { CustomerCatalogItem } from '@/lib/catalogApi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  if (customer.enabledBrands.length === 0) {
    return NextResponse.json({ items: [] as CustomerCatalogItem[] });
  }
  const enabled = new Set(customer.enabledBrands);

  const items: CustomerCatalogItem[] = [];
  const pricedVendors = new Set(customer.vendorMarkups.map((m) => m.vendor));

  // Apple only shows up here (availability-only, no price) when the admin has turned its pricing off for this
  // customer. Otherwise it's served priced via /api/customer/browse instead.
  if (enabled.has(MANUAL_STOCK_VENDOR) && !customer.appleShowPrices) {
    const manualItems = await getManualStockCatalogItems();
    for (const item of manualItems) {
      items.push({ wic: item.wic, description: item.description, vendor: MANUAL_STOCK_VENDOR, group: item.group, availability: item.availability, image: '' });
    }
  }

  // Origin Acoustics only shows up here (availability-only) when it has no vendorMarkup for this customer.
  // Otherwise it's served priced via /api/customer/browse instead.
  if (enabled.has(ORIGIN_ACOUSTICS_VENDOR) && !pricedVendors.has(ORIGIN_ACOUSTICS_VENDOR)) {
    const oaItems = await getOriginAcousticsCatalogItems();
    for (const item of oaItems) {
      items.push({ wic: item.wic, description: item.description, vendor: ORIGIN_ACOUSTICS_VENDOR, group: item.group, availability: item.availability, image: '' });
    }
  }

  const catalog = await getCatalog();
  if (catalog) {
    for (const item of catalog.items) {
      if (!enabled.has(item.vendor) || !CUSTOMER_AVAIL_LABEL[item.avail]) continue;
      // Priced vendor brands are served via /api/customer/browse instead.
      if (pricedVendors.has(item.vendor)) continue;
      items.push({
        wic: item.wic,
        description: item.description,
        vendor: item.vendor,
        group: item.group,
        availability: CUSTOMER_AVAIL_LABEL[item.avail],
        image: item.image,
      });
    }
  }

  return NextResponse.json({ items });
}
