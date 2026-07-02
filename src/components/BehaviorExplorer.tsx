"use client";

import { useCallback, useEffect, useState } from "react";
import type { VisitIndex } from "@/lib/registry";
import type { Visit } from "@/lib/schema/events";
import type { PageVariant } from "@/lib/schema/page";
import { ReplayTheater } from "@/components/ReplayTheater";
import { PERSONA_SET_V1 } from "@/config/personas";

export function BehaviorExplorer({
  index,
  variants,
}: {
  index: VisitIndex;
  variants: PageVariant[];
}) {
  const [genIdx, setGenIdx] = useState(index.length - 1);
  const [variantId, setVariantId] = useState(index[genIdx]?.variantIds[0] ?? "");
  const [visitId, setVisitId] = useState("");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gen = index[genIdx];
  const filtered = gen?.visits.filter((v) => v.variantId === variantId) ?? [];
  const selectedMeta = filtered.find((v) => v.id === visitId) ?? filtered[0];
  const variant = variants.find((v) => v.id === variantId);

  const fetchVisit = useCallback(
    async (id: string, generation: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/visits/${encodeURIComponent(id)}?gen=${generation}`);
        if (!res.ok) throw new Error("Could not load visit trace");
        setVisit((await res.json()) as Visit);
      } catch (e) {
        setVisit(null);
        setError(e instanceof Error ? e.message : "Failed to load visit");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedMeta) {
      setVisitId(selectedMeta.id);
      fetchVisit(selectedMeta.id, gen.generation);
    }
  }, [selectedMeta?.id, gen.generation, fetchVisit]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Pick a visit to replay</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={genIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setGenIdx(idx);
              setVariantId(index[idx].variantIds[0]);
              setVisitId("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {index.map((g, i) => (
              <option key={g.generation} value={i}>
                Generation {g.generation}
              </option>
            ))}
          </select>
          <select
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setVisitId("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {gen.variantIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            value={selectedMeta?.id ?? ""}
            onChange={(e) => setVisitId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {filtered.slice(0, 80).map((v) => {
              const p = PERSONA_SET_V1.personas.find((x) => x.id === v.personaId);
              return (
                <option key={v.id} value={v.id}>
                  {p?.name ?? v.personaId} · {v.converted ? "converted" : "lost"}
                </option>
              );
            })}
          </select>
        </div>
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </section>

      {loading && <p className="text-sm text-slate-500">Loading visit trace…</p>}

      {visit && variant && !loading ? (
        <ReplayTheater visit={visit} variant={variant} />
      ) : !loading && !visit ? (
        <p className="text-slate-500">No visits for this variant.</p>
      ) : null}

      <HeatmapGrid gen={gen} variants={variants} />
    </div>
  );
}

function HeatmapGrid({
  gen,
  variants,
}: {
  gen: VisitIndex[number];
  variants: PageVariant[];
}) {
  const top = gen.metrics.slice(0, 3);
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Section engagement heatmap</h2>
      <p className="mb-4 text-sm text-slate-400">
        Per-section read rate, average dwell, sentiment, and exit rate across the top variants
        in this generation.
      </p>
      <div className="space-y-6">
        {top.map((m) => {
          const v = variants.find((x) => x.id === m.variantId)!;
          return (
            <div key={m.variantId} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{v?.name ?? m.variantId}</h3>
                <span className="text-xs text-slate-500">
                  fitness {m.fitness.toFixed(1)} · {(m.conversionRate * 100).toFixed(1)}% conv
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="pb-2 pr-4">Section</th>
                      <th className="pb-2 pr-4">Read rate</th>
                      <th className="pb-2 pr-4">Avg dwell</th>
                      <th className="pb-2 pr-4">Sentiment</th>
                      <th className="pb-2">Exit rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.perSection.map((ps) => {
                      const sec = v?.sections.find((s) => s.id === ps.sectionId);
                      const readRate = ps.views ? ps.reads / ps.views : 0;
                      return (
                        <tr key={ps.sectionId} className="border-t border-slate-200">
                          <td className="py-2 pr-4 text-slate-700">
                            {sec?.headline.slice(0, 36) ?? ps.sectionId}
                          </td>
                          <td className="py-2 pr-4">
                            <Bar value={readRate} color="bg-schole-primary" />
                          </td>
                          <td className="py-2 pr-4 text-slate-400">
                            {(ps.avgDwellMs / 1000).toFixed(1)}s
                          </td>
                          <td className="py-2 pr-4">
                            <Bar value={(ps.avgSentiment + 2) / 4} color="bg-emerald-500" />
                          </td>
                          <td className="py-2">
                            <Bar value={ps.exitRate} color="bg-rose-500" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="text-slate-500">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}
