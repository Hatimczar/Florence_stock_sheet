import { NextRequest, NextResponse } from 'next/server';
import { deleteCustomer, updateCustomer } from '@/lib/customers';
import { MarkupType } from '@/lib/customers';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return UNAUTHORIZED;
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    password?: string;
    markupType?: MarkupType;
    markupValue?: number;
  };

  const customer = await updateCustomer(id, body);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json({ customer });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return UNAUTHORIZED;
  const { id } = await params;
  await deleteCustomer(id);
  return NextResponse.json({ ok: true });
}
