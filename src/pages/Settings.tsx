import { useState } from 'react';
import { Settings as SettingsIcon, KeyRound, Palette, FileSpreadsheet, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { Card, SectionTitle, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getChat } from '@/lib/storage';

function GeminiStatus() {
  // Probe the edge function with a tiny request; it reports whether the key exists.
  const [state, setState] = useState<'unknown' | 'ok' | 'missing'>('unknown');
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ message: 'ping', context: '', mode: 'support' }),
      });
      const data = await res.json().catch(() => ({}));
      setState(data?.error?.includes('GEMINI_API_KEY') ? 'missing' : 'ok');
    } catch {
      setState('missing');
    }
    setChecking(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="ghost" onClick={check} disabled={checking}>
        {checking ? 'Checking…' : 'Check Gemini status'}
      </Button>
      {state === 'ok' && <Badge tone="green"><CheckCircle2 size={11} /> Gemini configured</Badge>}
      {state === 'missing' && <Badge tone="amber">Key not set — rule-based mode active</Badge>}
    </div>
  );
}

export default function Settings() {
  const { dataset, toast } = useApp();
  const [analyticsPreview, setAnalyticsPreview] = useState(true);
  const [chatHist, setChatHist] = useState(() => getChat('data').length + getChat('support').length);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <SectionTitle icon={<SettingsIcon size={18} />} title="Settings" subtitle="Configuration, preferences and privacy information." />

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-sky-400" />
          <h3 className="font-display text-sm font-semibold text-slate-100">Gemini API Configuration</h3>
          <GeminiStatus />
        </div>
        <ol className="list-inside list-decimal space-y-2 text-[13px] leading-relaxed text-slate-300">
          <li>Create an API key at <span className="text-sky-300">Google AI Studio (aistudio.google.com/apikey)</span>.</li>
          <li>Add it as a secret named <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-xs text-sky-300">GEMINI_API_KEY</code> on the Supabase Edge Functions secrets for this project.</li>
          <li>Redeploy the <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-xs text-sky-300">gemini-chat</code> function so it picks up the secret.</li>
          <li>Return here and press “Check Gemini status” — the Data AI Assistant and Support chat switch from the rule-based engine to the real model automatically.</li>
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          The key lives only on the server. The browser never sees it — requests go through the <code className="rounded bg-white/[0.08] px-1 py-0.5 text-[10px]">gemini-chat</code> edge function, which injects the secret server-side. Until configured, both assistants run a transparent rule-based fallback and label every reply accordingly.
        </p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:text-sky-200"
        >
          Open Google AI Studio <ExternalLink size={12} />
        </a>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette size={16} className="text-violet-400" />
          <h3 className="font-display text-sm font-semibold text-slate-100">Appearance & Processing Preferences</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Dark navy theme"
            desc="DataGuard AI uses a premium dark interface optimized for long data sessions. Light mode is on the roadmap."
            enabled
            readOnly
          />
          <ToggleRow
            label="Include data preview in AI context"
            desc="Send a small sample of first rows with AI chat requests for sharper answers. Turn off for fully sensitive datasets."
            enabled={analyticsPreview}
            onToggle={() => setAnalyticsPreview((v) => !v)}
          />
          <ToggleRow
            label="Analyze first 5,000 rows only"
            desc="Keeps processing fast in the browser for large files. Raise the cap for bigger datasets if needed."
            enabled
            readOnly
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          <h3 className="font-display text-sm font-semibold text-slate-100">Data Privacy</h3>
        </div>
        <ul className="list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-slate-400">
          <li>File parsing, analysis, scoring and cleaning run entirely in your browser.</li>
          <li>Only compact statistics (scores, issue counts, a few sample rows) are sent to the AI assistant — never your full dataset, unless preview sharing is enabled above.</li>
          <li>Analysis history and chat history are stored locally and never leave your device.</li>
          <li>The Gemini API key is stored server-side as an edge-function secret, never in frontend code.</li>
          <li>Current dataset in memory: {dataset ? `${dataset.filename} (${dataset.rows.length} rows, local only)` : 'none'}.</li>
        </ul>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-sm font-semibold text-slate-100">Local data</div>
          <div className="text-xs text-slate-500">{chatHist} stored chat message{chatHist === 1 ? '' : 's'} across both assistants.</div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            localStorage.removeItem('dataguard_chat_v1');
            localStorage.removeItem('dataguard_support_chat_v1');
            setChatHist(0);
            toast('info', 'Chat history cleared.');
          }}
        >
          Clear chat history
        </Button>
      </Card>
    </div>
  );
}

function ToggleRow({ label, desc, enabled, onToggle, readOnly }: { label: string; desc: string; enabled: boolean; onToggle?: () => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={readOnly}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          enabled ? 'bg-gradient-to-r from-sky-500 to-violet-500' : 'bg-white/10',
          readOnly && 'cursor-default opacity-70',
        )}
        aria-label={label}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200', enabled ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}
