import { NextRequest, NextResponse } from 'next/server';
import { getCatalog, distinctVendors, MANUAL_STOCK_VENDOR, ORIGIN_ACOUSTICS_VENDOR } from '@/lib/catalog';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const catalog = await getCatalog();
  // "Apple" and "Origin Acoustics" (manually-uploaded stock sheets) are always selectable, regardless of IT4Profit sync state.
  const vendors = [MANUAL_STOCK_VENDOR, ORIGIN_ACOUSTICS_VENDOR, ...(catalog ? distinctVendors(catalog.items) : [])];
  return NextResponse.json({ vendors });
}
