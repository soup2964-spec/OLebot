import { FITNESS_WEIGHTS } from "@/lib/sim/metrics";
import { DECISION_THRESHOLDS } from "@/lib/stats/bayes";

/**
 * Presentation-facing description of how simulated user behavior is weighted
 * and gated into a promote/kill decision. Weights and thresholds are imported
 * from the code that actually runs, so the report can't drift from reality.
 */

export interface BehaviorSignal {
  id: string;
  label: string;
  /** Share of the fitness score (0-1). */
  weight: number;
  role: string;
  why: string;
  measure: string;
}

/** The four weighted behaviors, ordered by importance (descending weight). */
export const BEHAVIOR_SIGNALS: BehaviorSignal[] = [
  {
    id: "conversion",
    label: "Conversion (demo booking)",
    weight: FITNESS_WEIGHTS.conversion,
    role: "Primary outcome",
    why: "The CTA click is the only behavior that maps directly to revenue. Every other signal is a means to it, so it carries the most weight by far.",
    measure: `CTA clicks ÷ visits, normalized against a ${(FITNESS_WEIGHTS.conversionCeiling * 100).toFixed(0)}% ceiling`,
  },
  {
    id: "scroll",
    label: "Scroll depth",
    weight: FITNESS_WEIGHTS.scroll,
    role: "Attention / engagement",
    why: "How far a visitor gets is the strongest proxy for whether the message held attention. Weighted second because deep scroll precedes most conversions but doesn't guarantee them.",
    measure: "sections seen ÷ total sections, averaged across all visits",
  },
  {
    id: "bounce",
    label: "Bounce rate (inverse)",
    weight: FITNESS_WEIGHTS.bounce,
    role: "Early-abandonment guard",
    why: "Penalizes pages that lose people immediately. Lower weight because it overlaps with scroll depth and only captures the worst failures.",
    measure: "share of visits that leave near the top of the page (inverted)",
  },
  {
    id: "sentiment",
    label: "Section sentiment",
    weight: FITNESS_WEIGHTS.sentiment,
    role: "Reaction quality",
    why: "Qualitative signal on how the copy landed. Kept small because it is the softest, most subjective measure.",
    measure: "average per-section reaction (-2…+2), rescaled to 0–1",
  },
];

export interface BehaviorGate {
  id: string;
  label: string;
  rule: string;
  why: string;
}

/**
 * Hard gates and statistical thresholds that sit on top of the weighted score —
 * these decide whether a behavior pattern actually counts as a win.
 */
export const BEHAVIOR_GATES: BehaviorGate[] = [
  {
    id: "objection_gate",
    label: "Critical-objection gate",
    rule: "A visitor converts only if every critical objection was resolved by the copy before they reached a CTA.",
    why: "Models real buyers: no amount of engagement converts someone whose dealbreaker was never answered. This is a hard gate, not a weight.",
  },
  {
    id: "promote",
    label: "Promote threshold",
    rule: `P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}% and expected loss ≤ ${(DECISION_THRESHOLDS.promoteMaxExpectedLoss * 100).toFixed(2)}pp`,
    why: "A variant is declared a winner only when the Bayesian posterior is highly confident it is best and the downside of being wrong is negligible.",
  },
  {
    id: "kill",
    label: "Kill threshold",
    rule: `P(beats baseline) < ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}%`,
    why: "Variants reliably worse than the control are dropped so traffic and breeding concentrate on real contenders.",
  },
  {
    id: "guardrail",
    label: "Bounce guardrail",
    rule: `bounce rate must not exceed baseline × ${DECISION_THRESHOLDS.guardrailBounceRelMax}`,
    why: "Blocks 'high-convert but bad-experience' false wins from being promoted.",
  },
];

/** Total of the weighted signals — should equal 1.0; shown for transparency. */
export const BEHAVIOR_WEIGHT_TOTAL = BEHAVIOR_SIGNALS.reduce((s, x) => s + x.weight, 0);
