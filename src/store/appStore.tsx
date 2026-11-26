import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnalysisResult, Dataset } from '@/lib/types';
import { analyzeDataset } from '@/lib/analysis';
import { buildDemoDataset } from '@/lib/demoData';
import { getHistory, saveHistoryEntry, pushActivity } from '@/lib/storage';
import type { HistoryEntry } from '@/lib/types';

export interface Toast {
  id: string;
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface AppState {
  dataset: Dataset | null;
  analysis: AnalysisResult | null;
  loading: boolean;
  loadError: string | null;
  history: HistoryEntry[];
  toasts: Toast[];
  isDemo: boolean;
  setDataset: (ds: Dataset | null, isDemo: boolean) => void;
  setAnalysis: (a: AnalysisResult | null) => void;
  updateRows: (rows: Record<string, unknown>[]) => void;
  reanalyze: () => void;
  setLoading: (v: boolean) => void;
  setLoadError: (v: string | null) => void;
  loadDemo: () => void;
  refreshHistory: () => void;
  toast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<Dataset | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const toast = useCallback((kind: Toast['kind'], message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshHistory = useCallback(() => setHistory(getHistory()), []);

  const setDataset = useCallback((ds: Dataset | null, demo: boolean) => {
    setDatasetState(ds);
    setIsDemo(demo);
    setAnalysis(null);
    setLoadError(null);
  }, []);

  const runAnalysis = useCallback((ds: Dataset) => {
    setLoading(true);
    // let the UI paint the loading state first
    setTimeout(() => {
      const result = analyzeDataset(ds);
      setAnalysis(result);
      setLoading(false);
      saveHistoryEntry({
        id: ds.id,
        filename: ds.filename,
        fileSize: ds.fileSize,
        rowCount: ds.rows.length,
        columnCount: ds.columns.length,
        score: result.score.overall,
        issueCount: result.issues.length,
        resolvedCount: 0,
        isDemo: ds.filename.startsWith('demo_'),
        analyzedAt: new Date().toISOString(),
      });
      refreshHistory();
      pushActivity('Analyzed dataset', `${ds.filename} — score ${result.score.overall}, ${result.issues.length} issues`);
    }, 350);
  }, [refreshHistory]);

  const loadDemo = useCallback(() => {
    const ds = buildDemoDataset();
    setDataset(ds, true);
    runAnalysis(ds);
    toast('info', 'Demo dataset loaded with intentional quality problems.');
  }, [runAnalysis, setDataset, toast]);

  const updateRows = useCallback((rows: Record<string, unknown>[]) => {
    setDatasetState((prev) => (prev ? { ...prev, rows: rows as Dataset['rows'] } : prev));
  }, []);

  const reanalyze = useCallback(() => {
    setDatasetState((prev) => {
      if (!prev) return prev;
      const result = analyzeDataset(prev);
      setAnalysis(result);
      saveHistoryEntry({
        id: prev.id,
        filename: prev.filename,
        fileSize: prev.fileSize,
        rowCount: prev.rows.length,
        columnCount: prev.columns.length,
        score: result.score.overall,
        issueCount: result.issues.length,
        resolvedCount: 0,
        isDemo: prev.filename.startsWith('demo_'),
        analyzedAt: new Date().toISOString(),
      });
      refreshHistory();
      return prev;
    });
  }, [refreshHistory]);

  useEffect(() => {
    // warm-up: nothing async needed, keeps hook shape stable
  }, []);

  const value = useMemo<AppState>(
    () => ({
      dataset, analysis, loading, loadError, history, toasts, isDemo,
      setDataset, setAnalysis, updateRows, reanalyze, setLoading, setLoadError,
      loadDemo, refreshHistory, toast, dismissToast,
    }),
    [dataset, analysis, loading, loadError, history, toasts, isDemo, setDataset, updateRows, reanalyze, loadDemo, refreshHistory, toast, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
