import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getStoredList } from '@/lib/kv';
import { mergeStockAndPrice, distinctCategories } from '@/lib/merge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [stock, price] = await Promise.all([getStoredList('stock'), getStoredList('price')]);
  if (!stock || !price) return NextResponse.json({ categories: [] });

  const merged = mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  return NextResponse.json({ categories: distinctCategories(merged) });
}
