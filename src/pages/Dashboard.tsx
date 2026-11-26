import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar as RBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Upload, Database, AlertTriangle, CheckCircle2, ArrowRight, Play, BarChart3,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { Card, ScoreRing, Badge, EmptyState } from '@/components/ui';
import { getActivity } from '@/lib/storage';
import type { ActivityEvent } from '@/lib/types';

const SEVERITY_COLORS: Record<string, string> = { critical: '#f87171', warning: '#fbbf24', info: '#38bdf8' };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { history, loadDemo, dataset, analysis } = useApp();
  const activity = useMemo(() => getActivity().slice(0, 6), [history.length]);

  const stats = useMemo(() => {
    const totalDatasets = history.length;
    const avgScore = totalDatasets > 0 ? Math.round(history.reduce((s, h) => s + h.score, 0) / totalDatasets) : 0;
    const totalIssues = history.reduce((s, h) => s + h.issueCount, 0);
    const resolved = history.reduce((s, h) => s + h.resolvedCount, 0);
    return { totalDatasets, avgScore, totalIssues, resolved };
  }, [history]);

  const trendData = useMemo(() =>
    [...history]
      .sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime())
      .slice(-10)
      .map((h) => ({ name: h.filename.replace(/\.[^.]+$/, '').slice(0, 12), score: h.score })),
  [history]);

  const severityData = useMemo(() => {
    if (!analysis) return [];
    return (['critical', 'warning', 'info'] as const)
      .map((s) => ({ name: s[0].toUpperCase() + s.slice(1), value: analysis.severityCounts[s] }))
      .filter((x) => x.value > 0);
  }, [analysis]);

  const typeData = useMemo(() => {
    if (!analysis) return [];
    return Object.entries(analysis.typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ name: k.replace(/_/g, ' '), count: v }));
  }, [analysis]);

  const tooltipStyle = {
    backgroundColor: '#0a1226',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#e2e8f0',
  };

  if (history.length === 0 && !dataset) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Database size={26} />}
            title="Welcome to DataGuard AI"
            description="Upload a CSV or Excel dataset to unlock automatic quality analysis, a transparent 0-100 score, and an approval-based cleaning studio. Or explore with the demo dataset — it ships with realistic data problems so you can see every feature in action."
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110">
                  <Upload size={16} /> Upload Dataset
                </Link>
                <button onClick={loadDemo} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]">
                  <Play size={16} /> Try Demo Dataset
                </button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Database size={18} />} label="Datasets Analyzed" value={stats.totalDatasets} tone="sky" />
        <StatCard icon={<BarChart3 size={18} />} label="Average Quality Score" value={stats.avgScore} suffix="/100" tone="violet" />
        <StatCard icon={<AlertTriangle size={18} />} label="Issues Detected" value={stats.totalIssues} tone="amber" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Issues Resolved" value={stats.resolved} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Quality trend */}
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">Quality Score Trend</h3>
              <p className="text-xs text-slate-500">Your last {trendData.length} analyses — real scores, chronological order</p>
            </div>
            {dataset && analysis && (
              <Link to="/analyzer" className="flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
                Current: {analysis.score.overall} <ArrowRight size={12} />
              </Link>
            )}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2.5} fill="url(#scoreGrad)" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">Analyze a dataset to see your trend.</div>
          )}
        </Card>

        {/* Current dataset score */}
        <Card className="flex flex-col items-center justify-center gap-3 p-5" glow>
          <h3 className="font-display text-sm font-semibold text-slate-100">
            {dataset ? (dataset.filename.startsWith('demo_') ? 'Demo Dataset' : 'Current Dataset') : 'No Dataset Loaded'}
          </h3>
          {dataset && analysis ? (
            <>
              <ScoreRing score={analysis.score.overall} />
              <div className="w-full space-y-2 text-xs">
                <DimBar label="Completeness" value={analysis.score.completeness} color="#38bdf8" />
                <DimBar label="Validity" value={analysis.score.validity} color="#8b5cf6" />
                <DimBar label="Uniqueness" value={analysis.score.uniqueness} color="#34d399" />
                <DimBar label="Consistency" value={analysis.score.consistency} color="#fbbf24" />
              </div>
              {dataset.filename.startsWith('demo_') && <Badge tone="slate">Demo data — not a real upload</Badge>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="max-w-[200px] text-sm text-slate-400">Load a dataset to see its live quality score here.</p>
              <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-xs font-medium text-white transition hover:brightness-110">
                <Upload size={14} /> Upload now
              </Link>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Issue distribution */}
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Issue Distribution</h3>
          <p className="text-xs text-slate-500">{analysis ? 'Severity of currently loaded dataset' : 'Load a dataset to see distribution'}</p>
          {severityData.length > 0 ? (
            <div className="mt-2 flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={4} animationDuration={800}>
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name.toLowerCase()]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {severityData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLORS[s.name.toLowerCase()] }} />
                    <span className="text-slate-300">{s.name}</span>
                    <span className="ml-auto font-semibold text-slate-100">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">No issues to visualize yet.</div>
          )}
        </Card>

        {/* Top issue types */}
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Top Issue Types</h3>
          <p className="text-xs text-slate-500">{analysis ? 'Most frequent problems in the current dataset' : 'Load a dataset to see issue types'}</p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <RBar dataKey="count" fill="#38bdf8" radius={[0, 6, 6, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">Nothing to chart yet.</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent datasets */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Recent Datasets</h3>
            <Link to="/history" className="text-xs font-medium text-sky-300 hover:text-sky-200">View all</Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.05]">
                <Database size={16} className="shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-200">{h.filename}</span>
                    {h.isDemo && <Badge tone="slate">Demo</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500">{h.rowCount} rows · {h.columnCount} cols · {fmtDate(h.analyzedAt)}</div>
                </div>
                <ScorePill score={h.score} />
              </div>
            ))}
            {history.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No analyses yet.</p>}
          </div>
        </Card>

        {/* Dataset activity */}
        <Card className="p-5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Dataset Activity</h3>
          <p className="text-xs text-slate-500">Your cleaning and analysis log</p>
          <div className="mt-3 space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-sky-400 to-violet-400" />
                <div className="min-w-0">
                  <div className="font-medium text-slate-200">{a.label}</div>
                  <div className="truncate text-xs text-slate-500">{a.detail}</div>
                  <div className="text-[10px] text-slate-600">{fmtDate(a.timestamp)}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No activity yet — analyze a dataset to start the log.</p>}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-100">Quick Actions</h3>
          <p className="text-xs text-slate-500">Jump straight into a new analysis</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
            <Upload size={15} /> Upload Dataset
          </Link>
          <button onClick={loadDemo} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]">
            <Play size={15} /> Try Demo Dataset
          </button>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, suffix, tone }: { icon: React.ReactNode; label: string; value: number; suffix?: string; tone: 'sky' | 'violet' | 'amber' | 'green' }) {
  const tones = {
    sky: 'from-sky-500/20 to-sky-500/[0.05] text-sky-300',
    violet: 'from-violet-500/20 to-violet-500/[0.05] text-violet-300',
    amber: 'from-amber-500/20 to-amber-500/[0.05] text-amber-300',
    green: 'from-emerald-500/20 to-emerald-500/[0.05] text-emerald-300',
  };
  return (
    <Card className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>{icon}</div>
      <div className="font-display text-2xl font-bold text-slate-100">{value}{suffix}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </Card>
  );
}

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-slate-400"><span>{label}</span><span className="font-semibold text-slate-200">{value}</span></div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 80 ? 'text-emerald-300 bg-emerald-500/15' : score >= 50 ? 'text-amber-300 bg-amber-500/15' : 'text-rose-300 bg-rose-500/15';
  return <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${cls}`}>{score}</span>;
}
