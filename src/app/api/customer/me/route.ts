import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = await getCurrentCustomer(req);
  if (!customer) return NextResponse.json({ customer: null }, { status: 401 });
  return NextResponse.json({ customer: { name: customer.name, email: customer.email, companyName: customer.companyName } });
}
