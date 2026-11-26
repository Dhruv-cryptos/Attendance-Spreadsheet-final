import { Headset, CircleHelp, MessageSquare, Upload, ShieldCheck, KeyRound } from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import { Card, SectionTitle, Badge } from '@/components/ui';

const TOPICS = [
  { icon: <Upload size={16} />, title: 'Uploading data', body: 'Drag a CSV/XLSX/XLS file onto the Upload page, or browse. Delimiters are auto-detected and the first 5,000 rows are analyzed.' },
  { icon: <ShieldCheck size={16} />, title: 'Privacy by design', body: 'All parsing, profiling, scoring and cleaning runs in your browser. Only compact statistical summaries (scores, issue counts, a few sample rows) are sent when you chat with AI.' },
  { icon: <KeyRound size={16} />, title: 'Enabling Gemini', body: 'Add GEMINI_API_KEY as a Supabase edge-function secret. Until then, assistants answer with the built-in rule engine and every reply is clearly labeled.' },
];

export default function Support() {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Headset size={18} />}
        title="Customer Support"
        subtitle="Interactive help for operating DataGuard AI. The assistant cannot access accounts, payments or private data — and it will say so."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <Card key={t.title} className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-sky-300">{t.icon}</div>
            <h3 className="text-sm font-semibold text-slate-100">{t.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.body}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <MessageSquare size={15} className="text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-100">Chat with Support</h3>
          <Badge tone="sky">floating chat button also available on every page</Badge>
        </div>
        <div className="p-4">
          <ChatPanel mode="support-page" />
        </div>
      </Card>
    </div>
  );
}

export function HelpCenter() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <SectionTitle
        icon={<CircleHelp size={18} />}
        title="Help Center"
        subtitle="Everything you need to run a data-quality workflow end to end."
      />
      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-slate-100">The 4-step workflow</h3>
        <div className="mt-4 space-y-4">
          {[
            ['1. Upload', 'Go to Upload Dataset and drop a CSV, XLSX or XLS file. The parser detects delimiters, headers and column types automatically, then shows row/column counts and a data preview.'],
            ['2. Understand', 'The Data Analyzer profiles every cell and computes a 0-100 quality score across Completeness, Validity, Uniqueness and Consistency — each explained with the exact math used. The Issue Explorer lets you filter and search every finding.'],
            ['3. Fix', 'In the Cleaning Studio, every correction shows the original value, the suggested value, the reason and a confidence level. Bulk-apply safe fixes, approve sensitive ones individually, and use Undo / Redo / Reset to original at any time.'],
            ['4. Trust', 'Download the cleaned CSV, a JSON quality report or an Excel report from the Reports page, or print a shareable summary. Your analysis history is kept locally in your browser.'],
          ].map(([t, b]) => (
            <div key={t} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="text-sm font-semibold text-sky-300">{t}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{b}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-display text-base font-semibold text-slate-100">Frequently asked</h3>
        <div className="mt-3 space-y-3">
          {[
            ['What does the quality score mean?', 'It is a weighted blend: Completeness 25% (non-blank cells), Validity 30% (cells without critical errors), Uniqueness 25% (duplicate rows/IDs penalized), Consistency 20% (formatting drift penalized). The Analyzer page shows the exact computation for your dataset.'],
            ['Are AI answers always right?', 'No. Detected facts come from a deterministic rules engine; AI suggestions are clearly labeled and any AI-proposed correction is validated by the repair engine and requires your approval before it touches data.'],
            ['Where is my data stored?', 'Dataset contents stay in your browser tab (and history metadata in localStorage). Nothing is uploaded to a server except compact statistical context when you use AI chat.'],
            ['Why does the assistant say "rule-based"?', 'The Gemini key is not configured yet. The assistants fall back to a transparent rule engine so the product remains fully usable. See Settings for setup steps.'],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-200 transition group-open:text-sky-300">
                {q}
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
