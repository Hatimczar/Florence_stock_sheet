import { NextRequest, NextResponse } from 'next/server';
import { getCatalog, distinctVendors } from '@/lib/catalog';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const catalog = await getCatalog();
  return NextResponse.json({ vendors: catalog ? distinctVendors(catalog.items) : [] });
}
