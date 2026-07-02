import Link from "next/link";
import { PERSONA_SET_V1 } from "@/config/personas";
import { ChallengeSection, schole, StatCard } from "@/components/schole-ui";
import { HomeLiveSection } from "@/components/HomeLiveSection";
import { ChallengeBehaviorPreview } from "@/components/challenge/ChallengeBehaviorPreview";
import { allVariants, loadRun, visitIndex } from "@/lib/registry";
import { staticReplicaPath } from "@/lib/replica/paths";

export function ChallengeDashboard() {
  const run = loadRun();
  const variants = allVariants();
  const gen0 = variants.filter((v) => v.generation === 0);
  const bred = variants.filter((v) => v.generation > 0);
  const lastGen = run?.generations[run.generations.length - 1];
  const totalVisits = run?.generations.reduce((s, g) => s + g.visits.length, 0) ?? 0;
  const latestMetrics = new Map(
    run?.generations.flatMap((g) => g.metrics.map((m) => [m.variantId, m] as const)) ?? []
  );

  return (
    <>
      {run && lastGen && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Simulated visits" value={totalVisits.toLocaleString()} />
          <StatCard
            label="Best gen-0 conversion"
            value={`${((run.generations[0]?.metrics[0]?.conversionRate ?? 0) * 100).toFixed(1)}%`}
            sub={run.generations[0]?.metrics[0]?.variantId}
          />
          <StatCard
            label={`Best gen-${lastGen.generation} conversion`}
            value={`${((lastGen.metrics[0]?.conversionRate ?? 0) * 100).toFixed(1)}%`}
            sub={lastGen.metrics[0]?.variantId}
            highlight
          />
        </div>
      )}

      {/* 1 · Initial landing page versions */}
      <ChallengeSection
        n="1"
        title="Initial landing page versions"
        subtitle="Six Generation-0 strategic bets on the exact schole.ai Framer layout. Each variant changes only targeted copy for a different ICP while keeping pixel-identical structure."
        href="/variants"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gen0.map((v) => {
            const src = staticReplicaPath(v.id);
            const m = latestMetrics.get(v.id);
            return (
              <div key={v.id} className={`${schole.card} overflow-hidden p-0`}>
                {src && (
                  <div className="relative h-44 overflow-hidden border-b border-slate-200 bg-slate-50">
                    <iframe
                      src={src}
                      title={v.name}
                      className="pointer-events-none h-[800px] w-[400%] origin-top-left scale-[0.25] border-0"
                      tabIndex={-1}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{v.name}</h3>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">
                    {v.id} · {v.strategy}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {v.thesis}
                  </p>
                  {m && (
                    <p className="mt-2 text-xs text-slate-500">
                      {(m.conversionRate * 100).toFixed(1)}% conv · fitness {m.fitness.toFixed(1)}
                    </p>
                  )}
                  <Link href={`/v/${v.id}`} target="_blank" className={`${schole.btnPrimary} mt-3`}>
                    View page
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </ChallengeSection>

      {/* 2 · How pages were compared */}
      <ChallengeSection
        n="2"
        title="How the pages were compared"
        subtitle="Evidence-grounded personas, objection-gated conversion, Thompson sampling traffic allocation, and Bayesian promote/kill gates with judge/actor separation."
        href="/experiment"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MethodCard
            title="Objection-gated conversion"
            body="Each persona carries critical objections from buyer research. A section resolves an objection only when its content substantively answers it. Conversion requires all critical objections cleared."
          />
          <MethodCard
            title="Thompson sampling"
            body="Simulated visits are routed by sampling Beta posteriors over conversion. Winners earn traffic as evidence accumulates; losers keep a small exploration share."
          />
          <MethodCard
            title="Bayesian decisions"
            body="Promote at P(best) ≥ 95% with expected loss ≤ 0.1pp. Kill at P(beat baseline) < 5%. Evaluator and optimizer agents are separate from visitor simulation."
          />
        </div>
        <div className={`${schole.cardMuted} mt-4`}>
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{PERSONA_SET_V1.personas.length} personas</strong>{" "}
            grounded in 2025–26 research (TalentLMS, G2, Rise Up, eLearning Industry). Fitness =
            60% conversion + 20% scroll + 10% inverse bounce + 10% sentiment.
          </p>
        </div>
      </ChallengeSection>

      {/* 3 · Simulated user behavior */}
      <ChallengeSection
        n="3"
        title="Simulated user behavior"
        subtitle="LLM agents walk each page section by section, deciding to read, skim, click, or bounce. Every visit emits an analytics-grade event stream plus verbalized reasoning."
        href="/behavior"
      >
        {run ? (
          <ChallengeBehaviorPreview
            initialIndex={visitIndex(run)}
            initialVariants={variants}
          />
        ) : (
          <p className={schole.muted}>Run npm run demo or npm run experiment to populate behavior data.</p>
        )}
      </ChallengeSection>

      {/* 4 · Which versions performed better */}
      <ChallengeSection
        n="4"
        title="Which versions performed better"
        subtitle="Bayesian leaderboard with credible intervals, P(best), expected loss, and promote/kill decisions per generation."
        href="/results"
      >
        {run && lastGen ? (
          <div className={`${schole.card} overflow-x-auto p-0`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-schole-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Fitness</th>
                  <th className="px-4 py-3">Conversion</th>
                  <th className="px-4 py-3">P(best)</th>
                </tr>
              </thead>
              <tbody>
                {lastGen.metrics.slice(0, 6).map((m, i) => {
                  const v = variants.find((x) => x.id === m.variantId);
                  const d = lastGen.decisions?.find((x) => x.variantId === m.variantId);
                  return (
                    <tr key={m.variantId} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v?.name ?? m.variantId}</div>
                        <div className="font-mono text-xs text-slate-500">{m.visits} visits</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${i === 0 ? "text-emerald-600" : "text-slate-700"}`}
                        >
                          {m.fitness.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {(m.conversionRate * 100).toFixed(1)}%
                        {d && (
                          <span className="ml-1 text-xs text-slate-500">
                            [{(d.ci95[0] * 100).toFixed(1)}–{(d.ci95[1] * 100).toFixed(1)}%]
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {d ? `${(d.pBest * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={schole.muted}>No results yet.</p>
        )}
      </ChallengeSection>

      {/* 5 · New generated variations */}
      <ChallengeSection
        n="5"
        title="New generated variations"
        subtitle="Offspring pages bred by the optimizer agent from behavioral evidence on the winning variant and cross-bred sections from strong parents."
        href="/evolution"
      >
        {bred.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {bred.map((v) => (
              <div key={v.id} className={schole.card}>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Generation {v.generation}
                </div>
                <h3 className="mt-1 font-semibold text-slate-900">{v.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{v.thesis}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/v/${v.id}`} target="_blank" className={schole.btnPrimary}>
                    View page
                  </Link>
                  {v.changelog && (
                    <Link href={`/evolution#${v.id}`} className={schole.btnSecondary}>
                      Changelog
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={schole.muted}>
            No bred variants yet. The demo run includes offspring if{" "}
            <code className={schole.code}>data/run.json</code> has generation &gt; 0 entries.
          </p>
        )}
      </ChallengeSection>

      {/* 6 · What changed and why */}
      <ChallengeSection
        n="6"
        title="What changed and why"
        subtitle="Every bred variant carries a changelog citing the simulated behavior and evaluator findings that motivated each copy change."
        href="/evolution"
      >
        {bred.some((v) => v.changelog?.length) ? (
          <ol className="space-y-4">
            {bred.flatMap((v) =>
              (v.changelog ?? []).slice(0, 2).map((c, i) => (
                <li key={`${v.id}-${i}`} className={schole.card}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <code className={schole.code}>{v.id}</code>
                    {c.sourceVariantId && <span>from {c.sourceVariantId}</span>}
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{c.what}</p>
                  <p className="mt-1 text-sm text-slate-600">{c.why}</p>
                  <p className="mt-2 text-xs text-schole-primary">Evidence: {c.evidence}</p>
                </li>
              ))
            )}
          </ol>
        ) : (
          <p className={schole.muted}>Changelog entries appear after the optimizer breeds new variants.</p>
        )}
      </ChallengeSection>

      <div className={`${schole.cardMuted} mt-4`}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          What this is and isn&apos;t
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Simulated personas are a <em>prior</em>, not ground truth. They pre-test messaging before
          real traffic arrives, and their priors are recalibrated from live PostHog, GTM, and Clarity
          traffic via <code className={schole.code}>data/calibration.json</code>.
        </p>
      </div>

      {run && lastGen && (
        <HomeLiveSection
          simulated={{
            conversionRate:
              lastGen.visits.filter((v) => v.converted).length / lastGen.visits.length,
            bounceRate:
              lastGen.visits.filter((v) => v.events.some((e) => e.type === "bounce")).length /
              lastGen.visits.length,
            avgScrollDepth:
              lastGen.visits.reduce((s, v) => s + v.scrollDepth, 0) / lastGen.visits.length,
          }}
        />
      )}
    </>
  );
}

function MethodCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={schole.card}>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
