import { NextRequest, NextResponse } from 'next/server';
import { createCustomer, listPublicCustomers } from '@/lib/customers';
import { MarkupType } from '@/lib/customers';
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
    password: string;
    markupType: MarkupType;
    markupValue: number;
  };

  if (!body.email || !body.password || !body.markupType || typeof body.markupValue !== 'number') {
    return NextResponse.json({ error: 'email, password, markupType, and markupValue are required' }, { status: 400 });
  }

  try {
    const customer = await createCustomer(body);
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not create customer' }, { status: 400 });
  }
}
