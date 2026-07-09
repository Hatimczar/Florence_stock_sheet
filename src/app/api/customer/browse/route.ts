import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { browsePartsForCustomer } from '@/lib/customerPricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const items = await browsePartsForCustomer(customer);
  return NextResponse.json({ items });
}
