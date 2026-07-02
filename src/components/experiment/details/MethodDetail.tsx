import type { ReactNode } from "react";
import {
  BEHAVIOR_GATES,
  BEHAVIOR_SIGNALS,
  BEHAVIOR_WEIGHT_TOTAL,
  FUNNEL_METRIC_DEFINITIONS,
  GTM_CHALLENGE,
  POSTHOG_BEHAVIOR_WEIGHTS,
  POSTHOG_DIAGNOSTIC_EVENTS,
} from "@/lib/judgment/behavior-criteria";
import {
  EVALUATOR_SCORECARD_DIMENSIONS,
  JUDGMENT_CRITERIA,
} from "@/lib/judgment/criteria";
import { DECISION_THRESHOLDS } from "@/lib/stats/bayes";

/**
 * Comparison method — criteria summary only.
 * Every metric below is wired in code (posthog-events.ts, funnel-metrics.ts, bayes.ts).
 */
export function MethodDetail() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        Each landing page variant is evaluated in four layers: a weighted{" "}
        <strong className="font-medium text-slate-800">fitness score</strong> picks winners,{" "}
        <strong className="font-medium text-slate-800">funnel metrics</strong> explain why
        conversion moved, <strong className="font-medium text-slate-800">hard gates</strong> block
        bad promotions, and an <strong className="font-medium text-slate-800">LLM evaluator</strong>{" "}
        diagnoses copy for the next breeding round. Tracking aligns to schole.ai (PostHog + GTM).
      </p>

      <CriteriaSection
        tier="Tier 1"
        title="Fitness score — decides winners"
        subtitle={`Weights sum to ${(BEHAVIOR_WEIGHT_TOTAL * 100).toFixed(0)}%. Drives ranking, bandit allocation, and Bayesian comparison.`}
        accent="border-schole-primary/30 bg-schole-primary/5"
      >
        <div className="space-y-3">
          {BEHAVIOR_SIGNALS.map((signal) => (
            <CriteriaRow
              key={signal.id}
              badge={`${(signal.weight * 100).toFixed(0)}%`}
              label={signal.label}
              code={signal.posthogEvent}
              detail={signal.why}
            />
          ))}
        </div>
        <p className="mt-4 rounded-lg border border-schole-primary/20 bg-white px-3 py-2 text-xs text-slate-600">
          Demo conversion is capped at a{" "}
          {(POSTHOG_BEHAVIOR_WEIGHTS.conversionCeiling * 100).toFixed(0)}% ceiling so one outlier
          session cannot dominate. A visit only counts as{" "}
          <code className="rounded bg-slate-100 px-1">book_demo_click</code> if every critical
          buyer objection was resolved before the CTA.
        </p>
      </CriteriaSection>

      <CriteriaSection
        tier="Tier 2"
        title="Funnel metrics — explain losses"
        subtitle="Not weighted in fitness. Guide the optimizer toward layout vs copy fixes."
        accent="border-amber-200 bg-amber-50/40"
      >
        <div className="space-y-3">
          {FUNNEL_METRIC_DEFINITIONS.map((f) => (
            <CriteriaRow
              key={f.id}
              badge={f.formula}
              label={f.label}
              detail={f.why}
              foot={`Copy lever: ${f.copyLever}`}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-600">
          <strong className="text-slate-800">Read the funnel:</strong> low exposure → fix
          hero/layout; high exposure + low CTR → fix CTA copy and proof; demo rate = exposure × CTR.
        </p>
      </CriteriaSection>

      <CriteriaSection
        tier="Tier 3"
        title="Decision gates — promote, kill, or keep testing"
        subtitle="Applied on top of fitness. Same thresholds the bandit and Results tab use."
        accent="border-slate-200 bg-slate-50"
      >
        <ul className="space-y-2">
          {JUDGMENT_CRITERIA.decisionOrder.map((step) => (
            <li key={step} className="flex gap-2 text-sm text-slate-700">
              <span className="text-slate-400">→</span>
              {step}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          {BEHAVIOR_GATES.map((gate) => (
            <div key={gate.id}>
              <div className="text-sm font-medium text-slate-900">{gate.label}</div>
              <p className="mt-0.5 text-xs text-schole-primary">{gate.rule}</p>
              <p className="mt-1 text-xs text-slate-500">{gate.why}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ThresholdChip
            label="Promote"
            value={`P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}%`}
          />
          <ThresholdChip
            label="Kill"
            value={`P(beat baseline) < ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}%`}
          />
          <ThresholdChip
            label="Bounce guardrail"
            value={`≤ baseline × ${DECISION_THRESHOLDS.guardrailBounceRelMax}`}
          />
        </div>
      </CriteriaSection>

      <CriteriaSection
        tier="Tier 4"
        title="LLM evaluator — qualitative diagnosis"
        subtitle="Separate judge agent scores copy quality. Informs breeding; never overrides Tier 1."
        accent="border-violet-200 bg-violet-50/40"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {EVALUATOR_SCORECARD_DIMENSIONS.map((dim) => (
            <div key={dim.id} className="rounded-lg border border-violet-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{dim.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-violet-600">
                  {dim.role}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{dim.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-600">
          The evaluator also surfaces per-section read rates, sentiment, unresolved objections, and
          verbatim persona verdicts. The optimizer breeds new copy from that evidence.
        </p>
      </CriteriaSection>

      <CriteriaSection
        tier="Diagnostics"
        title={`PostHog events — ${GTM_CHALLENGE.name}`}
        subtitle="Tracked on every variant page. Super-properties: challenge, experiment_number, variant_id, generation, strategy."
        accent="border-slate-200 bg-white"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {POSTHOG_DIAGNOSTIC_EVENTS.map((diag) => (
            <div key={diag.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{diag.label}</span>
                <code className="font-mono text-[10px] text-slate-500">{diag.event}</code>
              </div>
              <p className="mt-1 text-xs text-slate-600">{diag.why}</p>
            </div>
          ))}
        </div>
      </CriteriaSection>
    </div>
  );
}

function CriteriaSection({
  tier,
  title,
  subtitle,
  accent,
  children,
}: {
  tier: string;
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-5 ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{tier}</p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CriteriaRow({
  badge,
  label,
  code,
  detail,
  foot,
}: {
  badge: string;
  label: string;
  code?: string;
  detail: string;
  foot?: string;
}) {
  return (
    <div className="rounded-lg border border-white/80 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {badge}
        </span>
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {code && (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            {code}
          </code>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{detail}</p>
      {foot && <p className="mt-1 text-xs text-amber-900">{foot}</p>}
    </div>
  );
}

function ThresholdChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-slate-900">{value}</div>
    </div>
  );
}
