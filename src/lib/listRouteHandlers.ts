import { NextRequest, NextResponse } from 'next/server';
import { getStoredList, setStoredList, updateStoredMapping, clearStoredList, ListKind } from './kv';
import { ParsedFile } from './parseFile';
import { ListMapping } from './merge';
import { requireAdmin } from './adminAuth';

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export function createListRouteHandlers(kind: ListKind) {
  async function GET(req: NextRequest) {
    if (!(await requireAdmin(req))) return UNAUTHORIZED;
    const stored = await getStoredList(kind);
    return NextResponse.json({ list: stored });
  }

  async function POST(req: NextRequest) {
    if (!(await requireAdmin(req))) return UNAUTHORIZED;
    const body = (await req.json()) as { file: ParsedFile; mapping: ListMapping };
    if (!body.file || !body.mapping) {
      return NextResponse.json({ error: 'file and mapping are required' }, { status: 400 });
    }
    const stored = await setStoredList(kind, body.file, body.mapping);
    return NextResponse.json({ list: stored });
  }

  async function PATCH(req: NextRequest) {
    if (!(await requireAdmin(req))) return UNAUTHORIZED;
    const body = (await req.json()) as { mapping: Partial<ListMapping> };
    const stored = await updateStoredMapping(kind, body.mapping);
    if (!stored) return NextResponse.json({ error: 'No list uploaded yet' }, { status: 404 });
    return NextResponse.json({ list: stored });
  }

  async function DELETE(req: NextRequest) {
    if (!(await requireAdmin(req))) return UNAUTHORIZED;
    await clearStoredList(kind);
    return NextResponse.json({ ok: true });
  }

  return { GET, POST, PATCH, DELETE };
}
