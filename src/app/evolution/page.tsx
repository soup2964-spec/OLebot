import Link from "next/link";
import { PageShell, EmptyRun } from "@/components/Nav";
import { loadRun, allVariants } from "@/lib/registry";

export default function EvolutionPage() {
  const run = loadRun();
  const variants = allVariants();

  if (!run) {
    return (
      <PageShell
        active="/evolution"
        title="New variants & what changed"
        subtitle="Offspring pages bred by the optimizer agent, with evidence-backed changelogs."
      >
        <EmptyRun />
      </PageShell>
    );
  }

  const generated = variants.filter((v) => v.generation > 0);

  return (
    <PageShell
      active="/evolution"
      title="New variants & what changed"
      subtitle="Offspring pages bred by the optimizer agent, with evidence-backed changelogs explaining every change and the simulated behavior that motivated it."
    >
      {generated.length === 0 ? (
        <p className="text-slate-400">No generated variants yet. Run the experiment to breed offspring.</p>
      ) : (
        generated.map((v) => (
          <article
            key={v.id}
            id={v.id}
            className="mb-10 scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-400">
                  Generation {v.generation} · bred variant
                </div>
                <h2 className="mt-1 text-xl font-bold text-white">{v.name}</h2>
                <div className="mt-1 font-mono text-xs text-slate-500">{v.id}</div>
              </div>
              <Link
                href={`/v/${v.id}`}
                target="_blank"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                View live page
              </Link>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">{v.thesis}</p>

            {v.parentIds.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                Lineage:{" "}
                {v.parentIds.map((p) => (
                  <code key={p} className="mr-2 rounded bg-slate-800 px-1.5 py-0.5">
                    {p}
                  </code>
                ))}
              </div>
            )}

            {v.changelog && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  What changed and why
                </h3>
                <ol className="mt-3 space-y-4">
                  {v.changelog.map((c, i) => (
                    <li key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="font-medium text-white">{c.what}</div>
                      <p className="mt-1 text-sm text-slate-400">{c.why}</p>
                      <p className="mt-2 text-xs text-indigo-400/90">
                        Evidence: {c.evidence}
                        {c.sourceVariantId && (
                          <span className="ml-2 text-slate-600">
                            (from {c.sourceVariantId})
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </article>
        ))
      )}

      <LineageTree variants={variants} />
    </PageShell>
  );
}

function LineageTree({ variants }: { variants: ReturnType<typeof allVariants> }) {
  const gen0 = variants.filter((v) => v.generation === 0);
  const bred = variants.filter((v) => v.generation > 0);

  return (
    <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="font-semibold text-white">Evolution tree</h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs uppercase text-slate-500">Generation 0 (seed)</div>
          <ul className="space-y-1 text-sm text-slate-400">
            {gen0.map((v) => (
              <li key={v.id}>
                <code className="text-slate-300">{v.id}</code> · {v.strategy}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs uppercase text-slate-500">Bred variants</div>
          <ul className="space-y-2 text-sm">
            {bred.map((v) => (
              <li key={v.id} className="text-slate-400">
                <code className="text-emerald-400">{v.id}</code>
                <span className="text-slate-600"> ← </span>
                {v.parentIds.join(" + ")}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
