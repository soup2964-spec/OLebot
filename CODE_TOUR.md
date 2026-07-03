# GTM Challenge walkthrough — follow this structure

## 0. Framer pages — how they load & display (start here)

| Step | What happens | File |
|------|----------------|------|
| 1 | Raw Framer export of schole.ai | `public/baseline/schole-original.html` |
| 2 | Strip GTM/HubSpot, keep Framer JS; add section markers | `scripts/prepare-baseline-html.ts` → `prepare-lab-html.ts` |
| 3 | Output pristine baseline | `public/baseline/lab-source.html`, `index.html` |
| 4 | Swap variant copy into same Framer shell (gen-0) | `scripts/prepare-variant-html.ts` → `apply-variant.ts` |
| 5 | Static HTML per variant | `public/baseline/variants/*.html` |
| 6 | URL routing | `src/lib/replica/paths.ts` (`staticReplicaPath`) |
| 7 | Live page `/v/[id]` | `src/app/v/[variantId]/page.tsx` → `LandingPage.tsx` |
| 8 | Iframe + analytics | `ScholeBaselineReplica.tsx` |
| 9 | Dashboard thumbnails | `LandingPagePreview.tsx` (scaled iframe) |
| 10 | Bred variants on demand | `api/variants/[variantId]/html/route.ts` → `render-variant-html.ts` |

**Say:** "We snapshot schole.ai's Framer site, keep the runtime for pixel-perfect layout, text-swap sections for each variant, and serve them in iframes with PostHog instrumentation."

**Build:** `npm run prepare:pages` (runs `prepare:baseline` + `prepare:variants` before dev/build)

---

Use dashboard order below for the rest. ~30 sec per section = 3 minutes.

| # | Challenge asks for | App tab | Code file(s) |
|---|-------------------|---------|--------------|
| 1 | Initial landing page versions | **Page comparison** | `src/config/variants.ts`, `src/lib/schema/page.ts` |
| 2 | How the pages were compared | **Comparison method** | `src/lib/sim/bandit.ts`, `src/lib/stats/bayes.ts`, `src/lib/judgment/criteria.ts` |
| 3 | Simulated user behavior | **User behavior** | `src/config/personas.ts`, `src/lib/sim/visit.ts`, `src/lib/sim/metrics.ts` |
| 4 | Which versions performed better | **Winners** (+ robustness box) | `src/lib/evolve/run.ts` (375–419), `src/lib/stats/bayes.ts` |
| 5 | New generated variation(s) | **New variants** | `src/lib/evolve/optimizer.ts`, `src/lib/evolve/demo-run.ts` |
| 6 | What changed and why | **Changelog** | `src/lib/schema/page.ts` (ChangelogEntry), bred variant `changelog` arrays |

---

## 1. Initial landing page versions (~30 sec)

**App:** Page comparison — show all six gen-0 pages.

**Code:** `src/config/variants.ts` (lines 4–15 ICP map, scroll `GENERATION_0`)

**Say:**
> "Six landing pages for the same product — baseline plus five challengers with different messaging, structure emphasis, and CTAs: ROI dashboard, EU compliance, adoption gap, credibility, learner-first."

---

## 2. How the pages were compared (~30 sec)

**App:** Comparison method — Fitness tier + Winner comparison tier.

**Code:** `src/lib/analytics/posthog-events.ts` (116–124) → `src/lib/evolve/run.ts` (375–394) → `src/lib/stats/bayes.ts` (`DECISION_THRESHOLDS`)

**Say:**
> "We compare with a weighted fitness score on demo conversion, a Thompson bandit that shifts sim traffic toward leaders, and Bayesian posteriors for P(best) with bounce guardrails — not a fixed-split t-test."

---

## 3. Simulated user behavior (~30 sec)

**App:** User behavior — heatmap / replay / funnel for one variant.

**Code:** `src/config/personas.ts` → `src/lib/sim/visit.ts` (`sampleVisit`, lines 148–164 objection gate)

**Say:**
> "Simulated users are buyer personas with objection ledgers from 2025 research. Each visit emits the same signals we'd track live: pageview, scroll depth, section views, dwell time, CTA clicks. Demo conversion only counts if critical objections resolve — mirroring real B2B buying."

---

## 4. Which versions performed better (~30 sec)

**App:** Winners — leaderboard, P(best), lift; scroll to **Seed robustness check**.

**Code:** `src/lib/evolve/run.ts` (lines 375–419 — loop ending in `analyzeGeneration`)

**Say:**
> "Winners ranks variants by fitness and Bayesian confidence. Gen-0 leader in this run is [X]. Robustness re-runs twelve seeds — modal winner stability is [Y]% — so we don't trust a single simulation draw."

---

## 5. New generated variation(s) (~30 sec)

**App:** New variants — show gen-1 bred pages (e.g. g1-demo*).

**Code:** `src/lib/evolve/optimizer.ts` (lines 14–20 — mutation + crossover)

**Say:**
> "The optimizer breeds new pages from top performers — crossover of winning sections plus targeted mutation on weak areas, informed by the behavior report."

---

## 6. What changed and why (~30 sec)

**App:** Changelog — open one bred variant; read one what/why/evidence block.

**Code:** `src/lib/schema/page.ts` (`ChangelogEntry` interface)

**Say:**
> "Every bred page carries a changelog: what changed, why, and the specific evidence — fitness, conversion, objection failures, section exit rates — that motivated it."

---

## 3-minute script (teleprompter)

**[0:00 APP: Page comparison | CODE: variants.ts]**
Six landing pages, same product, different strategic bets.

**[0:30 APP: Method | CODE: posthog-events.ts → run.ts → bayes.ts]**
Weighted fitness, Thompson bandit traffic, Bayesian comparison with guardrails.

**[1:00 APP: Behavior | CODE: visit.ts]**
Persona agents, scroll, CTA, objections — simulated behavior.

**[1:30 APP: Winners | CODE: run.ts]**
Leaderboard and P(best); robustness across twelve seeds.

**[2:00 APP: New variants | CODE: optimizer.ts]**
Optimizer breeds gen-one pages from winners.

**[2:30 APP: Changelog | CODE: page.ts ChangelogEntry]**
What changed, why, and the evidence behind it.

**[2:55]**
Hosted app link in email. Happy to modify live in follow-up.

---

## VS Code tabs (open in this order)

1. `src/config/variants.ts`
2. `src/lib/analytics/posthog-events.ts`
3. `src/lib/sim/bandit.ts`
4. `src/lib/stats/bayes.ts`
5. `src/lib/sim/visit.ts`
6. `src/lib/evolve/run.ts`
7. `src/lib/evolve/optimizer.ts`
8. `src/lib/schema/page.ts`

```powershell
cd C:\Users\tinsl\schole-landing-lab
npm run setup:demo && npm run dev
cursor `
  "C:\Users\tinsl\schole-landing-lab\src\config\variants.ts:4" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\analytics\posthog-events.ts:116" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\evolve\run.ts:375" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\sim\bandit.ts:3" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\stats\bayes.ts:18" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\sim\visit.ts:148" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\evolve\optimizer.ts:14" `
  "C:\Users\tinsl\schole-landing-lab\src\lib\schema\page.ts:62"
```

App: http://localhost:3000/experiment
