import { PageShell, EmptyRun } from "@/components/Nav";
import { loadRun, allVariants } from "@/lib/registry";

export default function ResultsPage() {
  const run = loadRun();
  const variants = allVariants();

  if (!run) {
    return (
      <PageShell
        active="/results"
        title="Which versions performed better"
        subtitle="Leaderboard, bandit allocation over time, and evaluator scorecards per generation."
      >
        <EmptyRun />
      </PageShell>
    );
  }

  return (
    <PageShell
      active="/results"
      title="Which versions performed better"
      subtitle="Leaderboard, bandit allocation over time, and evaluator scorecards per generation."
    >
      {run.generations.map((gen) => (
        <section key={gen.generation} className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-white">Generation {gen.generation}</h2>

          <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Fitness</th>
                  <th className="px-4 py-3">Conversion</th>
                  <th className="px-4 py-3">Scroll depth</th>
                  <th className="px-4 py-3">Bounce</th>
                  <th className="px-4 py-3">Visits</th>
                </tr>
              </thead>
              <tbody>
                {gen.metrics.map((m, i) => {
                  const v = variants.find((x) => x.id === m.variantId);
                  return (
                    <tr key={m.variantId} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{v?.name ?? m.variantId}</div>
                        <div className="font-mono text-xs text-slate-500">{m.variantId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${i === 0 ? "text-emerald-400" : "text-slate-300"}`}
                        >
                          {m.fitness.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {(m.conversionRate * 100).toFixed(1)}%
                        <span className="ml-1 text-xs text-slate-500">
                          ({m.conversions}/{m.visits})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {(m.avgScrollDepth * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {(m.bounceRate * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.visits}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold text-white">Bandit traffic allocation</h3>
              <p className="mt-1 text-xs text-slate-500">
                Thompson sampling share over visits (winners earn traffic as evidence accumulates).
              </p>
              <AllocationChart history={gen.allocationHistory} variantIds={gen.variantIds} />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="font-semibold text-white">Top conversion blockers</h3>
              <p className="mt-1 text-xs text-slate-500">
                Unresolved critical objections at exit, aggregated across variants.
              </p>
              <ul className="mt-4 space-y-2">
                {topObjectionFailures(gen.metrics).map(([o, c]) => (
                  <li key={o} className="flex justify-between text-sm">
                    <code className="text-rose-400">{o}</code>
                    <span className="text-slate-400">{c} lost visits</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-semibold text-white">Evaluator scorecards</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {gen.report.scorecards.map((sc) => (
                <div
                  key={sc.variantId}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="font-mono text-xs text-slate-500">{sc.variantId}</div>
                  <p className="mt-2 text-sm text-slate-300">{sc.summary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Score label="Value clarity" value={sc.valueClarity} />
                    <Score label="Credibility" value={sc.credibility} />
                    <Score label="CTA strength" value={sc.ctaStrength} />
                    <Score label="Audience fit" value={sc.audienceFit} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold text-white">Generation insights</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {gen.report.insights}
            </p>
            <ul className="mt-4 space-y-2">
              {gen.report.findings.map((f, i) => (
                <li key={i} className="text-sm text-slate-400">
                  <span className="text-slate-200">{f.finding}</span>
                  <span className="block text-xs text-slate-600">Evidence: {f.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <FitnessCurve run={run} variants={variants} />
    </PageShell>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-white">{value.toFixed(1)}/10</div>
    </div>
  );
}

function topObjectionFailures(metrics: { objectionFailures: Record<string, number> }[]) {
  const totals = new Map<string, number>();
  for (const m of metrics) {
    for (const [o, c] of Object.entries(m.objectionFailures)) {
      totals.set(o, (totals.get(o) ?? 0) + c);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function AllocationChart({
  history,
  variantIds,
}: {
  history: { afterVisits: number; shares: Record<string, number> }[];
  variantIds: string[];
}) {
  if (!history.length) return <p className="mt-4 text-sm text-slate-500">No allocation data.</p>;
  const last = history[history.length - 1];
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-violet-500"];

  return (
    <div className="mt-4 space-y-3">
      {variantIds.map((id, i) => (
        <div key={id}>
          <div className="flex justify-between text-xs">
            <span className="font-mono text-slate-400">{id}</span>
            <span className="text-slate-500">{((last.shares[id] ?? 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full ${colors[i % colors.length]}`}
              style={{ width: `${(last.shares[id] ?? 0) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FitnessCurve({
  run,
  variants,
}: {
  run: NonNullable<ReturnType<typeof loadRun>>;
  variants: ReturnType<typeof allVariants>;
}) {
  const bestPerGen = run.generations.map((g) => g.metrics[0]);
  const gen0Best = run.generations[0]?.metrics[0];
  const lastBest = bestPerGen[bestPerGen.length - 1];

  return (
    <section className="mt-10 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6">
      <h2 className="font-semibold text-white">Fitness over generations</h2>
      <div className="mt-4 flex items-end gap-4">
        {bestPerGen.map((m, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-12 rounded-t bg-indigo-500"
              style={{ height: `${Math.max(20, m.fitness * 2)}px` }}
            />
            <div className="mt-2 text-xs text-slate-500">Gen {i}</div>
            <div className="text-xs font-bold text-white">{m.fitness.toFixed(0)}</div>
          </div>
        ))}
      </div>
      {gen0Best && lastBest && (
        <p className="mt-4 text-sm text-slate-400">
          Best variant improved from{" "}
          <b className="text-white">{gen0Best.fitness.toFixed(1)}</b> (gen 0,{" "}
          {variants.find((v) => v.id === gen0Best.variantId)?.name}) to{" "}
          <b className="text-white">{lastBest.fitness.toFixed(1)}</b> (gen {run.generations.length - 1},{" "}
          {variants.find((v) => v.id === lastBest.variantId)?.name}).
        </p>
      )}
    </section>
  );
}
