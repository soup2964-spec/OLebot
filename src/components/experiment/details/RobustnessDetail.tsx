"use client";

import { useCallback, useEffect, useState } from "react";
import type { RobustnessSnapshot } from "@/lib/evolve/robustness";
import { variantPageTitle } from "@/lib/variants/display-name";
import { GENERATION_0 } from "@/config/variants";

function variantName(id: string): string {
  const v = GENERATION_0.find((x) => x.id === id);
  return v ? variantPageTitle(v) : id;
}

export function RobustnessDetail() {
  const [robustness, setRobustness] = useState<RobustnessSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/robustness", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setRobustness((await res.json()) as RobustnessSnapshot);
    } catch (err) {
      setRobustness(null);
      setError(err instanceof Error ? err.message : "Failed to load robustness data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !robustness) {
    return (
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <p className="text-sm text-slate-600">Loading gen-0 seed sensitivity…</p>
      </section>
    );
  }

  if (error || !robustness) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <p className="text-sm text-amber-900">
          {error ?? "Robustness snapshot unavailable."} Run{" "}
          <code className="rounded bg-white px-1">npm run prepare:robustness</code> after an
          experiment.
        </p>
      </section>
    );
  }

  const {
    nSeeds,
    visitsPerSeed,
    referenceSeed,
    referenceWinnerId,
    modalWinnerId,
    winnerStabilityPct,
    generatedAt,
    variants,
  } = robustness;
  const modalWins = variants.find((v) => v.variantId === modalWinnerId)?.timesRankedFirst ?? 0;
  const referenceMatchesModal = referenceWinnerId === modalWinnerId;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-900">
          Gen-0 seed sensitivity (offline)
        </h3>
        <p className="text-[10px] text-slate-500">
          Updated {new Date(generatedAt).toLocaleString()}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        Generation-0 only: we re-ran the same six starting pages across{" "}
        <strong>{nSeeds} RNG seeds</strong> ({visitsPerSeed.toLocaleString()} visits each) to see
        how rankings move with stochastic traffic. This does <strong>not</strong> replace the
        experiment winner on the Winners tab — it validates whether a single seed is trustworthy.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            This experiment&apos;s gen-0 winner
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {variantName(referenceWinnerId)}
          </p>
          <p className="font-mono text-xs text-slate-500">
            {referenceWinnerId} · seed {referenceSeed}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Most frequent #1 across seeds
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{variantName(modalWinnerId)}</p>
          <p className="text-xs text-slate-600">
            {modalWins} of {nSeeds} seeds ({winnerStabilityPct.toFixed(0)}%)
            {referenceMatchesModal ? " · matches this experiment" : " · differs from this experiment"}
          </p>
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
              const isReference = row.variantId === referenceWinnerId;
              const isModal = row.variantId === modalWinnerId;
              return (
                <tr
                  key={row.variantId}
                  className={`border-b border-slate-50 ${
                    isReference ? "bg-emerald-50/60" : isModal ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-slate-900">
                      {variantName(row.variantId)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                      {row.variantId}
                      {isReference ? " · experiment winner" : ""}
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
        to a live gen-0 run except the RNG seed. Only seeds vary; persona priors and page copy are
        held fixed. Bred offspring are not included.
      </p>
    </section>
  );
}
