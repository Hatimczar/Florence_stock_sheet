import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { browsePartsForCustomer, getVendorPricedItemsForCustomer } from '@/lib/customerPricing';
import { MANUAL_STOCK_VENDOR } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

interface PricedItem {
  partNumber: string;
  description: string;
  category: string;
  vendor: string;
  stock?: number;
  availability?: string;
  price: number;
  image: string | null;
}

// Priced items: Apple (real stock, categoryMarkups) when its prices aren't turned off for this customer,
// plus any vendor-catalog brand the admin has set a markup for (availability status instead of stock).
export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const items: PricedItem[] = [];

  if (customer.enabledBrands.includes(MANUAL_STOCK_VENDOR) && customer.appleShowPrices) {
    const appleItems = await browsePartsForCustomer(customer);
    items.push(...appleItems.map((i) => ({ ...i, vendor: MANUAL_STOCK_VENDOR })));
  }

  const vendorItems = await getVendorPricedItemsForCustomer(customer);
  items.push(...vendorItems);

  return NextResponse.json({ items });
}
