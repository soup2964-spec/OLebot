"use client";

import Link from "next/link";
import type { PageVariant } from "@/platform/schema/page";
import type { VariantJudgment } from "@/domains/judgment/criteria";
import { formatLiftPp } from "@/domains/judgment/criteria";
import { variantPageTitle } from "@/domains/variants/display-name";
import { DecisionChip } from "@/features/workbench/DecisionChip";

export function JudgmentPanel({
  variant,
  judgment,
  onViewBehavior,
}: {
  variant: PageVariant;
  judgment: VariantJudgment;
  onViewBehavior?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Judgment</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{variantPageTitle(variant)}</h3>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{variant.id}</p>
        </div>
        {judgment.status && <DecisionChip decision={{ status: judgment.status }} />}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <JudgmentStat
          label="Conversion rate"
          value={`${(judgment.conversionRate * 100).toFixed(1)}%`}
          tier="decision"
        />
        <JudgmentStat
          label="Lift vs baseline"
          value={formatLiftPp(judgment.liftPp)}
          tier="decision"
          highlight={judgment.liftPp !== null && judgment.liftPp > 0}
        />
        <JudgmentStat
          label="P(best)"
          value={judgment.pBest !== null ? `${(judgment.pBest * 100).toFixed(0)}%` : "—"}
          tier="decision"
        />
        <JudgmentStat
          label="Best persona fit"
          value={
            judgment.bestPersona
              ? `${judgment.bestPersona.name} (${(judgment.bestPersona.conversionRate * 100).toFixed(0)}%)`
              : "—"
          }
          tier="diagnostic"
        />
      </div>

      {judgment.guardrailBounceOk === false && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Bounce guardrail violated — promotion blocked until bounce rate is within baseline tolerance.
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top objection failures
          </h4>
          {judgment.topObjectionFailures.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {judgment.topObjectionFailures.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-slate-800">{o.label}</span>
                  <span className="text-slate-500">{o.count} lost visits</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No unresolved critical objections recorded.</p>
          )}
        </div>

        {judgment.decisionReason && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decision rationale
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{judgment.decisionReason}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {onViewBehavior && (
          <button
            type="button"
            onClick={onViewBehavior}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View simulated behavior →
          </button>
        )}
        <Link
          href={`/v/${variant.id}`}
          target="_blank"
          className="rounded-lg bg-schole-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-schole-primary-hover"
        >
          Open page
        </Link>
      </div>
    </section>
  );
}

function JudgmentStat({
  label,
  value,
  tier,
  highlight,
}: {
  label: string;
  value: string;
  tier: "decision" | "diagnostic";
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        tier === "decision" ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-white"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-sm font-bold ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-slate-400">
        {tier === "decision" ? "Tier 1 · decides" : "Tier 2 · explains"}
      </div>
    </div>
  );
}
