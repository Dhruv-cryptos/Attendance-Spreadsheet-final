import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CellValue, ColumnType, Dataset } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$|^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

export function detectColumnType(values: CellValue[], headerName: string): ColumnType {
  const nonEmpty = values.filter((v) => v !== null && String(v).trim() !== '');
  if (nonEmpty.length === 0) return 'text';
  const strs = nonEmpty.map(String);

  if (strs.some((s) => EMAIL_RE.test(s.trim()))) return 'email';
  const headerHint = headerName.toLowerCase();
  const dateHint = /date|day|time|due|deadline|joined|created/.test(headerHint);

  const allDateish = strs.every((s) => DATE_RE.test(s.trim()) || !isNaN(Date.parse(s)) === DATE_RE.test(s.trim()));
  const dateParsed = strs.filter((s) => DATE_RE.test(s.trim())).length;
  if (dateHint && dateParsed > strs.length * 0.5) return 'date';
  if (!dateHint && dateParsed === strs.length && strs.length > 0) return 'date';
  if (dateHint && allDateish && dateParsed > 0) return 'date';

  const nums = strs.filter((s) => !isNaN(Number(s.replace(/[,₹$€% ]/g, '')))) ;
  if (nums.length >= strs.length * 0.9) return 'number';

  const uniq = new Set(strs.map((s) => s.toLowerCase())).size;
  if (uniq <= Math.max(8, strs.length * 0.15) && strs.length >= 4) return 'categorical';

  return 'text';
}

interface ParseResult {
  dataset: Dataset | null;
  error?: string;
}

export function parseCSVFile(file: File, limitRows = 5000): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h, i) => h.trim() || `column_${i + 1}`,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          resolve({ dataset: null, error: `CSV parsing failed: ${results.errors[0].message}` });
          return;
        }
        const cols = results.meta.fields ?? [];
        if (cols.length === 0) {
          resolve({ dataset: null, error: 'No columns detected. The file may be empty.' });
          return;
        }
        const rows: Record<string, CellValue>[] = results.data.slice(0, limitRows).map((r) => {
          const out: Record<string, CellValue> = {};
          for (const c of cols) {
            const v = r[c];
            out[c] = v === undefined || v === '' || v === null ? null : v;
          }
          return out;
        });
        const columnTypes: Record<string, ColumnType> = {};
        for (const c of cols) {
          columnTypes[c] = detectColumnType(rows.map((r) => r[c]), c);
        }
        resolve({
          dataset: {
            id: crypto.randomUUID(),
            filename: file.name,
            fileSize: file.size,
            columns: cols,
            rows,
            columnTypes,
            uploadedAt: new Date().toISOString(),
          },
        });
      },
      error: (err) => resolve({ dataset: null, error: err.message }),
    });
  });
}

export function parseExcelFile(file: File, limitRows = 5000): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          resolve({ dataset: null, error: 'The workbook has no readable sheets.' });
          return;
        }
        const json = XLSX.utils.sheet_to_json<Record<string, CellValue>>(sheet, {
          defval: null,
          raw: true,
        });
        const cols = json.length > 0 ? Object.keys(json[0]) : [];
        if (cols.length === 0) {
          resolve({ dataset: null, error: 'The first sheet appears empty.' });
          return;
        }
        const rows = json.slice(0, limitRows).map((r) => {
          const out: Record<string, CellValue> = {};
          for (const c of cols) {
            const v = r[c];
            out[c] = v === undefined || v === '' || v === null ? null : v;
          }
          return out;
        });
        const columnTypes: Record<string, ColumnType> = {};
        for (const c of cols) {
          columnTypes[c] = detectColumnType(rows.map((r) => r[c]), c);
        }
        resolve({
          dataset: {
            id: crypto.randomUUID(),
            filename: file.name,
            fileSize: file.size,
            columns: cols,
            rows,
            columnTypes,
            uploadedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        resolve({ dataset: null, error: `Excel parsing failed: ${(err as Error).message}` });
      }
    };
    reader.onerror = () => resolve({ dataset: null, error: 'Could not read the file.' });
    reader.readAsArrayBuffer(file);
  });
}

export async function parseAnyFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return parseExcelFile(file);
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') return parseCSVFile(file);
  return { dataset: null, error: `Unsupported file type ".${ext}". Upload CSV, XLSX or XLS.` };
}
