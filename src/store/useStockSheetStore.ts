import { create } from 'zustand';
import { StoredList } from '@/lib/api';

interface StockSheetStoreState {
  stock: StoredList | null;
  price: StoredList | null;
  lastSyncedAt: string | null;
  setStock: (list: StoredList | null) => void;
  setPrice: (list: StoredList | null) => void;
  setLastSyncedAt: (iso: string) => void;
}

export const useStockSheetStore = create<StockSheetStoreState>()((set) => ({
  stock: null,
  price: null,
  lastSyncedAt: null,
  setStock: (list) => set({ stock: list }),
  setPrice: (list) => set({ price: list }),
  setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),
}));
