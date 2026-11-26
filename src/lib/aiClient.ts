import type { AnalysisResult, Dataset } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export interface AiReply {
  text: string;
  usedGemini: boolean;
  error?: string;
}

/** Compact, privacy-safe dataset context sent to the model. */
export function buildDatasetContext(ds: Dataset | null, analysis: AnalysisResult | null): string {
  if (!ds) return 'No dataset is currently loaded.';
  let ctx = `Dataset: ${ds.filename}\nRows: ${ds.rows.length}\nColumns (${ds.columns.length}): ${ds.columns.map((c) => `${c} (${ds.columnTypes[c] ?? 'unknown'})`).join(', ')}`;
  if (analysis) {
    ctx += `\nQuality score: ${analysis.score.overall}/100 (completeness ${analysis.score.completeness}, validity ${analysis.score.validity}, uniqueness ${analysis.score.uniqueness}, consistency ${analysis.score.consistency})`;
    ctx += `\nSeverity counts: critical=${analysis.severityCounts.critical}, warning=${analysis.severityCounts.warning}, info=${analysis.severityCounts.info}`;
    const top = Object.entries(analysis.typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    ctx += `\nIssue types: ${top.map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`;
    const sample = analysis.issues.slice(0, 25).map((i) => `- [${i.severity}] row ${i.rowIndex + 1} col "${i.column}": ${i.type} original="${i.originalValue ?? ''}" suggested="${i.suggestedValue ?? ''}"`);
    ctx += `\nSample issues:\n${sample.join('\n')}`;
  }
  const preview = ds.rows.slice(0, 10).map((r, i) => `row ${i + 1}: ${JSON.stringify(r)}`).join('\n');
  ctx += `\nFirst rows sample:\n${preview}`;
  return ctx;
}

export async function askGemini(userMessage: string, datasetContext: string, supportMode: boolean): Promise<AiReply> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { text: '', usedGemini: false, error: 'Supabase environment is not configured.' };
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/gemini-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ message: userMessage, context: datasetContext, mode: supportMode ? 'support' : 'data' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { text: '', usedGemini: false, error: `Assistant request failed (${res.status}). ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    if (!data || typeof data.reply !== 'string') {
      return { text: '', usedGemini: false, error: 'Assistant returned an unexpected response.' };
    }
    return { text: data.reply, usedGemini: data.usedGemini !== false };
  } catch (err) {
    return { text: '', usedGemini: false, error: (err as Error).message };
  }
}
