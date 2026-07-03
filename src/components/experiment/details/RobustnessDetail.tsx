"use client";

import robustnessJson from "@/config/robustness.json";
import type { RobustnessSnapshot } from "@/lib/evolve/robustness";
import { variantPageTitle } from "@/lib/variants/display-name";
import { GENERATION_0 } from "@/config/variants";

const robustness = robustnessJson as RobustnessSnapshot;

function variantName(id: string): string {
  const v = GENERATION_0.find((x) => x.id === id);
  return v ? variantPageTitle(v) : id;
}

export function RobustnessDetail() {
  const { nSeeds, visitsPerSeed, modalWinnerId, winnerStabilityPct, variants } = robustness;
  const modalWins = variants.find((v) => v.variantId === modalWinnerId)?.timesRankedFirst ?? 0;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-900">
        Seed robustness check
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        We re-ran generation-0 evaluation across{" "}
        <strong>{nSeeds} independent RNG seeds</strong> ({visitsPerSeed.toLocaleString()} visits
        each). Rankings shift with stochastic traffic, but the leading strategy should stay
        stable — this is not a single deterministic artifact.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Modal winner
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{variantName(modalWinnerId)}</p>
          <p className="font-mono text-xs text-slate-500">{modalWinnerId}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Winner stability
          </p>
          <p className="mt-1 text-lg font-semibold text-indigo-900">
            {modalWins} of {nSeeds} seeds ({winnerStabilityPct.toFixed(0)}%)
          </p>
          <p className="text-xs text-slate-500">Same variant ranked #1 across seeds</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-indigo-100 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Variant</th>
              <th className="px-3 py-2">Mean rank</th>
              <th className="px-3 py-2">#1 finishes</th>
              <th className="px-3 py-2">Mean fitness</th>
              <th className="px-3 py-2">Conv range</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((row) => {
              const isModal = row.variantId === modalWinnerId;
              return (
                <tr
                  key={row.variantId}
                  className={`border-b border-slate-50 ${isModal ? "bg-indigo-50/50" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-slate-900">
                      {variantName(row.variantId)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                      {row.variantId}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {row.meanRank.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {row.timesRankedFirst}/{nSeeds}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {row.meanFitness.toFixed(1)}
                    <span className="text-slate-400"> ± {row.stdFitness.toFixed(1)}</span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-800">
                    {(row.minConv * 100).toFixed(1)}%–{(row.maxConv * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Method: heuristic persona readings + Thompson bandit traffic + Bayesian decisions, identical
        to a live gen-0 run except the RNG seed. Only the seed varies; persona priors and page copy
        are held fixed.
      </p>
    </section>
  );
}
