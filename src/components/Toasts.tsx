import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { cn } from '@/lib/cn';

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-sm shadow-2xl backdrop-blur-xl animate-fade-up',
            t.kind === 'success' && 'border-emerald-400/25 bg-emerald-950/80 text-emerald-100',
            t.kind === 'error' && 'border-rose-400/25 bg-rose-950/80 text-rose-100',
            t.kind === 'info' && 'border-sky-400/25 bg-slate-900/90 text-slate-100',
          )}
        >
          <span className="mt-0.5 shrink-0">
            {t.kind === 'success' ? <CheckCircle2 size={16} /> : t.kind === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
          </span>
          <span className="leading-relaxed">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="ml-auto shrink-0 opacity-50 transition hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
