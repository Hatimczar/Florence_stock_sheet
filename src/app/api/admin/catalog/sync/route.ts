import { NextRequest, NextResponse } from 'next/server';
import { syncCatalogFromIt4Profit } from '@/lib/catalog';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const catalog = await syncCatalogFromIt4Profit();
    return NextResponse.json({ itemCount: catalog.items.length, syncedAt: catalog.syncedAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sync failed' }, { status: 502 });
  }
}
