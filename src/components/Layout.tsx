import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, CircleHelp, FileBarChart, Headset, History as HistoryIcon, LayoutDashboard, ScanSearch, Settings as SettingsIcon, ShieldCheck, Upload, AlertTriangle, Wand2, Menu, X, PanelLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/appStore';
import SupportChat from '@/components/SupportChat';
import Toasts from '@/components/Toasts';

const NAV: { group: string; items: { path: string; label: string; icon: React.ReactNode }[] }[] = [
  {
    group: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
      { path: '/upload', label: 'Upload Dataset', icon: <Upload size={17} /> },
    ],
  },
  {
    group: 'Data Intelligence',
    items: [
      { path: '/analyzer', label: 'Data Analyzer', icon: <ScanSearch size={17} /> },
      { path: '/issues', label: 'Issue Explorer', icon: <AlertTriangle size={17} /> },
      { path: '/cleaning', label: 'Cleaning Studio', icon: <Wand2 size={17} /> },
      { path: '/assistant', label: 'Data AI Assistant', icon: <Bot size={17} /> },
    ],
  },
  {
    group: 'Customer Experience',
    items: [
      { path: '/support', label: 'Customer Support', icon: <Headset size={17} /> },
      { path: '/help', label: 'Help Center', icon: <CircleHelp size={17} /> },
    ],
  },
  {
    group: 'Management',
    items: [
      { path: '/reports', label: 'Reports', icon: <FileBarChart size={17} /> },
      { path: '/history', label: 'History', icon: <HistoryIcon size={17} /> },
      { path: '/settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { dataset, analysis, loading, isDemo } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const active = location.pathname;

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 no-scrollbar">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className={cn('px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500', collapsed && 'text-center')}>{collapsed ? '•••' : g.group}</div>
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const isActive = active === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/15 to-violet-500/10 text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                    collapsed && 'justify-center px-2',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn('transition-colors', isActive ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-300')}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.path === '/issues' && analysis && analysis.issues.length > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      {analysis.issues.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link to="/" className="flex items-center gap-3 px-5 py-5" onClick={() => setMobileOpen(false)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/30">
        <ShieldCheck size={19} className="text-white" />
      </div>
      {!collapsed && (
        <div>
          <div className="font-display text-[15px] font-bold leading-tight text-slate-100">DataGuard AI</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Zero Guesswork</div>
        </div>
      )}
    </Link>
  );

  const currentLabel = NAV.flatMap((g) => g.items).find((i) => i.path === active)?.label ?? 'DataGuard AI';

  return (
    <div className="flex min-h-screen bg-[#060b18]">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/[0.06] blur-[120px]" />
        <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      <aside className={cn('no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/[0.06] bg-[#080e1f]/80 backdrop-blur-xl transition-all duration-300 lg:flex', collapsed ? 'w-[72px]' : 'w-64')}>
        {brand}
        {nav}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
          >
            <PanelLeft size={17} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/[0.08] bg-[#0a1226]">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className={cn('relative flex min-h-screen flex-1 flex-col transition-all duration-300', collapsed ? 'lg:ml-[72px]' : 'lg:ml-64')}>
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#060b18]/80 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold text-slate-100">{currentLabel}</h1>
          </div>
          {dataset && (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 sm:flex">
              <span className="max-w-[180px] truncate font-medium text-slate-200">{dataset.filename}</span>
              {isDemo && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">DEMO</span>}
              {analysis && <span className={cn('font-semibold', analysis.score.overall >= 80 ? 'text-emerald-300' : analysis.score.overall >= 50 ? 'text-amber-300' : 'text-rose-300')}>{analysis.score.overall}</span>}
            </div>
          )}
          {loading && <Loader2 size={16} className="animate-spin text-sky-400" />}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="no-print border-t border-white/[0.05] px-4 py-4 text-center text-xs text-slate-600 lg:px-8">
          DataGuard AI — Your Data. Our Intelligence. Zero Guesswork.
        </footer>
      </div>

      <SupportChat />
      <Toasts />
    </div>
  );
}

