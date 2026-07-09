'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { useStockSheetStore } from '@/store/useStockSheetStore';
import { guessStockColumn, guessPriceColumn, ParsedFile } from '@/lib/parseFile';
import { mergeStockAndPrice, ListMapping } from '@/lib/merge';
import { fetchList, uploadList, updateListMapping, clearList, updateStockItem } from '@/lib/api';
import { UploadCard } from '@/components/UploadCard';
import { MergedTable } from '@/components/MergedTable';
import { AdminGate } from '@/components/AdminGate';
import { AdminShell } from '@/components/AdminShell';

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    const [stockList, priceList] = await Promise.all([fetchList('stock'), fetchList('price')]);
    setStock(stockList);
    setPrice(priceList);
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
  const handleUpdateStock = async (partNumber: string, newStock: number) => {
    const stored = await updateStockItem(partNumber, newStock);
    setStock(stored);
  };

  return (
    <AdminShell
      active="stock"
      title="Stock Sheet"
      toolbarActions={
        <>
          {lastSyncedAt && (
            <span className="hidden text-[11px] text-muted lg:inline">
              Synced {new Date(lastSyncedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={sync}
            className="flex items-center gap-1.5 rounded-md-a border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted"
          >
            <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          {(stock || price) && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-md-a border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted"
            >
              <Trash2 size={13} /> <span className="hidden sm:inline">Clear Both</span>
            </button>
          )}
        </>
      }
    >
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

      <p className="mt-8 pb-2 text-center text-[11px] text-muted">
        Matched by Part Number (case/whitespace-insensitive) · Stored centrally — updates from any device appear here within{' '}
        {POLL_INTERVAL_MS / 1000}s
      </p>
    </AdminShell>
  );
}
