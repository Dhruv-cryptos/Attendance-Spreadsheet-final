import type { CellValue, Dataset, Issue } from './types';
export interface RepairOp {
  issue: Issue;
  from: unknown;
  to: unknown;
  kind: 'cell' | 'delete_row';
}

export interface RepairResult {
  rows: Record<string, unknown>[];
  applied: RepairOp[];
}

/** Build the next working rows by applying the selected issues' fixes. */
export function applyFixes(
  ds: Dataset,
  issues: Issue[],
  selected: Set<string>,
  mode: 'selected' | 'all-safe',
): { rows: Record<string, unknown>[]; applied: RepairOp[] } {
  const applicable = issues.filter((i) => {
    if (!selected.has(i.id)) return false;
    if (mode === 'all-safe' && !i.autoFixable) return false;
    return i.suggestedValue !== undefined && i.suggestedValue !== null && i.rowIndex >= 0;
  });

  const rows = ds.rows.map((r) => ({ ...r }));
  const applied: RepairOp[] = [];

  for (const iss of applicable) {
    if (iss.rowIndex >= rows.length) continue;
    const from = rows[iss.rowIndex][iss.column];
    rows[iss.rowIndex][iss.column] = iss.suggestedValue as CellValue;
    applied.push({ issue: iss, from, to: iss.suggestedValue, kind: 'cell' });
  }
  return { rows, applied };
}

/** Simple single-level undo snapshot manager lives in the store; this just diffs for log. */
export function diffSummary(applied: RepairOp[]): string {
  if (applied.length === 0) return 'No fixes applied.';
  const byCol = new Map<string, number>();
  for (const op of applied) byCol.set(op.issue.column, (byCol.get(op.issue.column) ?? 0) + 1);
  return `${applied.length} fix(es): ${[...byCol.entries()].map(([c, n]) => `${c}×${n}`).join(', ')}`;
}

/** Validate an AI-suggested correction against the deterministic engine rules. */
export function validateSuggestion(issue: Issue, suggestion: string): { ok: boolean; reason: string } {
  if (suggestion === null || suggestion.trim() === '') return { ok: false, reason: 'Suggestion is empty.' };
  switch (issue.type) {
    case 'invalid_email': {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      return re.test(suggestion.trim()) ? { ok: true, reason: 'Valid email format.' } : { ok: false, reason: 'Not a valid email format.' };
    }
    case 'invalid_numeric': {
      return isNaN(Number(suggestion)) ? { ok: false, reason: 'Not a number.' } : { ok: true, reason: 'Parses as a number.' };
    }
    case 'invalid_date': {
      return isNaN(Date.parse(suggestion)) ? { ok: false, reason: 'Not a parseable date.' } : { ok: true, reason: 'Parses as a valid date.' };
    }
    case 'outlier':
      return { ok: true, reason: 'Replacement accepted for review.' };
    default:
      return { ok: true, reason: 'Accepted.' };
  }
}
