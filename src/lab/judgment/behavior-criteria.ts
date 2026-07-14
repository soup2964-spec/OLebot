import { DECISION_THRESHOLDS } from "@/shared/stats/bayes";
import {
  POSTHOG_BEHAVIOR_EVENTS,
  POSTHOG_BEHAVIOR_WEIGHTS,
  POSTHOG_BEHAVIOR_WEIGHT_TOTAL,
  POSTHOG_EVENTS,
} from "@/lab/analytics/posthog-events";

export interface BehaviorSignal {
  id: string;
  label: string;
  weight: number;
  role: string;
  why: string;
  measure: string;
  posthogEvent: string;
}

/** Weighted PostHog events that compose the fitness score. */
export const BEHAVIOR_SIGNALS: BehaviorSignal[] = POSTHOG_BEHAVIOR_EVENTS.map((e) => ({
  id: e.id,
  label: e.label,
  weight: e.weight,
  role: e.role,
  why: e.why,
  measure: e.hogqlMeasure,
  posthogEvent: e.event,
}));

export interface BehaviorGate {
  id: string;
  label: string;
  rule: string;
  why: string;
}

/**
 * Hard gates on top of the PostHog-weighted score — same thresholds the bandit uses.
 */
export const BEHAVIOR_GATES: BehaviorGate[] = [
  {
    id: "objection_gate",
    label: "Critical-objection gate",
    rule: "A session only counts as book_demo_click if every critical objection was resolved before the CTA.",
    why: "Models real buyers: no amount of scroll_depth converts someone whose dealbreaker was never answered.",
  },
  {
    id: "promote",
    label: "Promote threshold",
    rule: `P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}% and expected loss ≤ ${(DECISION_THRESHOLDS.promoteMaxExpectedLoss * 100).toFixed(2)}pp`,
    why: "Declared winner only when posterior confidence is high and downside of being wrong is negligible.",
  },
  {
    id: "kill",
    label: "Kill threshold",
    rule: `P(beats baseline) < ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}%`,
    why: "Variants reliably worse than control are dropped so traffic concentrates on real contenders.",
  },
  {
    id: "guardrail",
    label: "Bounce guardrail",
    rule: `${POSTHOG_EVENTS.PAGE_LEAVE} bounce rate must not exceed baseline × ${DECISION_THRESHOLDS.guardrailBounceRelMax} (scroll_depth < 15%)`,
    why: "Blocks high book_demo_click / bad-experience false wins from being promoted.",
  },
];

export { POSTHOG_BEHAVIOR_WEIGHT_TOTAL as BEHAVIOR_WEIGHT_TOTAL };
export {
  GTM_CHALLENGE,
  GTM_EVENTS,
  POSTHOG_BEHAVIOR_WEIGHTS,
  POSTHOG_DIAGNOSTIC_EVENTS,
  POSTHOG_EVENTS,
  SCHOLE_PRODUCTION_STACK,
} from "@/lab/analytics/posthog-events";
export {
  FUNNEL_METRIC_DEFINITIONS,
  type VariantFunnelMetrics,
} from "@/lab/analytics/funnel-metrics";
