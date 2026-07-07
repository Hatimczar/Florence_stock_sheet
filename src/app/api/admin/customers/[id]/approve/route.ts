import { NextRequest, NextResponse } from 'next/server';
import { approveCustomer, CategoryMarkup } from '@/lib/customers';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { categoryMarkups: CategoryMarkup[] };

  if (!Array.isArray(body.categoryMarkups) || body.categoryMarkups.length === 0) {
    return NextResponse.json({ error: 'Enable at least one category to approve this customer' }, { status: 400 });
  }

  const customer = await approveCustomer(id, body.categoryMarkups);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json({ customer });
}
