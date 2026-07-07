import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ParsedFile } from '@/lib/parseFile';
import { ListMapping } from '@/lib/merge';

interface ListState {
  file: ParsedFile | null;
  mapping: ListMapping | null;
  uploadedAt: string | null;
}

const EMPTY_LIST: ListState = { file: null, mapping: null, uploadedAt: null };

interface StockSheetStoreState {
  stock: ListState;
  price: ListState;
  setStockFile: (file: ParsedFile, mapping: ListMapping) => void;
  setPriceFile: (file: ParsedFile, mapping: ListMapping) => void;
  updateStockMapping: (mapping: Partial<ListMapping>) => void;
  updatePriceMapping: (mapping: Partial<ListMapping>) => void;
  clearStock: () => void;
  clearPrice: () => void;
  clearAll: () => void;
}

export const useStockSheetStore = create<StockSheetStoreState>()(
  persist(
    (set) => ({
      stock: EMPTY_LIST,
      price: EMPTY_LIST,

      setStockFile: (file, mapping) => set({ stock: { file, mapping, uploadedAt: new Date().toISOString() } }),
      setPriceFile: (file, mapping) => set({ price: { file, mapping, uploadedAt: new Date().toISOString() } }),

      updateStockMapping: (mapping) =>
        set((state) => ({
          stock: state.stock.mapping ? { ...state.stock, mapping: { ...state.stock.mapping, ...mapping } } : state.stock,
        })),
      updatePriceMapping: (mapping) =>
        set((state) => ({
          price: state.price.mapping ? { ...state.price, mapping: { ...state.price.mapping, ...mapping } } : state.price,
        })),

      clearStock: () => set({ stock: EMPTY_LIST }),
      clearPrice: () => set({ price: EMPTY_LIST }),
      clearAll: () => set({ stock: EMPTY_LIST, price: EMPTY_LIST }),
    }),
    { name: 'florence-stock-sheet' }
  )
);
