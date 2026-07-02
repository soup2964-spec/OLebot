"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisitIndex } from "@/lib/registry";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import type { VariantMetrics } from "@/lib/schema/events";
import type { VariantDecision, DecisionStatus } from "@/lib/stats/bayes";
import type { LiveBehaviorSnapshot } from "@/lib/supabase/live-store";
import {
  BEHAVIOR_SIGNALS,
  BEHAVIOR_GATES,
  BEHAVIOR_WEIGHT_TOTAL,
  FUNNEL_METRIC_DEFINITIONS,
  GTM_CHALLENGE,
  POSTHOG_DIAGNOSTIC_EVENTS,
} from "@/lib/judgment/behavior-criteria";
import {
  aggregateFunnelMetrics,
  computeFunnelFromVisits,
  formatFunnelPct,
} from "@/lib/analytics/funnel-metrics";
import { VariantSectionHeatmap } from "@/components/behavior/VisitVisuals";

type DataMode = "live" | "simulated" | "loading";

/**
 * Presentation-ready behavior report for the "User behavior" section.
 * Prefers live Supabase session data when configured; falls back to simulation.
 */
export function BehaviorReport({
  run,
  index,
  variants,
  selectedVariantId,
}: {
  run: ExperimentRun | null;
  index: VisitIndex | null;
  variants: PageVariant[];
  selectedVariantId?: string | null;
}) {
  const [genIdx, setGenIdx] = useState(0);
  const [live, setLive] = useState<LiveBehaviorSnapshot | null>(null);
  const [liveConfigured, setLiveConfigured] = useState<boolean | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);

  const refreshLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const res = await fetch("/api/behavior/live?days=30");
      if (res.status === 503) {
        setLiveConfigured(false);
        setLive(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLiveConfigured(true);
        return;
      }
      setLiveConfigured(true);
      setLive(data as LiveBehaviorSnapshot);
    } catch {
      setLiveConfigured(false);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    refreshLive();
    const t = setInterval(refreshLive, 30_000);
    return () => clearInterval(t);
  }, [refreshLive]);

  useEffect(() => {
    if (!index?.length) return;
    setGenIdx(index.length - 1);
  }, [index?.length, run?.id]);

  const hasLiveData = Boolean(live?.totalSessions);
  const mode: DataMode = loadingLive
    ? "loading"
    : hasLiveData
      ? "live"
      : "simulated";

  const gen = index?.[genIdx];
  const simDecisions = run?.generations?.[genIdx]?.decisions ?? [];
  const simMetrics = gen?.metrics ?? [];
  const fullVisits = run?.generations?.[genIdx]?.visits ?? [];

  const enrichFunnel = useCallback(
    (m: VariantMetrics): VariantMetrics => ({
      ...m,
      funnel:
        m.funnel ??
        (mode === "simulated"
          ? computeFunnelFromVisits(fullVisits.filter((v) => v.variantId === m.variantId))
          : computeFunnelFromVisits([])),
    }),
    [mode, fullVisits]
  );

  const decisions = mode === "live" ? (live?.decisions ?? []) : simDecisions;
  const rankedMetrics = useMemo(
    () =>
      (mode === "live" ? (live?.metrics ?? []) : simMetrics)
        .map(enrichFunnel)
        .slice()
        .sort((a, b) => b.fitness - a.fitness),
    [mode, live, simMetrics, enrichFunnel]
  );

  const decisionById = useMemo(
    () => new Map(decisions.map((d) => [d.variantId, d])),
    [decisions]
  );

  const nameById = useMemo(
    () => new Map(variants.map((v) => [v.id, v.name])),
    [variants]
  );

  const totals = useMemo(() => {
    if (mode === "live" && live) {
      return {
        variants: live.metrics.length,
        visits: live.totals.visits,
        conversions: live.totals.conversions,
        conversionRate: live.totals.conversionRate,
        bounceRate: live.totals.bounceRate,
        avgScroll: live.totals.avgScroll,
        avgDwellMs: live.totals.avgDwellMs,
        funnel: live.totals.funnel,
      };
    }
    const enriched = simMetrics.map((m) => ({
      ...m,
      funnel:
        m.funnel ??
        computeFunnelFromVisits(fullVisits.filter((v) => v.variantId === m.variantId)),
    }));
    const visits = enriched.reduce((s, m) => s + m.visits, 0);
    const conversions = enriched.reduce((s, m) => s + m.conversions, 0);
    const w = (sel: (m: VariantMetrics) => number) =>
      visits ? enriched.reduce((s, m) => s + sel(m) * m.visits, 0) / visits : 0;
    return {
      variants: enriched.length,
      visits,
      conversions,
      conversionRate: visits ? conversions / visits : 0,
      bounceRate: w((m) => m.bounceRate),
      avgScroll: w((m) => m.avgScrollDepth),
      avgDwellMs: w((m) => m.avgDwellMs),
      funnel: aggregateFunnelMetrics(enriched.map((m) => m.funnel)),
    };
  }, [mode, live, simMetrics, fullVisits]);

  const [detailVariantId, setDetailVariantId] = useState<string | null>(
    selectedVariantId ?? null
  );
  const activeVariantId =
    detailVariantId ?? selectedVariantId ?? rankedMetrics[0]?.variantId ?? "";
  const activeVariant = variants.find((v) => v.id === activeVariantId);
  const activeMetrics = rankedMetrics.find((m) => m.variantId === activeVariantId);
  const winnerId = rankedMetrics[0]?.variantId;

  const hasSimData = Boolean(index?.length && gen);
  const showEmpty = mode !== "loading" && !hasLiveData && !hasSimData;

  if (mode === "loading") {
    return <p className="text-sm text-slate-500">Loading behavior data…</p>;
  }

  if (showEmpty) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          No live sessions yet. Visit a variant page (e.g.{" "}
          <code className="rounded bg-slate-100 px-1">/v/v1-roi</code>) to record real behavior.
          Scroll, click a CTA, then return here — numbers refresh every 30s.
        </p>
        {!liveConfigured && (
          <p className="text-xs text-slate-500">
            Connect Supabase: set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code>, then run the migration in{" "}
            <code className="rounded bg-slate-100 px-1">supabase/migrations/</code>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. CRITERIA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            How we decide which behavior matters most
          </h3>
          <span className="text-xs text-slate-500">
            Weights sum to {(BEHAVIOR_WEIGHT_TOTAL * 100).toFixed(0)}% of the fitness score
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Every variant gets a fitness score (0–100) from four PostHog events. Each event
          contributes a fixed share — the event name is what you would chart in PostHog.
        </p>

        <div className="mt-4 space-y-3">
          {BEHAVIOR_SIGNALS.map((sig) => (
            <div
              key={sig.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[220px_1fr]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{sig.label}</span>
                  <span className="text-sm font-bold text-schole-primary tabular-nums">
                    {(sig.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-schole-primary"
                    style={{ width: `${sig.weight * 100}%` }}
                  />
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">{sig.posthogEvent}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
                  {sig.role}
                </div>
              </div>
              <div className="text-xs leading-relaxed text-slate-600">
                <p>{sig.why}</p>
                <p className="mt-1 text-slate-500">
                  <span className="font-medium text-slate-600">Measured as:</span> {sig.measure}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h4 className="mt-5 text-sm font-semibold text-slate-900">
          Phase 2 diagnostics — {GTM_CHALLENGE.name}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Tracked in PostHog for funnel and loss analysis. Not included in the fitness score.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {POSTHOG_DIAGNOSTIC_EVENTS.map((diag) => (
            <div
              key={diag.id}
              className="rounded-xl border border-violet-100 bg-violet-50/40 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{diag.label}</span>
                <code className="font-mono text-[10px] text-slate-500">{diag.event}</code>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{diag.why}</p>
            </div>
          ))}
        </div>

        <h4 className="mt-5 text-sm font-semibold text-slate-900">Funnel metrics (Tier 2)</h4>
        <p className="mt-1 text-xs text-slate-500">
          Explain why conversion moved — guide copy updates. Not weighted in fitness.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {FUNNEL_METRIC_DEFINITIONS.map((f) => (
            <div key={f.id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <div className="text-sm font-medium text-slate-900">{f.label}</div>
              <code className="mt-0.5 block font-mono text-[10px] text-slate-500">{f.formula}</code>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{f.why}</p>
            </div>
          ))}
        </div>

        <h4 className="mt-5 text-sm font-semibold text-slate-900">
          Gates & thresholds (applied on top of the score)
        </h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {BEHAVIOR_GATES.map((gate) => (
            <div key={gate.id} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-medium text-slate-900">{gate.label}</div>
              <div className="mt-0.5 text-xs font-medium text-schole-primary">{gate.rule}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{gate.why}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Source selector */}
      <div className="flex flex-wrap items-center gap-3">
        {mode === "simulated" && index && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Iteration</span>
            <select
              value={String(genIdx)}
              onChange={(e) => setGenIdx(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
            >
              {index.map((g, i) => (
                <option key={g.generation} value={i}>
                  Gen {g.generation} · {g.visits.length} sampled visits
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "live" && live && (
          <span className="text-xs text-slate-500">
            Last {live.windowDays} days · updated{" "}
            {new Date(live.fetchedAt).toLocaleTimeString()}
          </span>
        )}
        <span className="text-xs text-slate-500">
          {totals.visits.toLocaleString()} {mode === "live" ? "live" : "simulated"} sessions across{" "}
          {totals.variants} variants
        </span>
      </div>

      {/* 2. Overall KPIs */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Overall behavior
        </h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Sessions" value={totals.visits.toLocaleString()} />
          <Kpi label="Conversion" value={`${(totals.conversionRate * 100).toFixed(1)}%`} accent />
          <Kpi label="Bounce rate" value={`${(totals.bounceRate * 100).toFixed(0)}%`} />
          <Kpi label="Avg scroll" value={`${(totals.avgScroll * 100).toFixed(0)}%`} />
          <Kpi label="Avg dwell" value={`${(totals.avgDwellMs / 1000).toFixed(0)}s`} />
        </div>
      </section>

      {/* Funnel KPIs */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          Conversion funnel
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Sessions → CTA exposed → demo booked. Low exposure = layout problem. Low CTR = copy problem.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FunnelStep
            label="CTA exposure"
            rate={totals.funnel.ctaExposureRate}
            count={`${totals.funnel.ctaExposed.toLocaleString()} / ${totals.funnel.sessions.toLocaleString()}`}
            formula="cta_viewed ÷ sessions"
          />
          <FunnelStep
            label="CTA click-through"
            rate={totals.funnel.ctaClickThroughRate}
            count={`${totals.funnel.ctaClicks.toLocaleString()} / ${totals.funnel.ctaExposed.toLocaleString()}`}
            formula="book_demo_click ÷ cta_viewed"
          />
          <FunnelStep
            label="Demo booking rate"
            rate={totals.funnel.demoBookingRate}
            count={`${totals.funnel.ctaClicks.toLocaleString()} / ${totals.funnel.sessions.toLocaleString()}`}
            formula="book_demo_click ÷ sessions"
            accent
          />
        </div>
      </section>

      {/* Variant table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Behavior by variant</h3>
          <p className="text-xs text-slate-500">
            Ranked by fitness. Click a row to inspect section engagement below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 text-right font-medium">Sessions</th>
                <th className="px-3 py-2 text-right font-medium">Conv.</th>
                <th className="px-3 py-2 text-right font-medium">CTA exp.</th>
                <th className="px-3 py-2 text-right font-medium">CTA CTR</th>
                <th className="px-3 py-2 text-right font-medium">Bounce</th>
                <th className="px-3 py-2 text-right font-medium">Scroll</th>
                <th className="px-3 py-2 text-right font-medium">Dwell</th>
                <th className="px-3 py-2 text-right font-medium">Fitness</th>
                <th className="px-3 py-2 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {rankedMetrics.map((m) => {
                const isActive = m.variantId === activeVariantId;
                const isWinner = m.variantId === winnerId;
                return (
                  <tr
                    key={m.variantId}
                    onClick={() => setDetailVariantId(m.variantId)}
                    className={`cursor-pointer border-b border-slate-100 transition ${
                      isActive ? "bg-schole-primary/5" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isWinner && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Top
                          </span>
                        )}
                        <span className="font-medium text-slate-900">
                          {nameById.get(m.variantId) ?? m.variantId}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {m.visits.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-schole-primary">
                      {(m.conversionRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {formatFunnelPct(m.funnel.ctaExposureRate, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-800">
                      {formatFunnelPct(m.funnel.ctaClickThroughRate, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {(m.bounceRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {(m.avgScrollDepth * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                      {(m.avgDwellMs / 1000).toFixed(0)}s
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                      {m.fitness.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DecisionBadge decision={decisionById.get(m.variantId)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section deep dive */}
      {activeVariant && activeMetrics && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Section engagement · {activeVariant.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {mode === "live"
                ? "Section views and CTA clicks from real sessions."
                : "Read rate and exit rate from simulated visits."}{" "}
              {activeMetrics.visits.toLocaleString()} sessions.
            </p>
            <div className="mt-4">
              <VariantSectionHeatmap
                variant={activeVariant}
                perSection={activeMetrics.perSection}
              />
            </div>
          </div>

          {mode === "simulated" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Why non-converters left · {activeVariant.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Critical objections still unresolved at exit (simulation only).
              </p>
              <div className="mt-4 space-y-2">
                {Object.entries(activeMetrics.objectionFailures)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([objection, count]) => {
                    const max = Math.max(
                      1,
                      ...Object.values(activeMetrics.objectionFailures)
                    );
                    return (
                      <div key={objection}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {objection.replace(/_/g, " ")}
                          </span>
                          <span className="tabular-nums text-slate-500">{count} lost</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-rose-400"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(activeMetrics.objectionFailures).length === 0 && (
                  <p className="text-xs text-slate-500">
                    No unresolved critical objections recorded for this variant.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DecisionBadge({ decision }: { decision?: VariantDecision }) {
  const status: DecisionStatus = decision?.status ?? "collecting";
  const label =
    status === "promoted" ? "Promote" : status === "killed" ? "Kill" : "Collecting";
  const cls =
    status === "promoted"
      ? "bg-emerald-100 text-emerald-700"
      : status === "killed"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-500";
  const pBest = decision ? ` ${(decision.pBest * 100).toFixed(0)}%` : "";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
      title={decision?.reason}
    >
      {label}
      {status !== "killed" && pBest ? ` · P(best)${pBest}` : ""}
    </span>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-schole-primary/40 bg-schole-primary/10" : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function FunnelStep({
  label,
  rate,
  count,
  formula,
  accent,
}: {
  label: string;
  rate: number;
  count: string;
  formula: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-100 bg-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-amber-800">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent ? "text-schole-primary" : "text-slate-900"
        }`}
      >
        {formatFunnelPct(rate)}
      </div>
      <div className="mt-1 text-xs tabular-nums text-slate-500">{count}</div>
      <code className="mt-2 block font-mono text-[10px] text-slate-400">{formula}</code>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
        <div
          className={`h-full rounded-full ${accent ? "bg-schole-primary" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, rate * 100)}%` }}
        />
      </div>
    </div>
  );
}
