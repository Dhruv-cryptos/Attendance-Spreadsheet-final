import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { Card, Badge, EmptyState, SectionTitle, SeverityBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { IssueType, Severity } from '@/lib/types';

const ISSUE_LABELS: Record<string, string> = {
  missing_value: 'Missing value',
  duplicate_row: 'Duplicate row',
  duplicate_id: 'Duplicate identifier',
  invalid_email: 'Invalid email',
  invalid_date: 'Invalid date',
  inconsistent_date_format: 'Inconsistent date format',
  inconsistent_text_format: 'Inconsistent text format',
  invalid_numeric: 'Invalid numeric',
  outlier: 'Outlier',
  inconsistent_category: 'Inconsistent category',
  empty_column: 'Empty column',
  whitespace: 'Whitespace',
  inconsistent_status: 'Inconsistent status',
};

export default function IssueExplorer() {
  const { dataset, analysis } = useApp();
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all');
  const [columnFilter, setColumnFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const columns = useMemo(() => (dataset ? [...new Set(analysis?.issues.map((i) => i.column) ?? [])] : []), [dataset, analysis]);

  const filtered = useMemo(() => {
    if (!analysis) return [];
    return analysis.issues.filter((i) => {
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      if (columnFilter !== 'all' && i.column !== columnFilter) return false;
      if (search) {
        const hay = `${i.type} ${i.column} ${i.originalValue ?? ''} ${i.reason} row ${i.rowIndex + 1}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [analysis, severityFilter, typeFilter, columnFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const i of filtered) {
      const key = i.type;
      map.set(key, [...(map.get(key) ?? []), i]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  function toggleGroup(type: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (!dataset || !analysis) {
    return (
      <Card>
        <EmptyState
          icon={<AlertTriangle size={26} />}
          title="Nothing to explore yet"
          description="The Issue Explorer lists every problem found in the currently loaded dataset, with row numbers, original values and explanations."
          action={<Link to="/upload" className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Upload Dataset</Link>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<AlertTriangle size={18} />}
        title="Issue Explorer"
        subtitle={`${analysis.issues.length} issues detected in ${dataset.filename} — click a type to inspect affected rows`}
      />

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-slate-400"><Filter size={15} /><span className="text-xs font-medium uppercase tracking-wider">Filters</span></div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400/50"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as IssueType | 'all')}
          className="max-w-[220px] rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400/50"
        >
          <option value="all">All issue types</option>
          {Object.entries(analysis.typeCounts).map(([t]) => <option key={t} value={t}>{ISSUE_LABELS[t] ?? t}</option>)}
        </select>
        <select
          value={columnFilter}
          onChange={(e) => setColumnFilter(e.target.value)}
          className="max-w-[200px] rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400/50"
        >
          <option value="all">All columns</option>
          {columns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values, reasons, row numbers..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-sky-400/50"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title={analysis.issues.length === 0 ? 'Zero issues found' : 'No issues match these filters'}
            description={analysis.issues.length === 0
              ? 'Congratulations — this dataset passed every deterministic check. The score reflects the actual cell data.'
              : 'Try clearing the search box or widening the severity/type filters.'}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([type, items]) => {
            const isOpen = expanded.has(type);
            const sev = items[0].severity;
            return (
              <Card key={type} className="overflow-hidden">
                <button
                  onClick={() => toggleGroup(type)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                >
                  <SeverityBadge severity={sev} />
                  <span className="font-medium text-slate-200">{ISSUE_LABELS[type] ?? type}</span>
                  <Badge tone="slate">{items.length} occurrence{items.length !== 1 ? 's' : ''}</Badge>
                  <span className="ml-auto text-slate-500">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </button>
                {isOpen && (
                  <div className="animate-fade-in divide-y divide-white/[0.04] border-t border-white/[0.06]">
                    {items.slice(0, 100).map((iss) => (
                      <div key={iss.id} className="px-5 py-3.5 text-sm transition hover:bg-white/[0.02]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-sky-300">
                            {iss.rowIndex >= 0 ? `Row ${iss.rowIndex + 1}` : 'Dataset'} · {iss.column}
                          </span>
                          {iss.originalValue !== null && <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-300">“{String(iss.originalValue)}”</span>}
                          {iss.suggestedValue !== undefined && iss.suggestedValue !== null && (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">→ “{String(iss.suggestedValue)}”</span>
                          )}
                          <span className="ml-auto text-[11px] text-slate-500">confidence {Math.round(iss.confidence * 100)}%</span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{iss.reason}</p>
                      </div>
                    ))}
                    {items.length > 100 && (
                      <div className="px-5 py-2.5 text-xs text-slate-500">Showing first 100 of {items.length} — refine filters to narrow down.</div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
