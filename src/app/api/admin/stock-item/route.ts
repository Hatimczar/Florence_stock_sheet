import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { updateStockItemValue } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { partNumber?: string; newStock?: number; kind?: 'stock' | 'stock_origin_acoustics' };
  if (!body.partNumber || typeof body.newStock !== 'number' || !Number.isFinite(body.newStock) || body.newStock < 0) {
    return NextResponse.json({ error: 'partNumber and a valid non-negative newStock are required' }, { status: 400 });
  }

  const updated = await updateStockItemValue(body.partNumber, body.newStock, body.kind ?? 'stock');
  if (!updated) return NextResponse.json({ error: 'Part number not found in the stock list' }, { status: 404 });
  return NextResponse.json({ list: updated });
}
