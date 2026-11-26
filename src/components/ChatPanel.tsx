import { useEffect, useRef, useState } from 'react';
import { Send, Bot, Sparkles, Wand2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { askGemini, buildDatasetContext } from '@/lib/aiClient';
import { fallbackDataAnswer } from '@/lib/fallbacks';
import { getChat, saveChat } from '@/lib/storage';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/cn';
import { Button, Spinner } from '@/components/ui';

const SUGGESTIONS = [
  'Why is my dataset quality score low?',
  'Explain all detected issues.',
  'Which column contains the most errors?',
  'Summarize this dataset.',
  'Suggest ways to improve data quality.',
  'Explain suspicious values.',
];

/** Ultra-light markdown renderer: bold, bullet lists, line breaks. No HTML injection. */
export function Markdownish({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="md-body">
      {lines.map((line, i) => {
        const bolded = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
        );
        if (/^\s*[-•]\s+/.test(line)) {
          return <div key={i} className="flex gap-2 pl-1"><span className="text-sky-400">•</span><span>{bolded}</span></div>;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
          return <div key={i} className="flex gap-2 pl-1"><span className="text-sky-400">{line.match(/^\s*(\d+)\./)?.[1]}.</span><span>{line.replace(/^\s*\d+\.\s+/, '')}</span></div>;
        }
        return <p key={i}>{bolded}</p>;
      })}
    </div>
  );
}

export default function ChatPanel({ mode }: { mode: 'data' | 'support-page' }) {
  const { dataset, analysis, toast } = useApp();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChat('data'));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const persist = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    saveChat('data', msgs);
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    persist(next);
    setInput('');
    setBusy(true);
    const ctx = buildDatasetContext(dataset, analysis);
    const reply = await askGemini(trimmed, ctx, mode === 'support-page');
    let content: string;
    let fallback = false;
    if (reply.usedGemini && reply.text) {
      content = reply.text;
    } else {
      content = fallbackDataAnswer(trimmed, dataset, analysis);
      fallback = true;
      if (reply.error) toast('info', 'Gemini not available — answered with the built-in rule engine.');
    }
    persist([...next, { id: crypto.randomUUID(), role: 'assistant', content, timestamp: new Date().toISOString(), fallback }]);
    setBusy(false);
  }

  const hasDataset = dataset && analysis;

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
        {messages.length === 0 && (
          <div className="animate-fade-up">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-lg shadow-sky-500/25">
                  <Bot size={19} />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.05] p-4 text-sm leading-relaxed text-slate-300">
                  {hasDataset ? (
                    <>I'm analyzing <span className="font-semibold text-sky-300">{dataset.filename}</span> — quality score <span className="font-semibold text-slate-100">{analysis.score.overall}/100</span>, {analysis.issues.length} issues detected. Ask me anything about this dataset. Facts come from the deterministic engine; advice is clearly labeled as AI suggestions.</>
                  ) : (
                    <>Upload a dataset first and I'll help you understand its quality profile, explain every detected issue and suggest cleaning strategies. I read the deterministic analysis of whatever dataset is loaded — no guesswork.</>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-sky-400/40 hover:bg-sky-500/[0.1] hover:text-sky-200"
                  >
                    <Sparkles size={12} className="text-sky-400" /> {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex animate-fade-up gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400/80 to-violet-500/80 text-white">
                {m.fallback ? <Wand2 size={14} /> : <Bot size={14} />}
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl p-3.5 text-[13px] leading-relaxed lg:max-w-[75%]',
              m.role === 'user'
                ? 'rounded-br-sm bg-gradient-to-r from-sky-500 to-violet-500 text-white'
                : 'rounded-bl-sm border border-white/[0.08] bg-white/[0.05] text-slate-200',
            )}>
              {m.role === 'assistant' ? <Markdownish text={m.content} /> : m.content}
              {m.fallback && (
                <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-1.5 text-[10px] text-slate-400">
                  <AlertTriangle size={10} /> Rule-based answer (Gemini not configured).
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400/80 to-violet-500/80 text-white">
              <Bot size={14} />
            </div>
            <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-white/[0.08] bg-white/[0.05] px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.02] p-3 lg:p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasDataset ? 'Ask about your dataset...' : 'Upload a dataset first, or ask about the platform...'}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        />
        <Button type="submit" disabled={busy || !input.trim()} className="px-4">
          {busy ? <Spinner /> : <Send size={15} />}
        </Button>
      </form>
    </div>
  );
}
