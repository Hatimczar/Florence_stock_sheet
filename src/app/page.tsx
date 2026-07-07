'use client';

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useStockSheetStore } from '@/store/useStockSheetStore';
import { guessStockColumn, guessPriceColumn } from '@/lib/parseFile';
import { mergeStockAndPrice } from '@/lib/merge';
import { UploadCard } from '@/components/UploadCard';
import { MergedTable } from '@/components/MergedTable';

export default function Home() {
  const { stock, price, setStockFile, setPriceFile, updateStockMapping, updatePriceMapping, clearStock, clearPrice, clearAll } =
    useStockSheetStore();

  const mergeResult = useMemo(() => {
    if (!stock.file || !stock.mapping || !price.file || !price.mapping) {
      return { rows: [], totalMatched: 0, totalMissingStock: 0, totalMissingPrice: 0, duplicatePartNumbers: [] };
    }
    return mergeStockAndPrice(stock.file.rows, stock.mapping, price.file.rows, price.mapping);
  }, [stock.file, stock.mapping, price.file, price.mapping]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Florence <span className="text-accent">Stock Sheet</span>
          </h1>
          <p className="text-xs text-muted sm:text-sm">Live Stock + Price merge by Part Number</p>
        </div>
        {(stock.file || price.file) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface"
          >
            <Trash2 size={14} /> Clear Both
          </button>
        )}
      </header>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <UploadCard
          step="①"
          title="Stock List"
          valueLabel="Stock Quantity"
          valueGuess={guessStockColumn}
          listState={stock}
          onFileParsed={setStockFile}
          onMappingChange={updateStockMapping}
          onClear={clearStock}
        />
        <UploadCard
          step="②"
          title="Price List"
          valueLabel="Price"
          valueGuess={guessPriceColumn}
          listState={price}
          onFileParsed={setPriceFile}
          onMappingChange={updatePriceMapping}
          onClear={clearPrice}
        />
      </div>

      <MergedTable result={mergeResult} />

      <footer className="mt-10 pb-4 text-center text-[11px] text-muted">
        Matched by Part Number (case/whitespace-insensitive) · Re-upload either list anytime to refresh — the other list stays as-is
      </footer>
    </div>
  );
}
