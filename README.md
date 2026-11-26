# DataGuard AI

**Upload. Understand. Fix. Trust Your Data.**
*Your Data. Our Intelligence. Zero Guesswork.*

DataGuard AI is a universal, AI-powered data quality intelligence platform. Upload any CSV or Excel dataset — attendance, sales, employees, students, inventory, finance, customers or custom — and get deterministic quality scoring, an issue explorer, an approval-based cleaning studio, AI explanations via Google Gemini, professional reports and a full analysis history.

## Features

- **Universal upload** — CSV (comma, semicolon, tab and pipe delimiters, UTF-8 / UTF-8 BOM, quoted values), XLSX and XLS (first sheet). Headers and column types auto-detected. Demo dataset with 30+ intentional quality problems included.
- **Deterministic analysis engine** — missing values, duplicate rows, duplicate identifiers, invalid emails/dates/numbers, inconsistent date formats, ALL-CAPS text drift, IQR-based outliers, fuzzy categorical inconsistencies, empty columns, whitespace issues, and status-standardization rules — all schema-independent, with reasons and confidence levels.
- **Transparent quality score (0-100)** — Completeness 25% + Validity 30% + Uniqueness 25% + Consistency 20%, computed from actual cells, with the exact math shown in the app.
- **Repair engine** — per-fix preview (row, column, original, suggestion, reason, confidence), bulk-apply safe fixes, individual approval for business-impacting changes, undo / redo / reset-to-original, activity log, cleaned CSV download. The original upload is never modified.
- **Data AI Assistant** — Gemini-powered chat grounded in the deterministic analysis of the loaded dataset. Facts and AI suggestions are clearly separated.
- **Customer Support AI** — a second assistant that helps users operate the platform, available as a page and a floating chat on every screen.
- **Reports** — printable quality report plus cleaned-CSV, JSON and Excel exports.
- **Dashboard & History** — animated charts (score trend, severity distribution, top issue types) derived only from real analysis data; history stored locally in the browser.

## Tech stack

React 18 · Vite · TypeScript · Tailwind CSS · Recharts · PapaParse · SheetJS (xlsx) · Lucide icons · Supabase Edge Function (secure Gemini proxy) · localStorage for history/preferences.

## Security: Gemini key handling

The Gemini API key is **never** placed in frontend code. The browser calls the `gemini-chat` Supabase Edge Function, which reads `GEMINI_API_KEY` from server-side environment secrets and forwards requests to Google's API. Without the key, both assistants fall back to a transparent rule-based engine and label every reply accordingly — no fake AI responses.

### Configure GEMINI_API_KEY

1. Get an API key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Add it as an Edge Function secret named `GEMINI_API_KEY` in your Supabase project (Project Settings → Edge Functions → Secrets, or `supabase secrets set GEMINI_API_KEY=...` if using the CLI elsewhere).
3. Redeploy the `gemini-chat` function so it picks up the secret.
4. Verify in the app: Settings → "Check Gemini status".

## Run locally

```bash
npm install
npm run dev        # start the dev server
npm run typecheck  # type safety check
npm run build      # production build
```

Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are pre-populated in `.env`. See `.env.example` for the full list — it contains no real credentials.

## Deploy

1. Build the frontend (`npm run build`) and host the `dist/` folder on any static hosting (Netlify, Vercel, Cloudflare Pages, Supabase Hosting).
2. Deploy the `supabase/functions/gemini-chat` edge function to Supabase and set the `GEMINI_API_KEY` secret.
3. Point `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at your project.

## Privacy

All parsing, profiling, scoring and cleaning runs entirely in your browser. Only compact statistical summaries (scores, issue counts, a few sample rows) are sent to the AI assistant. History and chat stay in localStorage.
