import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={cn('glass rounded-2xl', glow && 'glow-border', className)}>
      {children}
    </div>
  );
}

export function ScoreRing({ score, size = 140, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#34d399' : score >= 60 ? '#38bdf8' : score >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="9" fill="none"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, Math.max(0, score))) / 100}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-slate-100">{Math.round(score)}</span>
        {label && <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>}
      </div>
    </div>
  );
}

export function Bar({ value, color = '#38bdf8' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
      />
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'red' | 'amber' | 'sky' | 'green' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-500/15 text-slate-300 border-slate-400/20',
    red: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  );
}

export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:brightness-110 shadow-lg shadow-sky-500/20',
    ghost: 'border border-white/10 text-slate-300 hover:bg-white/[0.06] hover:text-white',
    subtle: 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-400/30 hover:bg-rose-500/25',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 text-sky-300">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4 animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const map = {
    critical: { tone: 'red' as const, label: 'Critical' },
    warning: { tone: 'amber' as const, label: 'Warning' },
    info: { tone: 'sky' as const, label: 'Info' },
  };
  return <Badge tone={map[severity].tone}>{map[severity].label}</Badge>;
}

export function SectionTitle({ icon, title, subtitle, right }: { icon?: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-sky-300">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
