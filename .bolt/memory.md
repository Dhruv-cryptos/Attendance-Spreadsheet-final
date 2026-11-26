# Project memory

## Product intent & audience

- Enterprise-grade SaaS for universal dataset upload, deterministic data quality analysis, automated repair, and Gemini-powered data intelligence.
- Audience: data analysts, data engineers, and data quality teams in enterprises who need auditable, transparent cleanup rather than black-box tooling.
- Core promise: every number shown is computed from the actual uploaded data — no fake logins, no fabricated statistics.

## Brand personality & voice

- Professional, enterprise, transparent, trustworthy.
- Emphasizes determinism + AI separation: detected facts vs. AI suggestions are clearly distinguished.
- Honest about fallbacks: rule-based fallback disclosed when Gemini is unavailable.

## Visual design & UX direction

- Stack: Vite + React + JSX, Tailwind CSS, Lucide React icons, `@/` path alias to `src/`.
- Aesthetic: production-worthy, non-cookie-cutter enterprise UI; animated charts driven by real analysis data.
- Key UX patterns:
  - Drag-and-drop upload (CSV/XLSX/XLS) with auto delimiter, header, and column-type detection.
  - Filterable Issue Explorer (severity, type, column, free-text), grouped by row with original vs. suggested values.
  - Cleaning Studio: per-fix previews, "apply all safe fixes", individual approval, undo/redo/reset, activity log, cleaned CSV download; original upload never mutated.
  - Data AI Assistant: chat grounded in real analysis; facts vs. suggestions separated.
  - Customer Support AI: dedicated page + floating chat button on every screen, page-aware context.
  - Reports: printable report + CSV/JSON/Excel exports.
  - Dashboard, local session History (with delete), and Settings (Gemini status check, privacy details).

## Decisions, constraints & rationale

- Deterministic analysis engine detects 13 issue types (missing, duplicates, bad emails/dates/numbers, outliers, inconsistent categories/formatting, etc.), each with reason + confidence.
- Quality score 0–100 composed of completeness, validity, uniqueness, consistency; exact math surfaced on screen for auditability.
- Gemini integration via deployed Supabase edge function with API key configured as secret; rule-based fallback when key unavailable.
- Original upload is immutable; repairs produce a derived cleaned dataset.
- Demo employee dataset ships with realistic data problems for instant evaluation.
- Build/typecheck must pass; production deploy is a goal.
- Do not install extra UI/icon/theme packages beyond Tailwind + Lucide unless necessary.

## Open questions & assumptions

- Supabase assumed as edge-function + secrets host (inferred from deploy flow); persistence/backend scope otherwise not yet specified.
- Session history appears local-only; long-term persistence strategy unconfirmed.
- Multi-user/auth intentionally absent ("no fake logins"); real auth intent unknown.
- Excel report export implementation detail (library choice) not yet pinned down.