// Lightweight CSV exporter for preview tables. No deps — runs in the browser.
// Escapes values per RFC 4180: doublequote-wrapped, internal " doubled,
// and UTF-8 BOM prepended so Excel opens it without mojibake.

const escape = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export interface ExportableTable {
  columns: { name: string }[];
  data: any[][];
}

export const toCsv = (table: ExportableTable): string => {
  const header = table.columns.map((c) => escape(c.name)).join(',');
  const rows = table.data.map((row) => row.map(escape).join(','));
  return [header, ...rows].join('\r\n');
};

export const downloadCsv = (table: ExportableTable, filename: string) => {
  const csv = toCsv(table);
  // UTF-8 BOM so Excel detects encoding on double-click.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const slugifyFilename = (input: string, fallback = 'nucleai-export') => {
  const base = (input || fallback)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || fallback;
};
