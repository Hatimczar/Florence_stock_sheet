import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { browsePartsForCustomer } from '@/lib/customerPricing';
import { MANUAL_STOCK_VENDOR } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Priced items only ever apply to the Apple brand, and only when the admin hasn't turned pricing off for this customer.
export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  if (!customer.enabledBrands.includes(MANUAL_STOCK_VENDOR) || !customer.appleShowPrices) {
    return NextResponse.json({ items: [] });
  }

  const items = await browsePartsForCustomer(customer);
  return NextResponse.json({ items });
}
