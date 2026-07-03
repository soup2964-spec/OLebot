# OLebot / Scholé Landing Lab — Gemini upload guide

## Download zips (on your machine)

| File | What's inside | Use for Gemini |
|------|----------------|----------------|
| `C:\Users\tinsl\Downloads\OLebot-full-export.zip` | **Full project** incl. uncommitted changes, no `node_modules` | Best single upload — complete current state |
| `C:\Users\tinsl\Downloads\OLebot-gemini-code.zip` | `src/`, `scripts/`, `data/`, `supabase/`, configs — no static HTML bulk | Smaller upload — app + sim engine only |
| `C:\Users\tinsl\Downloads\OLebot-git-main.zip` | Last **git commit** only (may miss local work) | GitHub parity |

## Plug into Gemini

1. Open [Google AI Studio](https://aistudio.google.com/) or Gemini chat with file upload.
2. Upload **`OLebot-full-export.zip`** (or the lean code zip).
3. Paste this prompt:

```
This is OLebot (Scholé Landing Lab): an autonomous landing page evolution lab.

Stack: Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, PostHog, Vercel.

Core flow:
- LLM/heuristic persona agents simulate buyer visits on landing page variants
- Thompson sampling bandit allocates sim traffic
- Bayesian analysis (Beta-Binomial) produces promote/kill decisions
- Optimizer breeds new page variants from evidence
- Seed robustness check (12 RNG seeds) on Winners tab

Key dirs:
- src/lib/evolve/ — experiment runner, optimizer, demo
- src/lib/sim/ — visits, bandit, metrics
- src/lib/stats/bayes.ts — Bayesian decisions
- src/components/experiment/ — dashboard UI
- scripts/ — demo, robustness, experiment CLI

Help me with: [your question]
```

## Project folder (local)

`C:\Users\tinsl\schole-landing-lab`

## GitHub (remote, may lag local)

https://github.com/soup2964-spec/OLebot/archive/refs/heads/main.zip

## Do not upload

- `.env.local` (secrets)
- `node_modules/` (reinstall with `npm install`)
