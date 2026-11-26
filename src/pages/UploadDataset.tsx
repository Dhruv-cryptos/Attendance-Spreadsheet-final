import { useCallback, useRef, useState } from 'react';
import { Upload as UploadIcon, FileSpreadsheet, Play, CheckCircle2, AlertCircle, Trash2, CloudUpload } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { parseAnyFile } from '@/lib/parser';
import { Card, Button, Badge, SectionTitle } from '@/components/ui';
import { cn } from '@/lib/cn';

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 5000;

export default function UploadDataset() {
  const { dataset, analysis, setDataset, loadDemo, toast, setLoading, loading } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      const msg = `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 10 MB.`;
      setError(msg);
      toast('error', msg);
      return;
    }
    setLoading(true);
    const { dataset: ds, error: parseError } = await parseAnyFile(file);
    setLoading(false);
    if (parseError || !ds) {
      const msg = parseError ?? 'Could not parse this file.';
      setError(msg);
      toast('error', msg);
      return;
    }
    if (ds.rows.length === 0) {
      const msg = 'The file parsed successfully but contains no data rows.';
      setError(msg);
      toast('error', msg);
      return;
    }
    if (ds.rows.length >= MAX_ROWS) {
      toast('info', `Large file: using the first ${MAX_ROWS} rows for analysis.`);
    }
    setDataset(ds, false);
    toast('success', `${ds.filename} loaded — ${ds.rows.length} rows × ${ds.columns.length} columns.`);
  }, [setDataset, setLoading, toast]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SectionTitle
        icon={<UploadIcon size={18} />}
        title="Upload Dataset"
        subtitle="CSV, XLSX and XLS — any schema, any domain. Analysis runs entirely in your browser."
      />

      {!dataset && (
        <Card
          className={cn(
            'relative overflow-hidden transition-all duration-300',
            dragOver && 'border-sky-400/50 bg-sky-500/[0.06]',
          )}
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-4 px-6 py-16 text-center"
          >
            <div className={cn(
              'flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 transition-transform duration-300',
              dragOver && 'scale-110',
            )}>
              <CloudUpload size={34} className="text-sky-300" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-slate-100">Drag & drop your dataset here</p>
              <p className="mt-1 text-sm text-slate-400">or click to browse — CSV, XLSX, XLS up to 10 MB (first 5,000 rows analyzed)</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge tone="sky">Comma, semicolon, tab & pipe delimiters</Badge>
              <Badge tone="sky">UTF-8 & UTF-8 BOM</Badge>
              <Badge tone="sky">Headers auto-detected</Badge>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </div>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-950/40 p-4 text-sm text-rose-200 animate-fade-in">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <div><span className="font-semibold">Upload failed.</span> {error}</div>
        </div>
      )}

      {!dataset && (
        <Card className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Play size={17} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">No dataset handy?</div>
              <div className="text-xs text-slate-400">Load a realistic employee dataset with 30+ intentional quality problems.</div>
            </div>
          </div>
          <Button onClick={loadDemo} variant="ghost"><Play size={15} /> Try Demo Dataset</Button>
        </Card>
      )}

      {dataset && (
        <>
          <Card className="p-5 animate-fade-up" glow>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-sky-300">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-slate-100">{dataset.filename}</h3>
                    {dataset.filename.startsWith('demo_') && <Badge tone="slate">Demo data</Badge>}
                  </div>
                  <p className="text-xs text-slate-400">{formatSize(dataset.fileSize)} · uploaded {new Date(dataset.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => { setDataset(null, false); toast('info', 'Dataset removed.'); }}>
                <Trash2 size={14} /> Remove
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Rows" value={dataset.rows.length.toLocaleString()} />
              <Metric label="Columns" value={dataset.columns.length} />
              <Metric label="Data Cells" value={(dataset.rows.length * dataset.columns.length).toLocaleString()} />
              <Metric
                label="Processing Status"
                value={loading ? 'Analyzing…' : analysis ? 'Analyzed' : 'Ready'}
                tone={loading ? 'text-amber-300' : analysis ? 'text-emerald-300' : 'text-sky-300'}
              />
            </div>
          </Card>

          <Card className="p-5 animate-fade-up">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <h3 className="font-display text-sm font-semibold text-slate-100">Detected Column Types</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dataset.columns.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <span className="truncate text-sm text-slate-200">{c}</span>
                  <TypeBadge type={dataset.columnTypes[c] ?? 'text'} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden animate-fade-up">
            <div className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-slate-100">Data Preview</h3>
              <p className="text-xs text-slate-500">First {Math.min(8, dataset.rows.length)} of {dataset.rows.length} rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    {dataset.columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-2.5 font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.03] transition hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-slate-600">{i + 1}</td>
                      {dataset.columns.map((c) => (
                        <td key={c} className={cn('whitespace-nowrap px-4 py-2', row[c] === null ? 'italic text-rose-400/70' : 'text-slate-300')}>
                          {row[c] === null ? 'empty' : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone = 'text-slate-100' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className={cn('font-display text-lg font-bold', tone)}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const tones: Record<string, string> = {
    number: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
    date: 'bg-violet-500/15 text-violet-300 border-violet-400/25',
    email: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
    categorical: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
    text: 'bg-slate-500/15 text-slate-300 border-slate-400/25',
  };
  return <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', tones[type] ?? tones.text)}>{type}</span>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
