# Supabase setup (shared GTM backend)

All Landing Lab state persists in Supabase when configured — experiments, progress, loop state, deploy state, calibration, and live analytics. Uses the `lab_` table prefix so it can share a project with your outbound GTM tool.

## 1. Run migrations

In [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard), run both files in order:

1. `supabase/migrations/20260702120000_landing_lab_analytics.sql` — live sessions/events
2. `supabase/migrations/20260702140000_lab_documents.sql` — experiment + app state

## 2. Env vars

Add to `.env.local` (and Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project Settings → API → service_role (secret)
```

## 3. Backfill existing local data (optional)

If you already have `data/*.json` from local runs:

```bash
npm run migrate:supabase
```

## 4. Verify

```bash
npm run dev
```

Visit a variant page (`/v/v1-roi`), scroll, click a CTA. Check **User behavior** for live Supabase data.

Run an experiment from Control center — progress and results persist across redeploys.

## Tables

| Table | Purpose |
|-------|---------|
| `lab_sessions` | Live browser sessions (variant, conversion, scroll, dwell) |
| `lab_events` | Granular live events (section_view, cta_click, scroll_depth, …) |
| `lab_documents` | All app state as JSON documents (see keys below) |

### `lab_documents` keys

| Key | Was (local) | Contents |
|-----|-------------|----------|
| `active_run` | `data/run.json` | Current simulation run |
| `loop_state` | `data/loop-state.json` | Autonomous mode, experiment history, sync |
| `deploy_state` | `data/deploy-state.json` | Production deploy snapshots |
| `calibration` | `data/calibration.json` | Persona calibration from live traffic |
| `experiment_progress` | `data/experiment-progress.json` | In-flight experiment progress bar |
| `experiment:1`, `experiment:2`, … | `data/experiments/` | Saved per-experiment run snapshots |

All writes go through Next.js API routes using the service role key (never exposed to the browser).

When Supabase is not configured, the app falls back to local `data/*.json` files for development.
