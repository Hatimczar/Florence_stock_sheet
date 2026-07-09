'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, RefreshCw, Users, LogOut, PackageSearch } from 'lucide-react';
import { useStockSheetStore } from '@/store/useStockSheetStore';
import { guessStockColumn, guessPriceColumn, ParsedFile } from '@/lib/parseFile';
import { mergeStockAndPrice, ListMapping } from '@/lib/merge';
import { fetchList, uploadList, updateListMapping, clearList, updateStockItem } from '@/lib/api';
import { UploadCard } from '@/components/UploadCard';
import { MergedTable } from '@/components/MergedTable';
import { AdminGate } from '@/components/AdminGate';
import { fetchCustomers } from '@/lib/customerApi';
import { Badge } from '@/components/ui';

const POLL_INTERVAL_MS = 10_000;

export default function HomeClient() {
  return (
    <AdminGate>
      <HomeContent />
    </AdminGate>
  );
}

function HomeContent() {
  const { stock, price, setStock, setPrice, lastSyncedAt, setLastSyncedAt } = useStockSheetStore();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    const [stockList, priceList, customers] = await Promise.all([fetchList('stock'), fetchList('price'), fetchCustomers()]);
    setStock(stockList);
    setPrice(priceList);
    setPendingCount(customers.filter((c) => c.status === 'pending').length);
    setLastSyncedAt(new Date().toISOString());
  }, [setStock, setPrice, setLastSyncedAt]);

  useEffect(() => {
    sync().finally(() => setLoading(false));
    pollRef.current = setInterval(sync, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sync]);

  const mergeResult = useMemo(() => {
    if (!stock || !price) {
      return { rows: [], totalMatched: 0, totalMissingStock: 0, totalMissingPrice: 0, duplicatePartNumbers: [] };
    }
    return mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  }, [stock, price]);

  const handleStockParsed = async (file: ParsedFile, mapping: ListMapping) => {
    const stored = await uploadList('stock', file, mapping);
    setStock(stored);
  };
  const handlePriceParsed = async (file: ParsedFile, mapping: ListMapping) => {
    const stored = await uploadList('price', file, mapping);
    setPrice(stored);
  };
  const handleStockMappingChange = async (mapping: Partial<ListMapping>) => {
    const stored = await updateListMapping('stock', mapping);
    setStock(stored);
  };
  const handlePriceMappingChange = async (mapping: Partial<ListMapping>) => {
    const stored = await updateListMapping('price', mapping);
    setPrice(stored);
  };
  const handleClearStock = async () => {
    await clearList('stock');
    setStock(null);
  };
  const handleClearPrice = async () => {
    await clearList('price');
    setPrice(null);
  };
  const handleClearAll = async () => {
    await Promise.all([clearList('stock'), clearList('price')]);
    setStock(null);
    setPrice(null);
  };
  const handleLogout = async () => {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    window.location.reload();
  };
  const handleUpdateStock = async (partNumber: string, newStock: number) => {
    const stored = await updateStockItem(partNumber, newStock);
    setStock(stored);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2">
            <Image src="/florence-icon.png" alt="Florence" width={28} height={28} className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Florence <span className="text-accent">Stock Sheet</span>
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastSyncedAt && (
            <span className="hidden text-[11px] text-muted sm:inline">
              Synced {new Date(lastSyncedAt).toLocaleTimeString()}
            </span>
          )}
          <Link
            href="/catalog"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
          >
            <PackageSearch size={14} /> Vendor Catalog
          </Link>
          <Link
            href="/customers"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
          >
            <Users size={14} /> Customers
            {pendingCount > 0 && <Badge tone="warn">{pendingCount} pending</Badge>}
          </Link>
          <button
            onClick={sync}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {(stock || price) && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
            >
              <Trash2 size={14} /> Clear Both
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <UploadCard
              step="①"
              title="Stock List"
              valueLabel="Stock Quantity"
              valueGuess={guessStockColumn}
              listState={stock}
              onFileParsed={handleStockParsed}
              onMappingChange={handleStockMappingChange}
              onClear={handleClearStock}
            />
            <UploadCard
              step="②"
              title="Price List"
              valueLabel="Price"
              valueGuess={guessPriceColumn}
              listState={price}
              onFileParsed={handlePriceParsed}
              onMappingChange={handlePriceMappingChange}
              onClear={handleClearPrice}
            />
          </div>

          <MergedTable result={mergeResult} onUpdateStock={handleUpdateStock} />
        </>
      )}

      <footer className="mt-10 pb-4 text-center text-[11px] text-muted">
        Matched by Part Number (case/whitespace-insensitive) · Stored centrally — updates from any device appear here within {POLL_INTERVAL_MS / 1000}s
      </footer>
    </div>
  );
}
