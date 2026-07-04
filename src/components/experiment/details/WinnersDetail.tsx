"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import type { VariantMetrics } from "@/lib/schema/events";
import type { VariantDecision } from "@/lib/stats/bayes";
import type { VariantJudgment } from "@/lib/judgment/criteria";
import { formatLiftPp } from "@/lib/judgment/criteria";
import { formatFunnelPct } from "@/lib/analytics/funnel-metrics";
import { staticReplicaPath } from "@/lib/replica/paths";
import { variantPageTitle } from "@/lib/variants/display-name";
import { LandingPagePreview } from "@/components/LandingPagePreview";
import { DecisionChip } from "@/components/experiment/DecisionChip";

export function WinnersDetail({
  run,
  variants,
  judgmentsByVariant = {},
}: {
  run: ExperimentRun | null;
  variants: PageVariant[];
  judgmentsByVariant?: Record<string, VariantJudgment>;
}) {
  const [genIdx, setGenIdx] = useState(() =>
    run?.generations?.length ? run.generations.length - 1 : 0
  );

  useEffect(() => {
    setGenIdx(run?.generations?.length ? run.generations.length - 1 : 0);
  }, [run?.id, run?.generations?.length]);

  const gen = run?.generations?.[genIdx];
  const baselineRate = useMemo(() => {
    if (!gen) return 0;
    const baseline = gen.metrics.find((m) => m.variantId === "v0-baseline");
    return baseline?.conversionRate ?? gen.metrics[gen.metrics.length - 1]?.conversionRate ?? 0;
  }, [gen]);

  if (!run?.generations.length) {
    return <p className="text-sm text-slate-500">No results yet. Run an experiment to see winners.</p>;
  }

  if (!gen) {
    return <p className="text-sm text-slate-500">No generation data.</p>;
  }

  const ranked = gen.metrics.slice().sort((a, b) => b.fitness - a.fitness);
  const winnerId = ranked[0]?.variantId;

  return (
    <div className="space-y-5">
      {run.generations.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Generation</span>
          <select
            value={String(genIdx)}
            onChange={(e) => setGenIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
          >
            {run.generations.map((g, i) => (
              <option key={g.generation} value={i}>
                Gen {g.generation} · {(g.totalVisits ?? g.visits.length).toLocaleString()} visits
              </option>
            ))}
          </select>
        </label>
      )}

      {gen.report.insights && (
        <div className="rounded-xl border border-schole-primary/20 bg-schole-primary/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-schole-primary">
            Winner insight
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {gen.report.insights.slice(0, 500)}
            {gen.report.insights.length > 500 ? "…" : ""}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {ranked.map((metrics, index) => {
          const variant = variants.find((v) => v.id === metrics.variantId);
          const decision = gen.decisions?.find((d) => d.variantId === metrics.variantId);
          const judgment = judgmentsByVariant[metrics.variantId];
          if (!variant) return null;

          return (
            <WinnerRow
              key={metrics.variantId}
              rank={index + 1}
              variant={variant}
              metrics={metrics}
              decision={decision}
              judgment={judgment}
              baselineRate={baselineRate}
              isTop={metrics.variantId === winnerId}
            />
          );
        })}
      </div>
    </div>
  );
}

function WinnerRow({
  rank,
  variant,
  metrics,
  decision,
  judgment,
  baselineRate,
  isTop,
}: {
  rank: number;
  variant: PageVariant;
  metrics: VariantMetrics;
  decision?: VariantDecision;
  judgment?: VariantJudgment;
  baselineRate: number;
  isTop: boolean;
}) {
  const src = staticReplicaPath(variant.id);
  const title = variantPageTitle(variant);
  const liftPp =
    judgment?.liftPp ?? (variant.id === "v0-baseline" ? null : (metrics.conversionRate - baselineRate) * 100);
  const funnel = metrics.funnel;
  const topObjections = Object.entries(metrics.objectionFailures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isTop ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
        {/* Page preview */}
        <div className="border-b border-slate-100 lg:border-b-0 lg:border-r">
          {src ? (
            <LandingPagePreview src={src} title={title} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-sm text-slate-400">
              Preview unavailable
            </div>
          )}
        </div>

        {/* Performance panel */}
        <div className="flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isTop ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  #{rank}
                  {isTop ? " · Top" : ""}
                </span>
                {decision && <DecisionChip decision={decision} />}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="font-mono text-xs text-slate-500">
                {variant.id} · {variant.strategy}
              </p>
            </div>
            <Link
              href={`/v/${variant.id}`}
              target="_blank"
              className="shrink-0 rounded-lg bg-schole-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-schole-primary-hover"
            >
              Open page ↗
            </Link>
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{variant.thesis}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Demo conversion" value={`${(metrics.conversionRate * 100).toFixed(1)}%`} accent />
            <Stat label="Fitness score" value={metrics.fitness.toFixed(1)} />
            <Stat label="Lift vs baseline" value={formatLiftPp(liftPp)} />
            <Stat label="Sessions" value={metrics.visits.toLocaleString()} />
            <Stat label="Bounce rate" value={`${(metrics.bounceRate * 100).toFixed(0)}%`} />
            <Stat label="Avg scroll" value={`${(metrics.avgScrollDepth * 100).toFixed(0)}%`} />
            <Stat label="Avg dwell" value={`${(metrics.avgDwellMs / 1000).toFixed(0)}s`} />
            {decision && (
              <Stat label="P(best)" value={`${(decision.pBest * 100).toFixed(0)}%`} />
            )}
          </div>

          {funnel && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
                Conversion funnel
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <FunnelStat label="CTA exposure" value={formatFunnelPct(funnel.ctaExposureRate, 0)} />
                <FunnelStat label="CTA CTR" value={formatFunnelPct(funnel.ctaClickThroughRate, 0)} />
                <FunnelStat
                  label="Demo booking"
                  value={formatFunnelPct(funnel.demoBookingRate, 0)}
                  accent
                />
              </div>
            </div>
          )}

          {decision && (
            <p className="mt-3 text-xs text-slate-500">
              95% CI: {(decision.ci95[0] * 100).toFixed(1)}%–{(decision.ci95[1] * 100).toFixed(1)}%
              {decision.reason ? ` · ${decision.reason}` : ""}
            </p>
          )}

          {(judgment?.bestPersona || topObjections.length > 0) && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {judgment?.bestPersona && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Best persona fit
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {judgment.bestPersona.name} ·{" "}
                    {(judgment.bestPersona.conversionRate * 100).toFixed(0)}% conv (
                    {judgment.bestPersona.visits} visits)
                  </p>
                </div>
              )}
              {topObjections.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Top objection losses
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {topObjections.map(([id, count]) => (
                      <li key={id} className="text-xs text-slate-700">
                        {id.replace(/_/g, " ")}{" "}
                        <span className="text-slate-500">({count} lost)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent ? "border-schole-primary/30 bg-schole-primary/5" : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent ? "text-schole-primary" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

function FunnelStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-amber-800">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent ? "text-schole-primary" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}
