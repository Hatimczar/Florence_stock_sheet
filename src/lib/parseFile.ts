import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string | number>[];
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'numbers') {
    throw new Error(
      "Apple Numbers files can't be read directly. In Numbers, use File → Export To → Excel or CSV, then upload that file here."
    );
  }

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string | number>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data;
          resolve({ fileName: file.name, headers: rows.length ? Object.keys(rows[0]) : [], rows });
        },
        error: (err) => reject(err),
      });
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });
    return { fileName: file.name, headers: rows.length ? Object.keys(rows[0]) : [], rows };
  }

  throw new Error('Unsupported file type. Please upload .xlsx, .xls, or .csv.');
}

const PART_NUMBER_GUESSES = ['part number', 'part_number', 'partnumber', 'sku', 'mpn', 'code', 'item code', 'product code', 'part no', 'part no.'];
const STOCK_GUESSES = ['stock', 'qty', 'quantity', 'available', 'in stock', 'available qty', 'available quantity', 'stock qty', 'stock quantity', 'on hand'];
const PRICE_GUESSES = ['price', 'cost', 'unit price', 'rate', 'sell price', 'selling price', 'cost price'];
const DESCRIPTION_GUESSES = ['description', 'name', 'title', 'product name', 'product', 'item description', 'item name'];

export function guessColumn(headers: string[], guesses: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const guess of guesses) {
    const idx = lower.indexOf(guess);
    if (idx !== -1) return headers[idx];
  }
  // fallback: partial contains match
  for (const guess of guesses) {
    const idx = lower.findIndex((h) => h.includes(guess));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function guessPartNumberColumn(headers: string[]): string | null {
  return guessColumn(headers, PART_NUMBER_GUESSES);
}
export function guessStockColumn(headers: string[]): string | null {
  return guessColumn(headers, STOCK_GUESSES);
}
export function guessPriceColumn(headers: string[]): string | null {
  return guessColumn(headers, PRICE_GUESSES);
}
export function guessDescriptionColumn(headers: string[]): string | null {
  return guessColumn(headers, DESCRIPTION_GUESSES);
}

export function normalizePartNumber(raw: string | number): string {
  return String(raw).trim().toUpperCase();
}
