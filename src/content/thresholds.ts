/**
 * Tunable decision knobs for promote / kill / guardrails.
 * Edit here under time pressure — math lives in `@/platform/stats/bayes`.
 */
export const DECISION_THRESHOLDS = {
  /** Promote when P(best) ≥ this and expected loss below cap. */
  promotePBest: 0.95,
  /** Expected loss cap for promotion, in absolute conversion rate (0.001 = 0.1pp). */
  promoteMaxExpectedLoss: 0.001,
  /** Kill when P(beats baseline) falls below this. */
  killPBeatBaseline: 0.05,
  /** Guardrail: bounce rate must not exceed baseline × this factor. */
  guardrailBounceRelMax: 1.1,
  /** Monte Carlo draws for posterior estimates. */
  draws: 20000,
} as const;

/**
 * Caps how many "effective visits" of confidence one independent reading is worth.
 * Visits beyond the cap still count for reported metrics but are down-weighted
 * in the Beta-Binomial posterior.
 */
export const EVIDENCE_VISITS_PER_READING = 40;

/** Mildly informative Beta prior anchored on ~3% B2B SaaS demo-booking benchmark. */
export const PRIOR = { alpha: 3, beta: 97 } as const;
