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
  const {
    stock,
    price,
    originAcousticsStock,
    setStock,
    setPrice,
    setOriginAcousticsStock,
    lastSyncedAt,
    setLastSyncedAt,
  } = useStockSheetStore();
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    const [stockList, priceList, oaStockList] = await Promise.all([
      fetchList('stock'),
      fetchList('price'),
      fetchList('stock-origin-acoustics'),
    ]);
    setStock(stockList);
    setPrice(priceList);
    setOriginAcousticsStock(oaStockList);
    setLastSyncedAt(new Date().toISOString());
  }, [setStock, setPrice, setOriginAcousticsStock, setLastSyncedAt]);

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

  const oaMergeResult = useMemo(() => {
    if (!originAcousticsStock) {
      return { rows: [], totalMatched: 0, totalMissingStock: 0, totalMissingPrice: 0, duplicatePartNumbers: [] };
    }
    return mergeStockAndPrice(originAcousticsStock.file.rows, originAcousticsStock.mapping, [], originAcousticsStock.mapping);
  }, [originAcousticsStock]);

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

  const handleOaStockParsed = async (file: ParsedFile, mapping: ListMapping) => {
    const stored = await uploadList('stock-origin-acoustics', file, mapping);
    setOriginAcousticsStock(stored);
  };
  const handleOaStockMappingChange = async (mapping: Partial<ListMapping>) => {
    const stored = await updateListMapping('stock-origin-acoustics', mapping);
    setOriginAcousticsStock(stored);
  };
  const handleClearOaStock = async () => {
    await clearList('stock-origin-acoustics');
    setOriginAcousticsStock(null);
  };
  const handleUpdateOaStock = async (partNumber: string, newStock: number) => {
    const stored = await updateStockItem(partNumber, newStock, 'stock-origin-acoustics');
    setOriginAcousticsStock(stored);
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
          <button onClick={sync} className="toolbar-btn">
            <RefreshCw /> Refresh
          </button>
          {(stock || price) && (
            <button onClick={handleClearAll} className="toolbar-btn">
              <Trash2 /> Clear Both
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
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

          <MergedTable result={mergeResult} onUpdateStock={handleUpdateStock} />

          <div className="section-header" style={{ marginTop: 32 }}>
            Origin Acoustics · Stock Only (No Pricing)
          </div>
          <UploadCard
            step="①"
            title="Stock List"
            valueLabel="Stock Quantity"
            valueGuess={guessStockColumn}
            listState={originAcousticsStock}
            onFileParsed={handleOaStockParsed}
            onMappingChange={handleOaStockMappingChange}
            onClear={handleClearOaStock}
          />

          <MergedTable result={oaMergeResult} onUpdateStock={handleUpdateOaStock} hasPricing={false} step="②" />
        </>
      )}

      <p className="mt-8 pb-2 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
        Matched by Part Number (case/whitespace-insensitive) · Stored centrally — updates from any device appear here within{' '}
        {POLL_INTERVAL_MS / 1000}s
      </p>
    </AdminShell>
  );
}
