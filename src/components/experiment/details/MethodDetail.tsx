import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import type { VariantJudgment } from "@/lib/judgment/criteria";
import { BEHAVIOR_GATES, BEHAVIOR_SIGNALS, GTM_CHALLENGE, POSTHOG_BEHAVIOR_WEIGHTS, POSTHOG_DIAGNOSTIC_EVENTS, FUNNEL_METRIC_DEFINITIONS } from "@/lib/judgment/behavior-criteria";
import { DECISION_THRESHOLDS, EVIDENCE_VISITS_PER_READING } from "@/lib/stats/bayes";
import { JudgmentPanel } from "@/components/experiment/JudgmentPanel";

const STEPS = [
  {
    title: "Send simulated visitors to each page",
    body: "Six buyer personas (L&D leaders, compliance, learners, etc.) visit each landing page variant. A visit only counts as a conversion if the page resolved that persona’s critical objections before they clicked the demo CTA.",
  },
  {
    title: "Score how each page performed",
    body: "Every variant gets a fitness score from 0–100. Four PostHog events drive the score: book_demo_click, scroll_depth, $pageleave, and section_viewed.",
  },
  {
    title: "Shift traffic toward better pages",
    body: "A Thompson sampling bandit routes more simulated visits to pages that convert well, so strong variants get more evidence without wasting traffic on clear losers.",
  },
  {
    title: "Decide promote, kill, or keep testing",
    body: "Bayesian analysis compares each page to the baseline and to other variants. Winners are promoted; persistent underperformers are killed; the rest stay in the pool.",
  },
] as const;

const OUTCOMES = [
  {
    label: "Promote",
    color: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rule: `≥ ${(DECISION_THRESHOLDS.promotePBest * 100).toFixed(0)}% probability this page is the best, expected loss is tiny, and bounce is within guardrails`,
    meaning: "This page becomes a candidate for production and can seed the next breeding round.",
  },
  {
    label: "Kill",
    color: "border-rose-200 bg-rose-50 text-rose-900",
    rule: `< ${(DECISION_THRESHOLDS.killPBeatBaseline * 100).toFixed(0)}% probability this page beats the baseline`,
    meaning: "Removed from the active pool so traffic and breeding focus on real contenders.",
  },
  {
    label: "Keep testing",
    color: "border-slate-200 bg-slate-50 text-slate-800",
    rule: "Does not meet promote or kill thresholds yet",
    meaning: "Still collecting evidence — not enough confidence to call a winner or loser.",
  },
] as const;

export function MethodDetail({
  run,
  experimentNumber,
  bredVariants = [],
  judgmentsByVariant = {},
}: {
  run: ExperimentRun | null;
  experimentNumber?: number;
  bredVariants?: PageVariant[];
  judgmentsByVariant?: Record<string, VariantJudgment>;
}) {
  const totalVisits =
    run?.generations.reduce((s, g) => s + (g.totalVisits ?? g.visits.length), 0) ?? 0;
  const judgedBred = bredVariants.filter((v) => judgmentsByVariant[v.id]);

  return (
    <div className="space-y-8">
      {experimentNumber != null && run && (
        <div className="rounded-xl border border-schole-primary/20 bg-schole-primary/5 px-4 py-3 text-sm text-slate-700">
          Results below are from <strong>Experiment {experimentNumber}</strong>
          {run.id && (
            <span className="text-slate-500">
              {" "}
              · <code className="text-xs">{run.id}</code>
            </span>
          )}
        </div>
      )}

      <section>
        <p className="text-sm leading-relaxed text-slate-600">
          We compare landing pages by simulating realistic buyer visits, scoring what each page
          achieves, and using statistics to decide which variants deserve more traffic — and which
          should be promoted or dropped.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
        <ol className="mt-4 space-y-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-schole-primary text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Fitness score breakdown</h3>
        <p className="mt-1 text-sm text-slate-600">
          Each page’s fitness score combines four behaviors. Weights come directly from the
          simulation code — they cannot drift from what actually runs.
        </p>
        <div className="mt-4 space-y-3">
          {BEHAVIOR_SIGNALS.map((signal) => (
            <div key={signal.id} className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-right text-lg font-bold tabular-nums text-schole-primary">
                {(signal.weight * 100).toFixed(0)}%
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-slate-900">{signal.label}</div>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {signal.posthogEvent}
                  </code>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{signal.measure}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Conversion is capped at a {(POSTHOG_BEHAVIOR_WEIGHTS.conversionCeiling * 100).toFixed(0)}% ceiling
          so one outlier visit cannot dominate the score.
        </p>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">Funnel metrics (Tier 2)</h3>
        <p className="mt-1 text-sm text-slate-600">
          Diagnostic rates that explain <em>why</em> conversion moved — not weighted in fitness.
          The optimizer uses these to decide whether to fix layout, CTA copy, or full-page narrative.
        </p>
        <div className="mt-4 space-y-3">
          {FUNNEL_METRIC_DEFINITIONS.map((f) => (
            <div key={f.id} className="rounded-lg border border-amber-100 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{f.label}</span>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {f.formula}
                </code>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{f.why}</p>
              <p className="mt-1 text-xs text-amber-800">
                <span className="font-medium">Copy lever:</span> {f.copyLever}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Phase 2 diagnostics ({GTM_CHALLENGE.name})
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Extra PostHog events for funnel analysis — not weighted in fitness. Every event carries{" "}
          <code className="rounded bg-white px-1 text-xs">challenge</code>,{" "}
          <code className="rounded bg-white px-1 text-xs">experiment_number</code>, and variant
          super-properties.
        </p>
        <div className="mt-4 space-y-3">
          {POSTHOG_DIAGNOSTIC_EVENTS.map((diag) => (
            <div key={diag.id} className="rounded-lg border border-violet-100 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{diag.label}</span>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {diag.event}
                </code>
                <span className="text-[10px] uppercase tracking-wide text-violet-600">
                  {diag.role}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{diag.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Three possible outcomes</h3>
        <div className="mt-4 grid gap-3">
          {OUTCOMES.map((outcome) => (
            <div
              key={outcome.label}
              className={`rounded-xl border p-4 ${outcome.color}`}
            >
              <div className="text-sm font-semibold">{outcome.label}</div>
              <p className="mt-1 text-xs font-medium opacity-90">{outcome.rule}</p>
              <p className="mt-2 text-xs leading-relaxed opacity-80">{outcome.meaning}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Hard rules on top of the score</h3>
        <ul className="mt-3 space-y-3">
          {BEHAVIOR_GATES.map((gate) => (
            <li key={gate.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <div className="text-sm font-medium text-slate-900">{gate.label}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{gate.rule}</p>
            </li>
          ))}
        </ul>
      </section>

      {run && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900">This experiment</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatChip label="Simulated visits" value={totalVisits.toLocaleString()} />
            <StatChip label="Generations" value={String(run.generations.length)} />
            <StatChip
              label="Evidence per reading"
              value={`≤ ${EVIDENCE_VISITS_PER_READING} visits`}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Statistical confidence is capped by the number of independent persona readings, not raw
            visit count — resampling adds realism but does not multiply evidence.
          </p>
        </section>
      )}

      {judgedBred.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Bred page results</h3>
          <p className="mt-1 text-sm text-slate-600">
            Promote/kill decisions for new pages bred in this experiment.
          </p>
          <div className="mt-4 space-y-4">
            {judgedBred.map((variant) => (
              <JudgmentPanel
                key={variant.id}
                variant={variant}
                judgment={judgmentsByVariant[variant.id]!}
              />
            ))}
          </div>
        </section>
      )}
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
