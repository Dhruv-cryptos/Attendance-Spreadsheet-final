import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wand2, CheckCheck, Undo2, Redo2, RotateCcw, Download, ShieldCheck, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { analyzeDataset } from '@/lib/analysis';
import { applyFixes, diffSummary } from '@/lib/repair';
import { downloadCSV } from '@/lib/export';
import { pushActivity } from '@/lib/storage';
import { Card, Button, EmptyState, SectionTitle, SeverityBadge, Badge, ScoreRing } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Dataset, Issue } from '@/lib/types';

interface Snapshot {
  rows: Record<string, unknown>[];
  appliedCount: number;
  label: string;
}

export default function CleaningStudio() {
  const { dataset, analysis, setAnalysis, updateRows, reanalyze, toast } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [appliedTotal, setAppliedTotal] = useState(0);

  const issues = analysis?.issues ?? [];
  const fixable = useMemo(() => issues.filter((i) => i.suggestedValue !== undefined && i.suggestedValue !== null && i.rowIndex >= 0), [issues]);
  const safeFixes = fixable.filter((i) => i.autoFixable);
  const reviewFixes = fixable.filter((i) => !i.autoFixable);

  const grouped = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const i of fixable) map.set(i.type, [...(map.get(i.type) ?? []), i]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [fixable]);

  if (!dataset || !analysis) {
    return (
      <Card>
        <EmptyState
          icon={<Wand2 size={26} />}
          title="Cleaning Studio needs a dataset"
          description="Upload a dataset, run the analysis, then apply suggested corrections here — with previews, explanations, undo and reset to original."
          action={<Link to="/upload" className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Upload Dataset</Link>}
        />
      </Card>
    );
  }

  function snapshot(): Snapshot {
    return { rows: dataset!.rows.map((r) => ({ ...r })), appliedCount: appliedTotal, label: `before ${new Date().toLocaleTimeString()}` };
  }

  function commit(nextRows: Record<string, unknown>[], applied: { issue: Issue }[], label: string) {
    const snap = snapshot();
    setUndoStack((s) => [...s, snap]);
    setRedoStack([]);
    updateRows(nextRows);
    const dsNext: Dataset = { ...dataset!, rows: nextRows as Dataset['rows'] };
    const fresh = analyzeDataset(dsNext);
    setAnalysis(fresh);
    setAppliedTotal((n) => n + applied.length);
    setLog((l) => [`${new Date().toLocaleTimeString()} — ${label}: ${diffSummary(applied as never)}`, ...l].slice(0, 50));
    pushActivity('Applied fixes', `${label} — ${applied.length} fix(es) on ${dsNext.filename}`);
    toast('success', `${applied.length} fix(es) applied. Score recalculated from the updated data.`);
    setSelected(new Set());
  }

  function applySelected() {
    if (selected.size === 0) return;
    const { rows, applied } = applyFixes(dataset!, issues, selected, 'selected');
    if (applied.length === 0) {
      toast('info', 'Selected fixes are approval-only or have no suggestion. Nothing was changed.');
      return;
    }
    commit(rows, applied, 'Apply selected');
  }

  function applyAllSafe() {
    const allIds = new Set(issues.map((i) => i.id));
    const { rows, applied } = applyFixes(dataset!, issues, allIds, 'all-safe');
    if (applied.length === 0) {
      toast('info', 'No safe fixes available for this dataset.');
      return;
    }
    commit(rows, applied, 'Apply all safe fixes');
  }

  function undo() {
    if (undoStack.length === 0) return;
    const snap = undoStack[undoStack.length - 1];
    const current = snapshot();
    setRedoStack((s) => [...s, current]);
    setUndoStack((s) => s.slice(0, -1));
    updateRows(snap.rows as Dataset['rows']);
    const dsNext: Dataset = { ...dataset!, rows: snap.rows as Dataset['rows'] };
    const fresh = analyzeDataset(dsNext);
    setAnalysis(fresh);
    setAppliedTotal(snap.appliedCount);
    setLog((l) => [`${new Date().toLocaleTimeString()} — Undo to ${snap.label}`, ...l]);
    toast('info', 'Undo complete — previous data restored.');
  }

  function redo() {
    if (redoStack.length === 0) return;
    const snap = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, snapshot()]);
    updateRows(snap.rows as Dataset['rows']);
    const dsNext: Dataset = { ...dataset!, rows: snap.rows as Dataset['rows'] };
    const fresh = analyzeDataset(dsNext);
    setAnalysis(fresh);
    setAppliedTotal(snap.appliedCount);
    setLog((l) => [`${new Date().toLocaleTimeString()} — Redo`, ...l]);
    toast('info', 'Redo complete.');
  }

  function reset() {
    const orig = originalRef.current;
    if (!orig) return;
    setUndoStack((s) => [...s, snapshot()]);
    setRedoStack([]);
    updateRows(orig.rows as Dataset['rows']);
    const dsNext: Dataset = { ...dataset!, rows: orig.rows as Dataset['rows'], columns: orig.columns, columnTypes: orig.columnTypes };
    const fresh = analyzeDataset(dsNext);
    setAnalysis(fresh);
    setAppliedTotal(0);
    setLog((l) => [`${new Date().toLocaleTimeString()} — Reset to original uploaded data`, ...l]);
    toast('info', 'Reset to the original uploaded dataset.');
  }

  const originalRef = useRef<Dataset | null>(null);
  if (!originalRef.current || originalRef.current.id !== dataset.id) {
    originalRef.current = { ...dataset, rows: dataset.rows.map((r) => ({ ...r })) };
  }
  const original = originalRef.current;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Wand2 size={18} />}
        title="Cleaning Studio"
        subtitle="Review, preview and apply corrections. Nothing changes without an explicit apply."
        right={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={undo} disabled={undoStack.length === 0}><Undo2 size={14} /> Undo</Button>
            <Button size="sm" variant="subtle" onClick={redo} disabled={redoStack.length === 0}><Redo2 size={14} /> Redo</Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={appliedTotal === 0}><RotateCcw size={14} /> Reset to original</Button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex items-center justify-around gap-4 p-5" glow>
          <ScoreRing score={analysis.score.overall} size={110} label="Live score" />
          <div className="text-xs text-slate-400">
            <div className="mb-1 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> {appliedTotal} fix{appliedTotal === 1 ? '' : 'es'} applied</div>
            <div className="mb-1 flex items-center gap-1.5"><Sparkles size={13} className="text-sky-400" /> {safeFixes.length} safe fixes available</div>
            <div className="flex items-center gap-1.5"><AlertTriangle size={13} className="text-amber-400" /> {reviewFixes.length} need your approval</div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={applyAllSafe} disabled={safeFixes.length === 0}>
              <CheckCheck size={15} /> Apply all safe fixes ({safeFixes.length})
            </Button>
            <Button onClick={applySelected} variant="ghost" disabled={selected.size === 0}>
              Apply selected ({selected.size})
            </Button>
            <Button onClick={() => { downloadCSV(dataset, dataset.rows); toast('success', 'Cleaned dataset downloaded as CSV.'); }} variant="subtle">
              <Download size={15} /> Download current data (CSV)
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            <ShieldCheck size={12} className="mr-1 inline text-emerald-400" />
            Safe fixes (whitespace, casing, standard category spelling, date formats) can be applied in bulk. Missing values, outlier replacements and record changes always require individual approval — DataGuard never invents missing information or silently deletes rows.
          </p>
        </Card>
      </div>

      {/* Fix list */}
      {fixable.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title={issues.length === 0 ? 'No fixes needed' : 'No auto-suggested corrections'}
            description={issues.length === 0
              ? 'This dataset is clean — every check passed.'
              : 'Remaining issues either need a value you must choose (missing data) or are informational (outliers, duplicates). Review them in the Issue Explorer.'}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([type, items]) => (
            <Card key={type} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
                <SeverityBadge severity={items[0].severity} />
                <span className="text-sm font-medium capitalize text-slate-200">{type.replace(/_/g, ' ')}</span>
                <Badge tone="slate">{items.length}</Badge>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setSelected((prev) => { const n = new Set(prev); items.forEach((i) => n.add(i.id)); return n; })}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    Select all {items.length}
                  </button>
                  <button
                    onClick={() => setSelected((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(i.id)); return n; })}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    Deselect
                  </button>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.slice(0, 60).map((iss) => (
                  <label key={iss.id} className="flex cursor-pointer items-start gap-3 px-5 py-3 transition hover:bg-white/[0.02]">
                    <input
                      type="checkbox"
                      checked={selected.has(iss.id)}
                      onChange={() => toggle(iss.id)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-sky-300">Row {iss.rowIndex + 1} · {iss.column}</span>
                        <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-300">“{String(iss.originalValue ?? '')}”</span>
                        <span className="text-slate-500">→</span>
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">“{String(iss.suggestedValue)}”</span>
                        <span className="ml-auto text-[11px] text-slate-500">confidence {Math.round(iss.confidence * 100)}%</span>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{iss.reason}</p>
                    </div>
                  </label>
                ))}
                {items.length > 60 && <div className="px-5 py-2 text-xs text-slate-500">Showing 60 of {items.length}.</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-100">Cleaning Activity Log</h3>
          <div className="space-y-1.5 font-mono text-xs text-slate-400">
            {log.map((l, i) => <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2">{l}</div>)}
          </div>
        </Card>
      )}
    </div>
  );
}
