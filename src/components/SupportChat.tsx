import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Headset, X, Send } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { askGemini } from '@/lib/aiClient';
import { fallbackSupportAnswer } from '@/lib/fallbacks';
import { getChat, saveChat } from '@/lib/storage';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui';

const SUGGESTIONS = [
  'What file formats can I upload?',
  'How is the quality score calculated?',
  'How do I apply and undo fixes?',
  'How do I export a report?',
];

function pageHint(pathname: string): string {
  switch (pathname) {
    case '/': return 'the Dashboard';
    case '/upload': return 'the Upload page';
    case '/analyzer': return 'the Data Analyzer';
    case '/issues': return 'the Issue Explorer';
    case '/cleaning': return 'the Cleaning Studio';
    case '/assistant': return 'the Data AI Assistant';
    case '/support': return 'Customer Support';
    case '/help': return 'the Help Center';
    case '/reports': return 'the Reports page';
    case '/history': return 'the History page';
    case '/settings': return 'Settings';
    default: return 'the app';
  }
}

export default function SupportChat() {
  const location = useLocation();
  const page = location.pathname;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChat('support'));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  const persist = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    saveChat('support', msgs);
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    persist(next);
    setInput('');
    setBusy(true);
    const reply = await askGemini(trimmed, `User is currently on: ${pageHint(page)}`, true);
    let content: string;
    let fallback = false;
    if (reply.usedGemini && reply.text) {
      content = reply.text;
    } else {
      content = fallbackSupportAnswer(trimmed, pageHint(page));
      fallback = true;
      if (reply.error && !reply.error.includes('not configured')) {
        toast('error', `Assistant connection issue: ${reply.error}`);
      }
    }
    persist([...next, { id: crypto.randomUUID(), role: 'assistant', content, timestamp: new Date().toISOString(), fallback }]);
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="no-print fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-2xl shadow-sky-500/30 transition-all duration-300 hover:scale-105 hover:shadow-sky-400/40 active:scale-95"
        aria-label="Open support chat"
      >
        {open ? <X size={22} /> : <Headset size={22} />}
        {!open && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#060b18] bg-emerald-400" />}
      </button>

      {open && (
        <div className="no-print fixed bottom-24 right-4 z-[60] flex h-[540px] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a1226]/95 shadow-2xl backdrop-blur-2xl animate-fade-up sm:right-6">
          <div className="flex items-center gap-3 border-b border-white/[0.08] bg-gradient-to-r from-sky-500/10 to-violet-500/10 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white">
              <Headset size={17} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-100">Support Assistant</div>
              <div className="text-[11px] text-slate-400">How can we help you today?</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"><X size={16} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.05] p-3 text-sm leading-relaxed text-slate-300">
                  Hi! I'm the DataGuard AI support assistant. Ask me how to upload files, apply fixes, export reports or configure Gemini.
                </div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border border-sky-400/20 bg-sky-500/[0.08] px-3 py-2 text-left text-xs text-sky-200 transition hover:bg-sky-500/[0.15]">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 text-[13px] leading-relaxed',
                  m.role === 'user' ? 'rounded-br-sm bg-gradient-to-r from-sky-500 to-violet-500 text-white' : 'rounded-bl-sm border border-white/[0.08] bg-white/[0.05] text-slate-200',
                )}>
                  {m.content}
                  {m.fallback && <div className="mt-2 border-t border-white/10 pt-1.5 text-[10px] text-slate-400">Rule-based answer — configure GEMINI_API_KEY for full AI (see Settings).</div>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-400" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-white/[0.08] p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {busy ? <Spinner /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
