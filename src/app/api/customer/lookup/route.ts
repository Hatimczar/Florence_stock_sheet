import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { lookupPartNumberForCustomer } from '@/lib/customerPricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const partNumber = req.nextUrl.searchParams.get('partNumber')?.trim();
  if (!partNumber) return NextResponse.json({ error: 'partNumber is required' }, { status: 400 });

  // Only markupType/markupValue are passed in, and only partNumber/description/stock/price
  // ever come back out — this route must never surface cost or markup to the client.
  const result = await lookupPartNumberForCustomer(partNumber, customer);
  if (!result) return NextResponse.json({ result: null });
  return NextResponse.json({ result });
}
