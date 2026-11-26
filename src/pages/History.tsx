import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Trash2, ExternalLink, Database } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { deleteHistoryEntry } from '@/lib/storage';
import { Card, Button, EmptyState, SectionTitle, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

export default function History() {
  const { history, refreshHistory, toast } = useApp();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function remove(id: string) {
    deleteHistoryEntry(id);
    refreshHistory();
    setConfirmId(null);
    toast('info', 'History entry removed.');
  }

  if (history.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<HistoryIcon size={26} />}
          title="No analysis history yet"
          description="Every dataset you analyze is recorded here with its filename, score, size and date — stored privately in your browser."
          action={<Link to="/upload" className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110">Upload Dataset</Link>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<HistoryIcon size={18} />}
        title="History"
        subtitle={`${history.length} recorded analysis session${history.length !== 1 ? 's' : ''} — stored locally in your browser`}
      />
      <div className="space-y-2">
        {history.map((h) => (
          <Card key={h.id} className="flex flex-wrap items-center gap-4 p-4 transition hover:bg-white/[0.04]">
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold',
              h.score >= 80 ? 'bg-emerald-500/15 text-emerald-300' : h.score >= 50 ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300',
            )}>
              {h.score}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-200">{h.filename}</span>
                {h.isDemo && <Badge tone="slate">Demo</Badge>}
              </div>
              <div className="text-[11px] text-slate-500">
                {h.rowCount.toLocaleString()} rows · {h.columnCount} columns · {(h.fileSize / 1024).toFixed(1)} KB · {h.issueCount} issues · {h.resolvedCount} resolved
              </div>
              <div className="text-[11px] text-slate-600">{new Date(h.analyzedAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Link to="/analyzer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.06]">
                <ExternalLink size={12} /> Open Analyzer
              </Link>
              {confirmId === h.id ? (
                <Button size="sm" variant="danger" onClick={() => remove(h.id)}>Confirm delete</Button>
              ) : (
                <button
                  onClick={() => setConfirmId(h.id)}
                  className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-rose-400/30 hover:text-rose-300"
                  aria-label="Delete entry"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Card className="flex items-center gap-3 p-4 text-xs text-slate-500">
        <Database size={14} className="shrink-0 text-sky-400" />
        History metadata lives in your browser's local storage — clearing site data removes it. Dataset contents are never uploaded.
      </Card>
    </div>
  );
}
