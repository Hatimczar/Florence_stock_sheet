import { NextRequest, NextResponse } from 'next/server';
import { createCustomer, listPublicCustomers, CategoryMarkup, VendorMarkup } from '@/lib/customers';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return UNAUTHORIZED;
  const customers = await listPublicCustomers();
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return UNAUTHORIZED;
  const body = (await req.json()) as {
    email: string;
    name: string;
    companyName?: string;
    password: string;
    categoryMarkups: CategoryMarkup[];
    enabledBrands?: string[];
    appleShowPrices?: boolean;
    vendorMarkups?: VendorMarkup[];
  };

  if (!body.email || !body.password || !Array.isArray(body.categoryMarkups)) {
    return NextResponse.json({ error: 'email, password, and categoryMarkups are required' }, { status: 400 });
  }

  try {
    const customer = await createCustomer(body);
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not create customer' }, { status: 400 });
  }
}
