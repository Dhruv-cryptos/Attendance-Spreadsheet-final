import type { AnalysisResult, CellValue, Dataset, Issue, IssueType, QualityScore, Severity } from './types';
import { detectColumnType } from './parser';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normDateFormats(v: string): string[] {
  const t = v.trim();
  // dd/mm/yyyy or mm/dd/yyyy vs yyyy-mm-dd vs dd-mm-yyyy vs yyyy/mm/dd
  const m = t.match(/^(\d{1,4})([-/.])(\d{1,2})\2(\d{1,4})$/);
  if (m) return [t];
  if (!isNaN(Date.parse(t))) return [t];
  return [t];
}

export function analyzeDataset(ds: Dataset): AnalysisResult {
  const issues: Issue[] = [];
  let id = 0;
  const nextId = () => `iss_${id++}`;
  const cols = ds.columns;
  const types = ds.columnTypes;
  const n = ds.rows.length;

  // Type re-inference safety (types stored on dataset)
  for (const c of cols) {
    if (!types[c]) types[c] = detectColumnType(ds.rows.map((r) => r[c]), c);
  }

  // 1. Empty columns
  for (const c of cols) {
    const filled = ds.rows.filter((r) => r[c] !== null && String(r[c]).trim() !== '').length;
    if (n > 0 && filled === 0) {
      issues.push({
        id: nextId(), type: 'empty_column', column: c, rowIndex: -1,
        originalValue: null, reason: `Column "${c}" is completely empty across all ${n} rows. Consider removing it.`,
        severity: 'info', confidence: 1, autoFixable: false,
      });
    }
  }

  // 2. Row-level checks
  const datePatternsPerCol: Record<string, Map<string, number>> = {};
  const seenRows = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const row = ds.rows[i];
    const rowKey = JSON.stringify(cols.map((c) => row[c]));

    // duplicates
    const prev = seenRows.get(rowKey);
    if (prev !== undefined) {
      issues.push({
        id: nextId(), type: 'duplicate_row', column: cols[0] ?? '(row)', rowIndex: i,
        originalValue: row[cols[0]] ?? null,
        reason: `Row ${i + 1} is an exact duplicate of row ${prev[0] + 1}.`,
        severity: 'warning', confidence: 1, autoFixable: false,
      });
      prev.push(i);
    } else {
      seenRows.set(rowKey, [i]);
    }

    for (const c of cols) {
      const raw = row[c];
      const t = types[c];
      const isBlank = raw === null || String(raw).trim() === '';

      // missing values (skip empty columns already flagged)
      if (isBlank) {
        if (filledRatio(ds.rows, c) > 0) {
          issues.push({
            id: nextId(), type: 'missing_value', column: c, rowIndex: i,
            originalValue: null, reason: `Missing value in "${c}". Suggestion requires your approval.`,
            severity: 'warning', confidence: 0.9, autoFixable: false,
          });
        }
        continue;
      }

      const s = String(raw);

      // whitespace
      if (s !== s.trim() || /\s{2,}/.test(s)) {
        issues.push({
          id: nextId(), type: 'whitespace', column: c, rowIndex: i,
          originalValue: raw, suggestedValue: cleanWhitespace(s),
          reason: 'Extra leading/trailing or repeated internal whitespace found. Safe to normalize.',
          severity: 'info', confidence: 1, autoFixable: true,
        });
        row[c] = cleanWhitespace(s); // update working copy so later checks see normalized text
      }

      const sv = String(row[c] ?? '');

      // emails
      if (t === 'email' && sv && !EMAIL_RE.test(sv.trim())) {
        const fixed = tryFixEmail(sv);
        issues.push({
          id: nextId(), type: 'invalid_email', column: c, rowIndex: i,
          originalValue: raw, suggestedValue: fixed,
          reason: `"${sv}" is not a valid email address (expected name@domain.tld).`,
          severity: 'critical', confidence: fixed ? 0.85 : 1, autoFixable: false,
        });
      }

      // numerics
      if (t === 'number' && sv && isNaN(Number(sv.replace(/[,₹$€% ]/g, '')))) {
        const cleaned = sv.replace(/[^0-9.\-]/g, '');
        const isFixable = cleaned && !isNaN(Number(cleaned));
        issues.push({
          id: nextId(), type: 'invalid_numeric', column: c, rowIndex: i,
          originalValue: raw, suggestedValue: isFixable ? Number(cleaned) : null,
          reason: `"${sv}" is not a valid number in numeric column "${c}".`,
          severity: 'critical', confidence: isFixable ? 0.8 : 1, autoFixable: false,
        });
      }

      // dates
      if (t === 'date' && sv) {
        const ok = !isNaN(Date.parse(sv.trim())) || /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(sv.trim());
        if (!ok) {
          issues.push({
            id: nextId(), type: 'invalid_date', column: c, rowIndex: i,
            originalValue: raw, suggestedValue: null,
            reason: `"${sv}" does not parse as a valid date in "${c}".`,
            severity: 'critical', confidence: 1, autoFixable: false,
          });
        } else {
          const pat = datePattern(sv.trim());
          const m = datePatternsPerCol[c] ?? new Map<string, number>();
          m.set(pat, (m.get(pat) ?? 0) + 1);
          datePatternsPerCol[c] = m;
        }
      }

      // text case formatting (text and categorical only)
      if ((t === 'text' || t === 'categorical') && sv) {
        if (/^[A-Z\s]+$/.test(sv) && sv.length > 3 && /[A-Z]{4}/.test(sv)) {
          issues.push({
            id: nextId(), type: 'inconsistent_text_format', column: c, rowIndex: i,
            originalValue: raw, suggestedValue: titleCase(sv),
            reason: `"${sv}" is ALL CAPS, inconsistent with the rest of "${c}". Safe to normalize to title case.`,
            severity: 'info', confidence: 0.8, autoFixable: true,
          });
        }
      }
    }
  }

  // inconsistent date formats per column
  for (const c of Object.keys(datePatternsPerCol)) {
    const pats = datePatternsPerCol[c];
    if (pats.size > 1) {
      const dominant = [...pats.entries()].sort((a, b) => b[1] - a[1])[0][0];
      for (let i = 0; i < n; i++) {
        const sv = String(ds.rows[i][c] ?? '').trim();
        if (sv && datePattern(sv) !== dominant) {
          const fixed = normalizeDate(sv, dominant);
          issues.push({
            id: nextId(), type: 'inconsistent_date_format', column: c, rowIndex: i,
            originalValue: ds.rows[i][c], suggestedValue: fixed,
            reason: `Date format in "${c}" is inconsistent: "${sv}" vs the dominant format "${dominant}".`,
            severity: 'warning', confidence: fixed ? 0.9 : 0.7, autoFixable: !!fixed,
          });
        }
      }
    }
  }

  // 3. Categorical inconsistencies + fuzzy grouping
  for (const c of cols) {
    if (types[c] !== 'categorical') continue;
    const groups = new Map<string, { display: string; count: number; rows: number[] }>();
    for (let i = 0; i < n; i++) {
      const raw = ds.rows[i][c];
      if (raw === null || String(raw).trim() === '') continue;
      const key = String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
      const g = groups.get(key) ?? { display: String(raw), count: 0, rows: [] };
      g.count++;
      g.rows.push(i);
      groups.set(key, g);
    }
    for (const g of groups.values()) {
      if (g.count < 2) continue;
      const variants = new Set(g.rows.map((i) => String(ds.rows[i][c]).trim()));
      if (variants.size > 1) {
        const dominant = [...g.rows.map((i) => String(ds.rows[i][c]).trim())]
          .reduce((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {} as Record<string, number>);
        const best = Object.entries(dominant).sort((a, b) => b[1] - a[1])[0][0];
        for (const i of g.rows) {
          const v = String(ds.rows[i][c]).trim();
          if (v !== best) {
            issues.push({
              id: nextId(), type: 'inconsistent_category', column: c, rowIndex: i,
              originalValue: ds.rows[i][c], suggestedValue: best,
              reason: `"${v}" in "${c}" appears to be the same category as "${best}" (${g.count} occurrences). Standardize to the most frequent spelling.`,
              severity: 'warning', confidence: 0.85, autoFixable: true,
            });
          }
        }
      }
    }
  }

  // 4. Outliers per numeric column (IQR)
  for (const c of cols) {
    if (types[c] !== 'number') continue;
    const nums = ds.rows
      .map((r, i) => ({ v: Number(String(r[c]).replace(/[,₹$€% ]/g, '')), i }))
      .filter((x) => !isNaN(x.v));
    if (nums.length < 8) continue;
    const vals = nums.map((x) => x.v).sort((a, b) => a - b);
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - 3 * iqr, hi = q3 + 3 * iqr;
    if (iqr === 0) continue;
    for (const x of nums) {
      if (x.v < lo || x.v > hi) {
        issues.push({
          id: nextId(), type: 'outlier', column: c, rowIndex: x.i,
          originalValue: ds.rows[x.i][c], suggestedValue: null,
          reason: `Value ${x.v} is far outside the typical range for "${c}" (expected ${lo.toFixed(1)}–${hi.toFixed(1)}). Review before replacing.`,
          severity: 'info', confidence: 0.6, autoFixable: false,
        });
      }
    }
  }

  // 5. Duplicate identifiers
  const idCol = cols.find((c) => /^(id|employee[_\s]?id|student[_\s]?id|customer[_\s]?id|order[_\s]?id|record[_\s]?id|invoice[_\s]?id|sku|code)$/i.test(c.trim()));
  if (idCol) {
    const ids = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const v = ds.rows[i][idCol];
      if (v === null) continue;
      const k = String(v).trim().toLowerCase();
      ids.set(k, [...(ids.get(k) ?? []), i]);
    }
    for (const [k, rowsArr] of ids) {
      if (rowsArr.length > 1) {
        for (const i of rowsArr) {
          issues.push({
            id: nextId(), type: 'duplicate_id', column: idCol, rowIndex: i,
            originalValue: ds.rows[i][idCol],
            reason: `Identifier "${k}" appears ${rowsArr.length} times in "${idCol}". IDs should be unique.`,
            severity: 'critical', confidence: 1, autoFixable: false,
          });
        }
      }
    }
  }

  // 6. Attendance-style status inconsistency (domain rule, only when recognizable)
  const statusCol = cols.find((c) => /status|attendance|present/i.test(c));
  if (statusCol && types[statusCol] !== 'number' && types[statusCol] !== 'date') {
    const KNOWN = ['present', 'absent', 'late', 'excused', 'remote', 'on leave', 'leave', 'active', 'inactive', 'pending', 'completed', 'cancelled', 'canceled', 'approved', 'rejected', 'delivered', 'shipped', 'returned', 'paid', 'unpaid', 'open', 'closed', 'in progress', 'partial', 'half day', 'holiday', 'sick'];
    const canon = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const matched = new Map<string, string>();
    for (const k of KNOWN) {
      matched.set(canon(k), k);
      matched.set(k, k);
    }
    for (let i = 0; i < n; i++) {
      const raw = ds.rows[i][statusCol];
      if (raw === null || String(raw).trim() === '') continue;
      const sv = String(raw).trim();
      const c = canon(sv);
      const target = matched.get(c);
      if (target && target !== sv) {
        issues.push({
          id: nextId(), type: 'inconsistent_status', column: statusCol, rowIndex: i,
          originalValue: raw, suggestedValue: titleCase(target),
          reason: `Status "${sv}" in "${statusCol}" should be standardized to "${titleCase(target)}".`,
          severity: 'warning', confidence: 0.9, autoFixable: true,
        });
      }
    }
  }

  const score = computeScore(ds, issues);

  const severityCounts: Record<Severity, number> = { critical: 0, warning: 0, info: 0 };
  const typeCounts = {} as Record<IssueType, number>;
  for (const iss of issues) {
    severityCounts[iss.severity]++;
    typeCounts[iss.type] = (typeCounts[iss.type] ?? 0) + 1;
  }

  return {
    datasetId: ds.id,
    issues,
    score,
    severityCounts,
    typeCounts,
    analyzedAt: new Date().toISOString(),
  };
}

function filledRatio(rows: Record<string, CellValue>[], c: string): number {
  if (rows.length === 0) return 0;
  const filled = rows.filter((r) => r[c] !== null && String(r[c]).trim() !== '').length;
  return filled / rows.length;
}

function cleanWhitespace(s: string): string {
  return s.trim().replace(/\s{2,}/g, ' ');
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|[-_])(\p{L})/gu, (m) => m.toUpperCase());
}

function tryFixEmail(s: string): string | null {
  const t = s.trim().replace(/\s/g, '');
  if (EMAIL_RE.test(t)) return t;
  if (/^[^\s@]+@[^\s@]+$/.test(t)) {
    const [, dom] = t.split('@');
    if (!dom.includes('.')) {
      const common = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      const guess = common.find((d) => d.startsWith(dom.slice(0, 2).toLowerCase()));
      if (guess) return `${t}@${guess}`.replace(/@.*@/, '@');
    }
  }
  return null;
}

function datePattern(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'YYYY-MM-DD';
  if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) return 'YYYY/MM/DD';
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(s)) return 'DD/MM/YYYY';
  if (/^\d{1,2}[-]\d{1,2}[-]\d{4}$/.test(s)) return 'DD-MM-YYYY';
  return 'other';
}

function normalizeDate(s: string, target: string): string | null {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const p = (x: number) => String(x).padStart(2, '0');
  if (target === 'YYYY-MM-DD') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (target === 'YYYY/MM/DD') return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
  if (target === 'DD/MM/YYYY') return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (target === 'DD-MM-YYYY') return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  return null;
}

export function computeScore(ds: Dataset, issues: Issue[]): QualityScore {
  const n = ds.rows.length;
  const cols = ds.columns;
  if (n === 0 || cols.length === 0) {
    return { overall: 0, completeness: 0, validity: 0, uniqueness: 0, consistency: 0, explanation: 'Dataset has no data to evaluate.' };
  }

  const totalCells = n * cols.length;

  // completeness: fraction of non-blank cells
  let blanks = 0;
  for (const r of ds.rows) for (const c of cols) if (r[c] === null || String(r[c]).trim() === '') blanks++;
  const completeness = Math.max(0, 100 * (1 - blanks / totalCells));

  // validity: cells with critical issues relative to total cells
  const invalidCells = new Set(issues.filter((i) => i.severity === 'critical' && i.rowIndex >= 0).map((i) => `${i.rowIndex}|${i.column}`));
  const validity = Math.max(0, 100 * (1 - invalidCells.size / totalCells));

  // uniqueness: 1 - duplicate rows/ids
  const dupRows = issues.filter((i) => i.type === 'duplicate_row').length;
  const dupIds = new Set(issues.filter((i) => i.type === 'duplicate_id').map((i) => i.rowIndex)).size;
  const uniqueness = Math.max(0, 100 * (1 - (dupRows * 2 + dupIds) / n));

  // consistency: penalties from warning/info formatting issues
  const incons = issues.filter((i) => ['inconsistent_date_format', 'inconsistent_text_format', 'inconsistent_category', 'inconsistent_status', 'whitespace'].includes(i.type)).length;
  const consistency = Math.max(0, 100 * (1 - incons / totalCells));

  const overall = Math.round(completeness * 0.25 + validity * 0.3 + uniqueness * 0.25 + consistency * 0.2);

  const parts: string[] = [];
  parts.push(`Completeness ${completeness.toFixed(0)}% = non-blank cells (${totalCells - blanks} of ${totalCells}).`);
  parts.push(`Validity ${validity.toFixed(0)}% = cells without critical errors (${totalCells - invalidCells.size} of ${totalCells}).`);
  parts.push(`Uniqueness ${uniqueness.toFixed(0)}% penalizes ${dupRows} duplicate rows and ${dupIds} duplicate IDs.`);
  parts.push(`Consistency ${consistency.toFixed(0)}% penalizes ${incons} formatting/standardization issues.`);
  parts.push('Overall = 25% completeness + 30% validity + 25% uniqueness + 20% consistency.');

  return {
    overall,
    completeness: Math.round(completeness),
    validity: Math.round(validity),
    uniqueness: Math.round(uniqueness),
    consistency: Math.round(consistency),
    explanation: parts.join(' '),
  };
}
