import Link from "next/link";
import { PageShell } from "@/components/Nav";
import { allVariants, loadRun } from "@/lib/registry";

export default function VariantsPage() {
  const variants = allVariants();
  const run = loadRun();
  const byGen = new Map<number, typeof variants>();
  for (const v of variants) {
    byGen.set(v.generation, [...(byGen.get(v.generation) ?? []), v]);
  }
  const latestMetrics = new Map(
    run?.generations.flatMap((g) => g.metrics.map((m) => [m.variantId, m] as const)) ?? []
  );

  return (
    <PageShell
      active="/variants"
      title="The landing pages"
      subtitle="Every variant is a real rendered page making a distinct strategic bet. Generation 0 was hand-designed; later generations were bred by the optimizer agent from behavioral evidence."
    >
      {[...byGen.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([gen, vs]) => (
          <section key={gen} className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-white">
              Generation {gen}
              {gen > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  bred by the optimizer
                </span>
              )}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {vs.map((v) => {
                const m = latestMetrics.get(v.id);
                return (
                  <div
                    key={v.id}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{v.name}</h3>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">
                          {v.id} · {v.sections.length} sections · CTA: {v.ctaGoal}
                        </div>
                      </div>
                      <span className="flex-none rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                        {v.strategy}
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{v.thesis}</p>
                    {m && (
                      <div className="mt-3 flex gap-4 text-xs text-slate-500">
                        <span>
                          conv{" "}
                          <b className="text-slate-300">{(m.conversionRate * 100).toFixed(1)}%</b>
                        </span>
                        <span>
                          fitness <b className="text-slate-300">{m.fitness.toFixed(1)}</b>
                        </span>
                        <span>
                          visits <b className="text-slate-300">{m.visits}</b>
                        </span>
                      </div>
                    )}
                    {v.parentIds.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        parents:{" "}
                        {v.parentIds.map((p) => (
                          <code key={p} className="mr-1 rounded bg-slate-800 px-1">
                            {p}
                          </code>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/v/${v.id}`}
                        target="_blank"
                        className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        View live page
                      </Link>
                      {v.changelog && (
                        <Link
                          href={`/evolution#${v.id}`}
                          className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
                        >
                          What changed & why
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
    </PageShell>
  );
}
