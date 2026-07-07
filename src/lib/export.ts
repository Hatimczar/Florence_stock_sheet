import { MergedRow } from './merge';

export function downloadMergedCSV(filename: string, rows: MergedRow[]) {
  const header = ['Part Number', 'Description', 'Category', 'Stock', 'Price', 'Status'];
  const lines = [
    header,
    ...rows.map((r) => [
      r.partNumber,
      r.description,
      r.category,
      r.stock === null ? '' : String(r.stock),
      r.price === null ? '' : String(r.price),
      r.status,
    ]),
  ];
  const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
