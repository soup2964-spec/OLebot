# Scholé Landing Lab

Autonomous landing page evolution for [Scholé AI](https://schole.ai/).

LLM-powered persona agents simulate user behavior on landing page variants. A Thompson-sampling bandit allocates traffic, an evaluator agent scores results, and an optimizer agent breeds improved pages — generation after generation — with evidence-backed changelogs.

**Live repo:** https://github.com/soup2964-spec/schole-landing-lab

## What you'll see

| Tab | Requirement covered |
|-----|---------------------|
| **Variants** | The initial landing page versions (6 Generation-0 strategic bets + bred offspring) |
| **Method** | How the pages are compared (personas, objection ledger, bandit, rubric) |
| **Behavior** | Simulated user behavior (heatmaps + replay theater) |
| **Results** | Which versions performed better (leaderboard, allocation, scorecards) |
| **Evolution** | New generated variations + what changed and why (changelogs) |

## Quick start

```bash
npm install
npm run demo        # generate deterministic demo data (no API key)
npm run dev         # open http://localhost:3000
```

### Full LLM experiment (optional)

```bash
cp .env.example .env.local
# set OPENAI_API_KEY and optionally NEXT_PUBLIC_CLARITY_ID
npm run experiment  # ~30-60 min, writes data/run.json with LLM readings
```

## Architecture

```
Generation 0 variants (JSON schema)
        ↓
Persona agents (objection-gated conversion)
        ↓
Monte Carlo visits + Thompson bandit
        ↓
Evaluator agent (rubric scorecards)
        ↓
Optimizer agent (mutation + crossover + changelog)
        ↓
Generation N+1 …
```

- **Pages are structured JSON**, rendered by a fixed component library — agents read them cheaply, the optimizer can only emit valid pages, and diffs are precise.
- **Personas carry objection ledgers** grounded in published 2025–26 buyer research (TalentLMS, G2, Rise Up, eLearning Industry, Docebo).
- **Microsoft Clarity** tags every variant page (`variant_id`, `generation`, `cta_click`) for sim-to-real calibration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run demo` | Generate offline demo run → `data/run.json` |
| `npm run experiment` | Full LLM-powered 3-generation run |
| `npm run build` | Production build |

## Deploy

Deploy to Vercel. Set `NEXT_PUBLIC_CLARITY_ID` to instrument real reviewer traffic against simulated predictions.

Built for the Scholé AI GTM challenge.
