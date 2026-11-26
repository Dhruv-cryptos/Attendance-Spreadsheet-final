import { Info, ScanSearch, FileSpreadsheet } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { Card, ScoreRing, Bar, Badge, EmptyState, SectionTitle, Skeleton } from '@/components/ui';
import { Link } from 'react-router-dom';

const ISSUE_LABELS: Record<string, string> = {
  missing_value: 'Missing values',
  duplicate_row: 'Duplicate rows',
  duplicate_id: 'Duplicate identifiers',
  invalid_email: 'Invalid emails',
  invalid_date: 'Invalid dates',
  inconsistent_date_format: 'Inconsistent date formats',
  inconsistent_text_format: 'Inconsistent text formatting',
  invalid_numeric: 'Invalid numeric values',
  outlier: 'Suspicious outliers',
  inconsistent_category: 'Inconsistent categories',
  empty_column: 'Empty columns',
  whitespace: 'Unusual whitespace',
  inconsistent_status: 'Inconsistent statuses',
};

export default function Analyzer() {
  const { dataset, analysis, loading } = useApp();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 xl:col-span-2" />
        </div>
      </div>
    );
  }

  if (!dataset || !analysis) {
    return (
      <Card>
        <EmptyState
          icon={<ScanSearch size={26} />}
          title="No dataset analyzed yet"
          description="Upload a CSV or Excel file (or load the demo dataset) and the analysis engine will profile every column, score quality across four dimensions and list every issue it finds."
          action={<Link to="/upload" className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Upload Dataset</Link>}
        />
      </Card>
    );
  }

  const { score, severityCounts } = analysis;
  const dims = [
    { label: 'Completeness', value: score.completeness, color: '#38bdf8', desc: 'Share of non-blank cells across the whole dataset.' },
    { label: 'Validity', value: score.validity, color: '#8b5cf6', desc: 'Share of cells without critical errors (bad emails, numbers, dates).' },
    { label: 'Uniqueness', value: score.uniqueness, color: '#34d399', desc: 'Penalizes exact duplicate rows and repeated unique identifiers.' },
    { label: 'Consistency', value: score.consistency, color: '#fbbf24', desc: 'Penalizes formatting drift: date formats, casing, categories, whitespace.' },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<ScanSearch size={18} />}
        title="Data Analyzer"
        subtitle={`${dataset.filename} — ${dataset.rows.length} rows × ${dataset.columns.length} columns, analyzed ${new Date(analysis.analyzedAt).toLocaleTimeString()}`}
        right={dataset.filename.startsWith('demo_') ? <Badge tone="slate">Demo dataset</Badge> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-4 p-6" glow>
          <ScoreRing score={score.overall} size={170} label="Quality Score" />
          <div className="flex gap-2">
            <Badge tone={severityCounts.critical > 0 ? 'red' : 'green'}>{severityCounts.critical} critical</Badge>
            <Badge tone={severityCounts.warning > 0 ? 'amber' : 'green'}>{severityCounts.warning} warning</Badge>
            <Badge tone="sky">{severityCounts.info} info</Badge>
          </div>
          <p className="text-center text-xs leading-relaxed text-slate-400">
            {score.overall >= 85 ? 'Excellent quality — minor polish only.' : score.overall >= 60 ? 'Good foundation with fixable issues.' : score.overall >= 40 ? 'Significant problems need attention.' : 'Poor quality — clean before using this data.'}
          </p>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <h3 className="mb-4 font-display text-sm font-semibold text-slate-100">Dimension Scores</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {dims.map((d) => (
              <div key={d.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-200">{d.label}</span>
                  <span className="font-display text-lg font-bold" style={{ color: d.color }}>{d.value}</span>
                </div>
                <Bar value={d.value} color={d.color} />
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{d.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Info size={15} className="text-sky-400" />
          <h3 className="font-display text-sm font-semibold text-slate-100">How this score was calculated</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{score.explanation}</p>
        <p className="mt-3 text-xs text-slate-500">
          Every number is computed from your actual cells — nothing is estimated or randomized. The overall score is a weighted blend: Completeness 25%, Validity 30%, Uniqueness 25%, Consistency 20%.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-sm font-semibold text-slate-100">Detected Issues by Type</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(analysis.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <span className="text-sm text-slate-300">{ISSUE_LABELS[type] ?? type}</span>
              <Badge tone={type === 'invalid_email' || type === 'invalid_date' || type === 'invalid_numeric' || type === 'duplicate_id' ? 'red' : 'sky'}>{count}</Badge>
            </div>
          ))}
          {analysis.issues.length === 0 && (
            <div className="col-span-full flex items-center gap-2 py-4 text-sm text-emerald-300">
              <FileSpreadsheet size={15} /> No issues detected — this dataset passed every check.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
