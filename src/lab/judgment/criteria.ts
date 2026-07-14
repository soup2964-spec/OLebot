import { PERSONA_SET_V1 } from "@/config/personas";
import { DECISION_THRESHOLDS } from "@/shared/stats/bayes";
import type { VariantDecision, DecisionStatus } from "@/shared/stats/bayes";
import type { VariantMetrics } from "@/shared/schema/events";

/** Documented judgment criteria — referenced by Method tab and comparison UI. */
export const JUDGMENT_CRITERIA = {
  tier1: [
    {
      id: "conversion_rate",
      label: "Conversion rate",
      role: "Primary outcome",
      description: "Demo-booking conversion from simulated visits. The main growth KPI.",
    },
    {
      id: "p_best_status",
      label: "P(best) / promote–kill status",
      role: "Confidence gate",
      description: `Promote when P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}% and expected loss is low. Kill when P(beats baseline) < ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}%.`,
    },
    {
      id: "lift_vs_baseline",
      label: "Lift vs baseline",
      role: "Business meaning",
      description: "Absolute conversion lift over the control (v0-baseline). A variant must beat the control, not just other challengers.",
    },
    {
      id: "bounce_guardrail",
      label: "Bounce guardrail",
      role: "Safety veto",
      description: `Block promotion if bounce rate exceeds baseline × ${DECISION_THRESHOLDS.guardrailBounceRelMax}. Prevents high-convert, bad-experience false wins.`,
    },
  ],
  tier2: [
    {
      id: "funnel_metrics",
      label: "Funnel metrics (CTA exposure → CTR → demo)",
      role: "Copy diagnostic",
      description:
        "Tier-2 rates explain why conversion moved: cta_viewed ÷ sessions (exposure), book_demo_click ÷ cta_viewed (CTR), book_demo_click ÷ sessions (demo rate). Not weighted in fitness — guide optimizer rewrites.",
    },
    {
      id: "objection_failures",
      label: "Top objection failures",
      role: "Why it lost",
      description: "Critical buyer objections still unresolved at exit. Explains non-conversion mechanism.",
    },
    {
      id: "persona_fit",
      label: "Best persona fit",
      role: "Who it serves",
      description: "Which simulated buyer persona converts best on this page. Diagnostic only — does not override Tier 1.",
    },
  ],
  decisionOrder: [
    "If bounce guardrail fails → block promote / kill",
    "Else if P(best) ≥ 95% and lift > 0 → promote",
    "Else if P(beats baseline) < 5% → kill",
    "Else → collecting (keep testing)",
    "Explain with: conversion, lift, objection failures, persona fit",
  ],
} as const;

/** LLM evaluator scorecard — qualitative diagnosis, does not override fitness. */
export const EVALUATOR_SCORECARD_DIMENSIONS = [
  {
    id: "valueClarity",
    label: "Value clarity",
    role: "Qualitative (0–10)",
    description: "How quickly and clearly the page communicates its value proposition.",
  },
  {
    id: "credibility",
    label: "Credibility",
    role: "Qualitative (0–10)",
    description: "How well the page earns trust with proof, specificity, and tone.",
  },
  {
    id: "ctaStrength",
    label: "CTA strength",
    role: "Qualitative (0–10)",
    description: "How compelling and low-friction the demo booking ask is.",
  },
  {
    id: "audienceFit",
    label: "Audience fit",
    role: "Qualitative (0–10)",
    description: "How well the page serves the personas that actually visited.",
  },
] as const;

export type VariantJudgment = {
  variantId: string;
  conversionRate: number;
  /** Lift vs baseline in percentage points (e.g. +1.4). Null for baseline. */
  liftPp: number | null;
  pBest: number | null;
  status: DecisionStatus | null;
  guardrailBounceOk: boolean | null;
  topObjectionFailures: { id: string; label: string; count: number }[];
  bestPersona: { id: string; name: string; conversionRate: number; visits: number } | null;
  decisionReason: string | null;
};

const personaNames = new Map(
  PERSONA_SET_V1.personas.map((p) => [p.id, p.name] as const)
);

export function formatObjectionId(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function bestPersonaFor(metrics: VariantMetrics) {
  let best: VariantJudgment["bestPersona"] = null;
  for (const [personaId, row] of Object.entries(metrics.byPersona)) {
    if (row.visits === 0) continue;
    const rate = row.conversions / row.visits;
    if (!best || rate > best.conversionRate) {
      best = {
        id: personaId,
        name: personaNames.get(personaId) ?? personaId,
        conversionRate: rate,
        visits: row.visits,
      };
    }
  }
  return best;
}

export function buildVariantJudgment(
  metrics: VariantMetrics,
  decision: VariantDecision | undefined,
  baselineRate: number,
  isBaseline: boolean
): VariantJudgment {
  const topObjectionFailures = Object.entries(metrics.objectionFailures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, label: formatObjectionId(id), count }));

  return {
    variantId: metrics.variantId,
    conversionRate: metrics.conversionRate,
    liftPp: isBaseline ? null : (metrics.conversionRate - baselineRate) * 100,
    pBest: decision?.pBest ?? null,
    status: decision?.status ?? null,
    guardrailBounceOk: decision?.guardrailBounceOk ?? null,
    topObjectionFailures,
    bestPersona: bestPersonaFor(metrics),
    decisionReason: decision?.reason ?? null,
  };
}

export function buildJudgmentsFromMetrics(
  metrics: VariantMetrics[],
  decisions: VariantDecision[] | undefined,
  baselineId = "v0-baseline"
): Record<string, VariantJudgment> {
  const baseline = metrics.find((m) => m.variantId === baselineId) ?? metrics[metrics.length - 1];
  const baselineRate = baseline?.conversionRate ?? 0;
  const decisionByVariant = new Map(decisions?.map((d) => [d.variantId, d]));

  const out: Record<string, VariantJudgment> = {};
  for (const m of metrics) {
    out[m.variantId] = buildVariantJudgment(
      m,
      decisionByVariant.get(m.variantId),
      baselineRate,
      m.variantId === baselineId
    );
  }
  return out;
}

export function statusLabel(status: DecisionStatus): string {
  const labels: Record<DecisionStatus, string> = {
    promoted: "Promoted",
    killed: "Killed",
    collecting: "Collecting",
  };
  return labels[status];
}

export function statusStyles(status: DecisionStatus): string {
  const styles: Record<DecisionStatus, string> = {
    promoted: "bg-emerald-100 text-emerald-800",
    killed: "bg-rose-100 text-rose-800",
    collecting: "bg-slate-100 text-slate-600",
  };
  return styles[status];
}

export function formatLiftPp(liftPp: number | null): string {
  if (liftPp === null) return "Baseline";
  const sign = liftPp >= 0 ? "+" : "";
  return `${sign}${liftPp.toFixed(1)}pp`;
}
