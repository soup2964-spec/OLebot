import { PERSONA_SET_V1 } from "@/config/personas";
import type { ExperimentRun } from "@/lib/schema/experiment";
import { JUDGMENT_CRITERIA } from "@/lib/judgment/criteria";
import { DECISION_THRESHOLDS, EVIDENCE_VISITS_PER_READING } from "@/lib/stats/bayes";

export function MethodDetail({
  run,
  experimentNumber,
}: {
  run: ExperimentRun | null;
  experimentNumber?: number;
}) {
  const totalVisits =
    run?.generations.reduce((s, g) => s + (g.totalVisits ?? g.visits.length), 0) ?? 0;
  const generationCount = run?.generations.length ?? 0;
  const offspringCount =
    run?.generations.reduce((s, g) => s + (g.offspringIds?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      {experimentNumber != null && run && (
        <div className="rounded-xl border border-schole-primary/20 bg-schole-primary/5 px-4 py-3 text-sm text-slate-700">
          Showing results for <strong>Experiment {experimentNumber}</strong>
          {run.id && (
            <span className="text-slate-500">
              {" "}
              · run <code className="text-xs">{run.id}</code>
            </span>
          )}
        </div>
      )}
      <p className="text-sm text-slate-600">
        Six objection-gated LLM personas visit landing pages. Thompson sampling allocates traffic.
        Bayesian analysis promotes winners using the judgment criteria below, then the optimizer
        breeds new variants from the evidence.
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700">
        <span>Personas (6)</span>
        <span className="text-slate-300">→</span>
        <span>Simulated visits</span>
        <span className="text-slate-300">→</span>
        <span>Thompson bandit</span>
        <span className="text-slate-300">→</span>
        <span>Judgment criteria</span>
        <span className="text-slate-300">→</span>
        <span>Bayesian promote/kill</span>
        <span className="text-slate-300">→</span>
        <span>Optimizer breeds</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatChip label="Simulated visits" value={totalVisits.toLocaleString()} />
        <StatChip label="Generations" value={String(generationCount)} />
        <StatChip label="Bred pages" value={String(offspringCount)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatChip label="Personas" value="6" />
        <StatChip label="Allocation" value="Thompson sampling" />
        <StatChip label="Evidence cap" value={`${EVIDENCE_VISITS_PER_READING} visits/reading`} />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Judgment criteria
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Every page comparison uses a two-tier framework. Tier 1 metrics decide promote/kill.
          Tier 2 metrics explain why — they never override a statistical decision.
        </p>

        <div className="mt-3 space-y-3">
          <CriteriaGroup
            title="Tier 1 — Decision"
            subtitle="What picks a winner"
            items={JUDGMENT_CRITERIA.tier1}
          />
          <CriteriaGroup
            title="Tier 2 — Diagnosis"
            subtitle="Why it won or lost"
            items={JUDGMENT_CRITERIA.tier2}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Decision order</h3>
        <ol className="mt-3 space-y-2">
          {JUDGMENT_CRITERIA.decisionOrder.map((step, i) => (
            <li key={step} className="flex gap-2 text-xs leading-relaxed text-slate-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ThresholdChip
            label="Promote threshold"
            value={`P(best) ≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}%`}
          />
          <ThresholdChip
            label="Kill threshold"
            value={`P(beats baseline) < ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}%`}
          />
          <ThresholdChip
            label="Bounce guardrail"
            value={`≤ baseline × ${DECISION_THRESHOLDS.guardrailBounceRelMax}`}
          />
          <ThresholdChip label="Prior" value="Beta(3, 97) — ~3% B2B demo-booking benchmark" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MethodCard
          title="Personas + objections"
          body="Six buyers from 2025–26 research, each with objections that must be resolved to convert."
        />
        <MethodCard
          title="Traffic allocation"
          body="Thompson sampling routes visits using Beta posteriors — winners earn traffic over time."
        />
        <MethodCard
          title="Why not t-tests"
          body="Adaptive allocation violates fixed-split assumptions. Posterior P(best) is an always-valid stopping rule that supports continuous evaluation."
        />
        <MethodCard
          title="Confidence is capped by evidence"
          body={`Thousands of simulated visits are resampled from a handful of independent persona readings — that reading count, not the visit count, bounds statistical confidence. Each reading is worth at most ${EVIDENCE_VISITS_PER_READING} effective visits in the posterior, so promote/kill decisions can't overstate certainty from resampling alone.`}
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Personas</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PERSONA_SET_V1.personas.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex justify-between text-sm font-medium text-slate-900">
                <span>{p.name}</span>
                <span className="text-xs text-slate-500">{(p.trafficWeight * 100).toFixed(0)}%</span>
              </div>
              <p className="text-[11px] text-slate-500">{p.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function MethodCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function CriteriaGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: readonly { label: string; role: string; description: string }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {subtitle}
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{item.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-schole-primary">
                {item.role}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThresholdChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-800">{value}</div>
    </div>
  );
}
