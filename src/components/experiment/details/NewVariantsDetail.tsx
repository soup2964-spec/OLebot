"use client";

import { useMemo, useState } from "react";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import { NineVariantGrid } from "@/components/experiment/PageTile";

const NEW_VARIANT_GRID_SIZE = 6;

function latestBredVariants(
  run: ExperimentRun | null,
  variants: PageVariant[]
): PageVariant[] {
  const byId = new Map(variants.map((v) => [v.id, v]));

  if (run?.generations.length) {
    for (let i = run.generations.length - 1; i >= 0; i--) {
      const ids = run.generations[i].offspringIds ?? [];
      if (ids.length) {
        return ids
          .map((id) => byId.get(id))
          .filter((v): v is PageVariant => Boolean(v))
          .slice(0, NEW_VARIANT_GRID_SIZE);
      }
    }
  }

  return variants
    .filter((v) => v.generation > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, NEW_VARIANT_GRID_SIZE);
}

export function NewVariantsDetail({
  run,
  variants,
}: {
  run: ExperimentRun | null;
  variants: PageVariant[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bred = useMemo(() => latestBredVariants(run, variants), [run, variants]);
  const selected = bred.find((v) => v.id === selectedId) ?? bred[0] ?? null;

  if (bred.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No bred variants yet — the optimizer breeds new pages after Generation 0 completes.
      </p>
    );
  }

  const genLabel = selected?.generation ?? bred[0]?.generation;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Optimizer output
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Generation {genLabel} · {bred.length} new variant{bred.length === 1 ? "" : "s"}
          </h3>
        </div>

        <NineVariantGrid
          variants={bred}
          selectedVariantId={selected?.id}
          onSelectVariant={setSelectedId}
          compact
          uniformSize
        />
      </section>

      {selected && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Selected · {selected.id}
          </p>
          <h4 className="mt-1 text-base font-semibold text-slate-900">{selected.name}</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{selected.thesis}</p>
          {selected.parentIds.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Parents: {selected.parentIds.join(" + ")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
