"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { RobustnessDetail } from "./RobustnessDetail";

type TierId = "fitness" | "funnel" | "comparison" | "evaluator" | "diagnostics";

const TIER_CARDS: {
  id: TierId;
  tier: string;
  title: string;
  summary: string;
  stat: string;
  accent: string;
  ring: string;
}[] = [
  {
    id: "fitness",
    tier: "Tier 1",
    title: "Fitness score",
    summary: "Ranks variants",
    stat: `${(POSTHOG_BEHAVIOR_WEIGHTS.cta_click * 100).toFixed(0)}% conversion`,
    accent: "border-schole-primary/30 bg-schole-primary/5",
    ring: "ring-schole-primary/40",
  },
  {
    id: "funnel",
    tier: "Tier 2",
    title: "Funnel metrics",
    summary: "Explains losses",
    stat: "Exposure → CTR → demo",
    accent: "border-amber-200 bg-amber-50/60",
    ring: "ring-amber-300/60",
  },
  {
    id: "comparison",
    tier: "Tier 3",
    title: "Winner comparison",
    summary: "How decisions are made",
    stat: `P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}%`,
    accent: "border-slate-200 bg-slate-50",
    ring: "ring-slate-300/60",
  },
  {
    id: "evaluator",
    tier: "Tier 4",
    title: "LLM evaluator",
    summary: "Copy diagnosis",
    stat: `${EVALUATOR_SCORECARD_DIMENSIONS.length} scorecard dims`,
    accent: "border-violet-200 bg-violet-50/60",
    ring: "ring-violet-300/60",
  },
  {
    id: "diagnostics",
    tier: "Track",
    title: "PostHog events",
    summary: GTM_CHALLENGE.name,
    stat: `${POSTHOG_DIAGNOSTIC_EVENTS.length} diagnostic events`,
    accent: "border-slate-200 bg-white",
    ring: "ring-slate-300/60",
  },
];

/**
 * Comparison method — horizontal tier cards with pop-up detail panels.
 */
export function MethodDetail() {
  const [openId, setOpenId] = useState<TierId | null>("fitness");
  const popupRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpenId(null), []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, close]);

  const openCard = TIER_CARDS.find((c) => c.id === openId);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Variants are compared in four steps: a weighted{" "}
        <strong className="font-medium text-slate-800">fitness score</strong> ranks them,{" "}
        <strong className="font-medium text-slate-800">funnel metrics</strong> explain why
        conversion moved,{" "}
        <strong className="font-medium text-slate-800">Bayesian comparison</strong> decides
        promote/kill with guardrails, and an{" "}
        <strong className="font-medium text-slate-800">LLM evaluator</strong> diagnoses copy for
        the next breeding round. Before promoting a gen-0 winner, we also re-run the six starting
        pages across multiple RNG seeds and report ranking stability below (sensitivity check only —
        not the live experiment leaderboard). Select a tier for the full criteria.
      </p>

      {/* Horizontal tier selector — single row */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Comparison criteria tiers"
        >
          {TIER_CARDS.map((card) => {
            const active = openId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`criteria-panel-${card.id}`}
                onClick={() => setOpenId(active ? null : card.id)}
                className={`flex min-w-[9.5rem] flex-1 shrink-0 flex-col rounded-xl border px-3 py-3 text-left transition ${
                  card.accent
                } ${
                  active
                    ? `ring-2 ${card.ring} shadow-md`
                    : "hover:shadow-sm hover:brightness-[0.98]"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {card.tier}
                </span>
                <span className="mt-1 text-sm font-semibold leading-tight text-slate-900">
                  {card.title}
                </span>
                <span className="mt-0.5 text-[11px] text-slate-600">{card.summary}</span>
                <span className="mt-2 truncate font-mono text-[10px] font-medium text-slate-500">
                  {card.stat}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pop-up detail card */}
        {openId && openCard && (
          <div
            ref={popupRef}
            id={`criteria-panel-${openId}`}
            role="tabpanel"
            className={`relative mt-3 rounded-xl border shadow-lg ${openCard.accent}`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {openCard.tier}
                </p>
                <h3 className="text-base font-semibold text-slate-900">{openCard.title}</h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                aria-label="Close criteria details"
              >
                Close
              </button>
            </div>

            <div className="max-h-[min(28rem,55vh)] overflow-y-auto p-4">
              {openId === "fitness" && <FitnessDetail />}
              {openId === "funnel" && <FunnelDetail />}
              {openId === "comparison" && <ComparisonDetail />}
              {openId === "evaluator" && <EvaluatorDetail />}
              {openId === "diagnostics" && <DiagnosticsDetail />}
            </div>
          </div>
        )}
      </div>

      <RobustnessDetail />
    </div>
  );
}

function FitnessDetail() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Weighted score (0–100) ranks variants for bandit allocation and breeding priority —
        it does not by itself declare a winner. Weights sum to {(BEHAVIOR_WEIGHT_TOTAL * 100).toFixed(0)}%.
      </p>
      <div className="flex flex-wrap gap-2">
        {BEHAVIOR_SIGNALS.map((signal) => (
          <MetricChip
            key={signal.id}
            badge={`${(signal.weight * 100).toFixed(0)}%`}
            label={signal.label}
            code={signal.posthogEvent}
            detail={signal.why}
            role={signal.role}
          />
        ))}
      </div>
      <p className="rounded-lg border border-schole-primary/20 bg-white px-3 py-2 text-xs text-slate-600">
        Demo conversion is capped at a{" "}
        {(POSTHOG_BEHAVIOR_WEIGHTS.conversionCeiling * 100).toFixed(0)}% ceiling.
        A visit only counts as <code className="rounded bg-slate-100 px-1">book_demo_click</code>{" "}
        if every critical buyer objection was resolved before the CTA.
      </p>
    </div>
  );
}

function FunnelDetail() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Not weighted in fitness — guide the optimizer toward layout vs copy fixes.
      </p>
      <div className="flex flex-wrap gap-2">
        {FUNNEL_METRIC_DEFINITIONS.map((f) => (
          <MetricChip
            key={f.id}
            badge={f.formula}
            label={f.label}
            detail={f.why}
            foot={`Copy lever: ${f.copyLever}`}
            role={f.role}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600">
        <strong className="text-slate-800">Read the funnel:</strong> low exposure → fix
        hero/layout; high exposure + low CTR → fix CTA copy and proof; demo rate = exposure × CTR.
      </p>
    </div>
  );
}

function ComparisonDetail() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        After fitness ranks variants, we compare them statistically against the baseline using
        Beta–Binomial posteriors. A variant is only promoted when the posterior says it is
        likely the best <em>and</em> guardrails pass — not when it merely scores highest on
        engagement.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Comparison flow
        </p>
        <p className="mt-1 text-xs text-slate-700">
          Simulate visits → compute fitness + funnel → compare conversion posteriors vs baseline
          → apply guardrails → promote, kill, or keep testing → breed from winner evidence
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {JUDGMENT_CRITERIA.decisionOrder.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        {BEHAVIOR_GATES.map((gate) => (
          <div
            key={gate.id}
            className="min-w-[10rem] flex-1 rounded-lg border border-white/80 bg-white p-3"
          >
            <div className="text-sm font-medium text-slate-900">{gate.label}</div>
            <p className="mt-0.5 text-xs text-schole-primary">{gate.rule}</p>
            <p className="mt-1 text-xs text-slate-500">{gate.why}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}

function EvaluatorDetail() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Separate judge agent scores copy quality. Informs breeding; never overrides Tier 1.
      </p>
      <div className="flex flex-wrap gap-2">
        {EVALUATOR_SCORECARD_DIMENSIONS.map((dim) => (
          <MetricChip
            key={dim.id}
            badge={dim.role}
            label={dim.label}
            detail={dim.description}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600">
        The evaluator also surfaces per-section read rates, sentiment, unresolved objections,
        and verbatim persona verdicts. The optimizer breeds new copy from that evidence.
      </p>
    </div>
  );
}

function DiagnosticsDetail() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Tracked on every variant page. Super-properties: challenge, experiment_number,
        variant_id, generation, strategy.
      </p>
      <div className="flex flex-wrap gap-2">
        {POSTHOG_DIAGNOSTIC_EVENTS.map((diag) => (
          <div
            key={diag.id}
            className="min-w-[10rem] flex-1 rounded-lg border border-slate-100 bg-white p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{diag.label}</span>
              <code className="font-mono text-[10px] text-slate-500">{diag.event}</code>
            </div>
            <p className="mt-1 text-xs text-slate-600">{diag.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricChip({
  badge,
  label,
  code,
  detail,
  foot,
  role,
}: {
  badge: string;
  label: string;
  code?: string;
  detail: string;
  foot?: string;
  role?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`min-w-[8.5rem] flex-1 rounded-lg border bg-white transition ${
        expanded ? "border-schole-primary/40 ring-1 ring-schole-primary/20" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2 text-left hover:bg-slate-50/80"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            {badge}
          </span>
          <span className="text-xs font-medium text-slate-900">{label}</span>
          {code && (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] text-slate-500">
              {code}
            </code>
          )}
        </div>
        {role && (
          <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400">
            {role}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="text-xs leading-relaxed text-slate-600">{detail}</p>
          {foot && <p className="mt-2 text-xs text-amber-900">{foot}</p>}
        </div>
      )}
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
