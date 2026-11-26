import Papa from 'papaparse';
import type { AnalysisResult, Dataset, Issue } from './types';
import * as XLSX from 'xlsx';

export function downloadCSV(ds: Dataset, rows: Record<string, unknown>[], suffix = 'cleaned') {
  const csv = Papa.unparse(rows, { columns: ds.columns });
  triggerDownload(csv, `${baseName(ds.filename)}_${suffix}.csv`, 'text/csv');
}

export function downloadJsonReport(ds: Dataset, analysis: AnalysisResult, appliedCount: number) {
  const report = {
    product: 'DataGuard AI',
    generatedAt: new Date().toISOString(),
    dataset: {
      filename: ds.filename,
      sizeBytes: ds.fileSize,
      rows: ds.rows.length,
      columns: ds.columns.length,
      columnTypes: ds.columnTypes,
    },
    qualityScore: analysis.score,
    severityBreakdown: analysis.severityCounts,
    issueTypeCounts: analysis.typeCounts,
    issues: analysis.issues.slice(0, 500),
    appliedCorrections: appliedCount,
  };
  triggerDownload(JSON.stringify(report, null, 2), `${baseName(ds.filename)}_report.json`, 'application/json');
}

export function downloadExcelReport(ds: Dataset, analysis: AnalysisResult) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ['DataGuard AI Quality Report'],
    ['Dataset', ds.filename],
    ['Rows', ds.rows.length],
    ['Columns', ds.columns.length],
    ['Overall Score', analysis.score.overall],
    ['Completeness', analysis.score.completeness],
    ['Validity', analysis.score.validity],
    ['Uniqueness', analysis.score.uniqueness],
    ['Consistency', analysis.score.consistency],
    [],
    ['Issue Type', 'Count'],
    ...Object.entries(analysis.typeCounts).map(([k, v]) => [k, v]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  const issueRows = analysis.issues.map((i) => ({
    Type: i.type, Column: i.column, Row: i.rowIndex + 1, Severity: i.severity,
    Original: String(i.originalValue ?? ''), Suggested: i.suggestedValue === null || i.suggestedValue === undefined ? '' : String(i.suggestedValue),
    Reason: i.reason, Confidence: i.confidence, AutoFixable: i.autoFixable ? 'yes' : 'no',
  }));
  const wsIssues = XLSX.utils.json_to_sheet(issueRows);
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Issues');
  XLSX.writeFile(wb, `${baseName(ds.filename)}_report.xlsx`);
}

export function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function baseName(f: string): string {
  return f.replace(/\.[^.]+$/, '');
}
