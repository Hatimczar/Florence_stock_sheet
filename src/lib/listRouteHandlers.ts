import { NextRequest, NextResponse } from 'next/server';
import { getStoredList, setStoredList, updateStoredMapping, clearStoredList, ListKind } from './kv';
import { ParsedFile } from './parseFile';
import { ListMapping } from './merge';

export function createListRouteHandlers(kind: ListKind) {
  async function GET() {
    const stored = await getStoredList(kind);
    return NextResponse.json({ list: stored });
  }

  async function POST(req: NextRequest) {
    const body = (await req.json()) as { file: ParsedFile; mapping: ListMapping };
    if (!body.file || !body.mapping) {
      return NextResponse.json({ error: 'file and mapping are required' }, { status: 400 });
    }
    const stored = await setStoredList(kind, body.file, body.mapping);
    return NextResponse.json({ list: stored });
  }

  async function PATCH(req: NextRequest) {
    const body = (await req.json()) as { mapping: Partial<ListMapping> };
    const stored = await updateStoredMapping(kind, body.mapping);
    if (!stored) return NextResponse.json({ error: 'No list uploaded yet' }, { status: 404 });
    return NextResponse.json({ list: stored });
  }

  async function DELETE() {
    await clearStoredList(kind);
    return NextResponse.json({ ok: true });
  }

  return { GET, POST, PATCH, DELETE };
}
