import { NextRequest, NextResponse } from 'next/server';
import { getCatalog, distinctVendors, MANUAL_STOCK_VENDOR } from '@/lib/catalog';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const catalog = await getCatalog();
  // "Apple" (the manually-uploaded Stock/Price sheet) is always selectable, regardless of IT4Profit sync state.
  const vendors = [MANUAL_STOCK_VENDOR, ...(catalog ? distinctVendors(catalog.items) : [])];
  return NextResponse.json({ vendors });
}
