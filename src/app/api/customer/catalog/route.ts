import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { getCatalog, CUSTOMER_AVAIL_LABEL } from '@/lib/catalog';
import { CustomerCatalogItem } from '@/lib/catalogApi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const catalog = await getCatalog();
  if (!catalog || customer.enabledBrands.length === 0) {
    return NextResponse.json({ items: [] as CustomerCatalogItem[] });
  }

  const enabled = new Set(customer.enabledBrands);
  const items: CustomerCatalogItem[] = catalog.items
    .filter((item) => enabled.has(item.vendor) && CUSTOMER_AVAIL_LABEL[item.avail])
    .map((item) => ({
      wic: item.wic,
      description: item.description,
      vendor: item.vendor,
      group: item.group,
      availability: CUSTOMER_AVAIL_LABEL[item.avail],
    }));

  return NextResponse.json({ items });
}
