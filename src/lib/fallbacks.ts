import type { AnalysisResult, Dataset } from './types';

function topColumns(analysis: AnalysisResult, n = 3): { column: string; count: number }[] {
  const byCol = new Map<string, number>();
  for (const i of analysis.issues) {
    if (i.severity === 'info') continue;
    byCol.set(i.column, (byCol.get(i.column) ?? 0) + 1);
  }
  return [...byCol.entries()].map(([column, count]) => ({ column, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

export function fallbackDataAnswer(question: string, ds: Dataset | null, analysis: AnalysisResult | null): string {
  if (!ds || !analysis) {
    return 'No dataset is loaded yet. Upload a CSV or Excel file (or try the demo dataset) and I can explain its quality profile, issue breakdown and suggested fixes.';
  }
  const q = question.toLowerCase();
  const { score, severityCounts, typeCounts, issues } = analysis;

  const issueList = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n');

  if (q.includes('score') || q.includes('why') || q.includes('low') || q.includes('quality')) {
    return [
      `**Deterministic score breakdown (not AI-generated):**`,
      `- Overall: ${score.overall}/100`,
      `- Completeness: ${score.completeness} — share of non-blank cells`,
      `- Validity: ${score.validity} — cells without critical errors`,
      `- Uniqueness: ${score.uniqueness} — duplicate rows and duplicate IDs lower this`,
      `- Consistency: ${score.consistency} — formatting and standardization issues lower this`,
      '',
      `The biggest drags on your score right now:`,
      ...topColumns(analysis).map((t) => `- "${t.column}" has ${t.count} significant issues`),
      '',
      score.explanation,
    ].join('\n');
  }
  if (q.includes('issue') || q.includes('problem') || q.includes('error')) {
    return `**All detected issues (deterministic scan):**\n${issueList || 'No issues detected.'}\n\nSeverity: ${severityCounts.critical} critical, ${severityCounts.warning} warning, ${severityCounts.info} info. Open the Issue Explorer to see row-level details.`;
  }
  if (q.includes('column') && (q.includes('most') || q.includes('worst') || q.includes('error'))) {
    const top = topColumns(analysis, 5);
    return top.length === 0
      ? 'No column-level problems detected.'
      : `**Columns with the most significant issues:**\n${top.map((t, i) => `${i + 1}. "${t.column}" — ${t.count} issues`).join('\n')}`;
  }
  if (q.includes('summar') || q.includes('overview') || q.includes('dataset')) {
    return [
      `**Dataset summary (computed from your data):**`,
      `- File: ${ds.filename}, ${ds.rows.length} rows × ${ds.columns.length} columns`,
      `- Column types: ${ds.columns.map((c) => `${c} (${ds.columnTypes[c]})`).join(', ')}`,
      `- Quality score: ${score.overall}/100`,
      `- Issues: ${severityCounts.critical} critical / ${severityCounts.warning} warning / ${severityCounts.info} info`,
      '',
      issueList ? `Most frequent issue types:\n${issueList}` : 'No issues found — this dataset looks clean.',
    ].join('\n');
  }
  if (q.includes('improve') || q.includes('clean') || q.includes('fix')) {
    const safe = issues.filter((i) => i.autoFixable).length;
    const review = issues.filter((i) => !i.autoFixable).length;
    return [
      '**Suggested cleaning plan:**',
      `1. Apply the ${safe} safe automatic fixes (whitespace, formatting, standard categories) in the Cleaning Studio.`,
      `2. Review the ${review} fixes that need approval — missing values, suspicious outliers, invalid emails and duplicate records.`,
      `3. Re-check the score after cleaning; it recalculates from the actual data, never estimated.`,
      `4. Download the cleaned CSV and the JSON report from the Reports page.`,
    ].join('\n');
  }
  if (q.includes('outlier') || q.includes('suspicious')) {
    const out = issues.filter((i) => i.type === 'outlier' || i.severity === 'critical').slice(0, 10);
    return out.length === 0
      ? 'No suspicious values flagged in the current scan.'
      : `**Suspicious values found (deterministic detection):**\n${out.map((i) => `- Row ${i.rowIndex + 1}, "${i.column}": ${i.originalValue ?? '(blank)'} — ${i.reason}`).join('\n')}`;
  }
  return [
    `I can explain the current dataset (${ds.filename}, score ${score.overall}/100). Deterministic facts I already know:`,
    `- ${severityCounts.critical} critical, ${severityCounts.warning} warning, ${severityCounts.info} info issues`,
    `- ${ds.rows.length} rows × ${ds.columns.length} columns`,
    '',
    'Try asking: "Why is my score low?", "Which column has the most errors?", "Summarize this dataset", "How do I improve data quality?" or "Explain suspicious values". For full AI analysis, configure the Gemini key (see Settings).',
  ].join('\n');
}

export function fallbackSupportAnswer(question: string, pageHint: string): string {
  const q = question.toLowerCase();
  const base = [
    '**DataGuard AI help (rule-based mode)**',
    '',
    '- **Upload:** go to Upload Dataset, drag a CSV/XLSX/XLS file or click the area to browse. CSV delimiters (comma, semicolon, tab, pipe) are auto-detected.',
    '- **Analysis:** after upload the engine profiles every column, infers types, and scans for missing values, duplicates, invalid emails/dates/numbers, outliers, inconsistent categories and formatting problems.',
    '- **Score:** 0-100 built from Completeness (25%), Validity (30%), Uniqueness (25%) and Consistency (20%). Every point is computed from your actual cells.',
    '- **Fixes:** Cleaning Studio shows each suggested correction with the original value, suggested value, reason and confidence. "Apply all safe fixes" handles whitespace/formatting; anything business-impacting needs your approval. Undo and Reset to original are always available.',
    '- **Export:** Reports page offers the cleaned CSV, a JSON quality report, an Excel report and a printable view.',
  ].join('\n');
  if (q.includes('gemini') || q.includes('api') || q.includes('key') || q.includes('configur')) {
    return base + '\n\n**Gemini setup:** add your `GEMINI_API_KEY` as a Supabase edge-function secret named `GEMINI_API_KEY`. The Data AI Assistant and Support chat will then use the real model; until then they answer with the built-in rule engine (clearly labeled). See Settings for step-by-step guidance.';
  }
  if (q.includes('undo') || q.includes('revert')) {
    return '**Undo:** every apply creates a snapshot. Use Undo in the Cleaning Studio toolbar to step back, Redo to re-apply, and "Reset to original" to restore the exact uploaded file. Your original data is never modified.';
  }
  if (q.includes('format') || q.includes('file') || q.includes('upload')) {
    return `**Supported formats:** CSV (comma, semicolon, tab, pipe delimiters; UTF-8 with or without BOM), XLSX and XLS (first sheet). You are currently on: ${pageHint}. Max ~5000 rows and 10 MB per file.`;
  }
  return base;
}
