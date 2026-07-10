# Olébot / Scholé Landing Lab

Autonomous landing page evolution for [Scholé AI](https://schole.ai/).

LLM-powered persona agents simulate user behavior on landing page variants. A Thompson-sampling bandit allocates traffic, an evaluator agent scores results, and an optimizer agent breeds improved pages — generation after generation — with evidence-backed changelogs.

**Live repo:** https://github.com/soup2964-spec/OLebot

## Live edits (start here)

Under time pressure, edit **[`src/content/`](src/content/EDIT.md)** first:

| Want to change… | File |
|-----------------|------|
| Variant copy / CTAs | `src/content/variants.ts` → then `npm run prepare:variants` |
| Personas / objections | `src/content/personas.ts` |
| Promote / kill thresholds | `src/content/thresholds.ts` |
| Workbench section labels | `src/content/criteria.ts` |

Full cheat sheet: [`src/content/EDIT.md`](src/content/EDIT.md). **Do not** hand-edit `public/baseline/variants/*.html`.

## Codebase map

```
src/
  content/      # EDIT HERE — copy, personas, criteria, thresholds
  features/     # UI by surface
    workbench/  # Simulation dashboard (/)
    live/       # Live analytics (/live)
    landing/    # Variant pages (/v/[id])
    shell/      # Header / chrome
  domains/      # Business logic (evolve, sim, replica, loop, …)
  platform/     # Schema, supabase, registry, LLM, FS helpers
  app/          # Thin Next.js routes + API
  styles/       # globals.css
```

`public/`, `data/`, `scripts/`, and `supabase/` stay at the repo root (deploy / FS contracts).

## What you'll see

| Surface | What it covers |
|---------|----------------|
| **Control** (`/`) | Run experiments, autonomous / LLM toggles |
| **Versions** | Gen-0 + bred page comparison |
| **Method / Personas / Behavior / Winners** | Side-menu detail panels on `/` |
| **Live** (`/live`) | Live loop + calibration |
| **Variants** (`/v/[id]`) | Live landing replicas |

Legacy paths (`/variants`, `/experiment`, `/personas`, `/behavior`, `/results`, `/evolution`) redirect to `/`.

## Quick start

```bash
npm install
cp .env.example .env.local   # set KIE_API_KEY or OPENAI_API_KEY for experiments
npm run dev                  # open http://localhost:3000
```

Run an experiment from the **Control** tab (hybrid ~2–5 min, full LLM ~20 min).

### Full LLM experiment (optional)

```bash
npm run experiment  # ~30-60 min, writes data/run.json with LLM readings
```

## Architecture

```
Generation 0 variants (JSON in src/content/variants.ts)
        ↓
Persona agents (objection-gated conversion)
        ↓
Monte Carlo visits + Thompson bandit
        ↓
Evaluator agent (rubric scorecards)
        ↓
Optimizer agent (mutation + crossover + changelog)
        ↓
Generation N+1 … → HTML replicas under public/baseline/
```

- **Pages are structured JSON**, rendered via the replica HTML pipeline and React fallbacks.
- **Personas carry objection ledgers** grounded in published buyer research.
- **PostHog + GTM + Clarity** tag every variant page for sim-to-real calibration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js (runs `prepare:pages` first) |
| `npm run experiment` | Full LLM multi-generation run (CLI) |
| `npm run reset:lab` | Wipe experiment history and bred pages |
| `npm run prepare:variants` | Rebuild Gen-0 HTML after copy edits |
| `npm run build` | Production build |

## Deploy

Deploy to Vercel. Set `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_GTM_ID`, and server-side `POSTHOG_API_KEY` + `POSTHOG_PROJECT_ID` to instrument live traffic and calibrate simulations.

### Live learning loop

Every variant page sends a session heartbeat + PostHog/GTM events. When **5+ new visitors** arrive (configurable via `LOOP_MIN_NEW_VISITORS`):

1. Pull live metrics from PostHog
2. Recalibrate persona parameters
3. Re-run the simulation
4. Dashboard auto-refreshes

Vercel Cron hits `/api/cron/sync-loop` daily (`0 12 * * *` in `vercel.json`) as a backup trigger. Set `CRON_SECRET` in Vercel env vars.

Built for the Scholé AI GTM challenge.
