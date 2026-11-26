import { FileBarChart, Printer, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { Card, Button, EmptyState, SectionTitle, Badge, ScoreRing } from '@/components/ui';
import { downloadCSV, downloadJsonReport, downloadExcelReport, baseName } from '@/lib/export';
import { pushActivity, getActivity } from '@/lib/storage';

export default function Reports() {
  const { dataset, analysis, toast } = useApp();

  if (!dataset || !analysis) {
    return (
      <Card>
        <EmptyState
          icon={<FileBarChart size={26} />}
          title="No report available yet"
          description="Reports are generated from the currently analyzed dataset: quality dimensions, issue breakdown, suggested fixes and applied corrections."
          action={<Link to="/upload" className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Upload Dataset</Link>}
        />
      </Card>
    );
  }

  const { score, severityCounts, typeCounts, issues } = analysis;

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<FileBarChart size={18} />}
        title="Reports"
        subtitle={`Quality report for ${dataset.filename}`}
        right={
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { downloadCSV(dataset, dataset.rows); toast('success', 'Cleaned CSV downloaded.'); }}>
              <FileSpreadsheet size={14} /> Cleaned CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { downloadJsonReport(dataset, analysis, countApplied()); toast('success', 'JSON report downloaded.'); }}>
              <FileJson size={14} /> JSON Report
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { downloadExcelReport(dataset, analysis); toast('success', 'Excel report downloaded.'); }}>
              <FileText size={14} /> Excel Report
            </Button>
            <Button size="sm" variant="subtle" onClick={() => { pushActivity('Printed report', dataset.filename); window.print(); }}>
              <Printer size={14} /> Print
            </Button>
          </div>
        }
      />

      <Card className="print-area p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-100">DataGuard AI Quality Report</h2>
            <p className="mt-1 text-sm text-slate-400">{dataset.filename} · generated {new Date().toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              {dataset.filename.startsWith('demo_') && <Badge tone="slate">Demo dataset</Badge>}
              <Badge tone="sky">{dataset.rows.length} rows</Badge>
              <Badge tone="sky">{dataset.columns.length} columns</Badge>
            </div>
          </div>
          <ScoreRing score={score.overall} size={120} label="Overall" />
        </div>

        <div className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4">
          <Dimension label="Completeness" value={score.completeness} />
          <Dimension label="Validity" value={score.validity} />
          <Dimension label="Uniqueness" value={score.uniqueness} />
          <Dimension label="Consistency" value={score.consistency} />
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] py-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-100">Severity Breakdown</h3>
            <div className="space-y-2 text-sm">
              <Row label="Critical" value={severityCounts.critical} tone="text-rose-300" />
              <Row label="Warning" value={severityCounts.warning} tone="text-amber-300" />
              <Row label="Info" value={severityCounts.info} tone="text-sky-300" />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-100">Detected Issue Types</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <Row key={t} label={t.replace(/_/g, ' ')} value={n} tone="text-slate-300" />
              ))}
              {issues.length === 0 && <p className="text-sm text-emerald-300">No issues detected.</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] py-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Score Methodology</h3>
          <p className="text-[13px] leading-relaxed text-slate-400">{score.explanation}</p>
        </div>

        <div className="border-t border-white/[0.06] py-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Suggested Fixes (top 15)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 pr-4 font-medium">Original</th>
                  <th className="py-2 pr-4 font-medium">Suggested</th>
                  <th className="py-2 pr-4 font-medium">Confidence</th>
                  <th className="py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {issues.filter((i) => i.suggestedValue !== undefined && i.suggestedValue !== null).slice(0, 15).map((i) => (
                  <tr key={i.id} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 text-sky-300">Row {i.rowIndex + 1} · {i.column}</td>
                    <td className="py-2 pr-4 font-mono text-rose-300">{String(i.originalValue ?? '')}</td>
                    <td className="py-2 pr-4 font-mono text-emerald-300">{String(i.suggestedValue)}</td>
                    <td className="py-2 pr-4 text-slate-400">{Math.round(i.confidence * 100)}%</td>
                    <td className="py-2 text-slate-400">{i.reason}</td>
                  </tr>
                ))}
                {issues.filter((i) => i.suggestedValue !== undefined && i.suggestedValue !== null).length === 0 && (
                  <tr><td colSpan={5} className="py-3 text-slate-500">No suggested fixes — dataset is clean.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Applied corrections this session: {countApplied()}. Full before/after detail for every fix is downloadable in the JSON report.
          </p>
        </div>

        <div className="border-t border-white/[0.06] pt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Before / After Comparison</h3>
          <p className="text-[13px] leading-relaxed text-slate-400">
            The cleaned CSV export reflects the working dataset in the Cleaning Studio (safe fixes applied plus approved corrections).
            The original upload is preserved untouched in the Cleaning Studio via “Reset to original”.
          </p>
        </div>

        <p className="pt-2 text-[10px] text-slate-600">
          Generated by DataGuard AI — “Your Data. Our Intelligence. Zero Guesswork.” · Report file base: {baseName(dataset.filename)}
        </p>
      </Card>
    </div>
  );
}

function countApplied(): number {
  const activity = getActivity().filter((a) => a.label === 'Applied fixes');
  return activity.reduce((sum, a) => {
    const m = a.detail.match(/(\d+) fix/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);
}

function Dimension({ label, value }: { label: string; value: number }) {
  const color = value >= 85 ? 'text-emerald-300' : value >= 60 ? 'text-sky-300' : value >= 40 ? 'text-amber-300' : 'text-rose-300';
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
      <span className="capitalize text-slate-400">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
