import type { AnalysisResult, ActivityEvent, ChatMessage, HistoryEntry } from './types';

const HISTORY_KEY = 'dataguard_history_v1';
const ACTIVITY_KEY = 'dataguard_activity_v1';
const CHAT_KEY = 'dataguard_chat_v1';
const SUPPORT_KEY = 'dataguard_support_chat_v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_KEY, []);
}

export function saveHistoryEntry(entry: HistoryEntry) {
  const all = getHistory().filter((h) => h.id !== entry.id);
  all.unshift(entry);
  write(HISTORY_KEY, all.slice(0, 50));
}

export function deleteHistoryEntry(id: string) {
  write(HISTORY_KEY, getHistory().filter((h) => h.id !== id));
}

export function getActivity(): ActivityEvent[] {
  return read<ActivityEvent[]>(ACTIVITY_KEY, []);
}

export function pushActivity(label: string, detail: string) {
  const all = getActivity();
  all.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), label, detail });
  write(ACTIVITY_KEY, all.slice(0, 100));
}

export function getChat(key: 'data' | 'support' = 'data'): ChatMessage[] {
  return read<ChatMessage[]>(key === 'support' ? SUPPORT_KEY : CHAT_KEY, []);
}

export function saveChat(key: 'data' | 'support', msgs: ChatMessage[]) {
  write(key === 'support' ? SUPPORT_KEY : CHAT_KEY, msgs.slice(-100));
}
