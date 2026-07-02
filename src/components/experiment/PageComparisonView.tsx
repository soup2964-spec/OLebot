"use client";

import type { PageVariant } from "@/lib/schema/page";
import type { VariantJudgment } from "@/lib/judgment/criteria";
import { NineVariantGrid } from "@/components/experiment/PageTile";
import { JudgmentPanel } from "@/components/experiment/JudgmentPanel";

export type ExperimentSnapshot = {
  experimentNumber: number;
  variants: PageVariant[];
  judgmentsByVariant: Record<string, VariantJudgment>;
};

function sortGridVariants(variants: PageVariant[]) {
  return [...variants]
    .filter((v) => v.generation === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 9);
}

function ComparisonSection({
  label,
  experimentNumber,
  snapshot,
  showJudgment,
  selectedVariantId,
  onSelectVariant,
  emptyMessage,
}: {
  label: string;
  experimentNumber: number;
  snapshot: ExperimentSnapshot | null;
  showJudgment?: boolean;
  selectedVariantId?: string | null;
  onSelectVariant?: (variantId: string) => void;
  emptyMessage?: string;
}) {
  const gridVariants = snapshot ? sortGridVariants(snapshot.variants) : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Experiment {experimentNumber}</h2>
      </div>

      {gridVariants.length > 0 ? (
        <NineVariantGrid
          variants={gridVariants}
          judgmentsByVariant={showJudgment ? snapshot?.judgmentsByVariant : undefined}
          selectedVariantId={selectedVariantId}
          onSelectVariant={onSelectVariant}
          compact
          uniformSize
        />
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 gap-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/50"
            >
              <div className="aspect-[4/3] w-full shrink-0" />
              <div className="flex min-h-[7.75rem] flex-1 items-center justify-center border-t border-slate-100 px-2 text-xs text-slate-400">
                {i === 4 ? (emptyMessage ?? "No data yet") : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PageComparisonView({
  experimentNumber,
  previousSnapshot,
  currentSnapshot,
  selectedVariantId,
  onSelectVariant,
  onViewBehavior,
}: {
  experimentNumber: number;
  previousSnapshot: ExperimentSnapshot | null;
  currentSnapshot: ExperimentSnapshot | null;
  selectedVariantId?: string | null;
  onSelectVariant?: (variantId: string) => void;
  onViewBehavior?: (variantId: string) => void;
}) {
  const previousNumber = Math.max(1, experimentNumber - 1);
  const selectedVariant = currentSnapshot?.variants.find((v) => v.id === selectedVariantId);
  const selectedJudgment =
    selectedVariantId && currentSnapshot?.judgmentsByVariant[selectedVariantId];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ComparisonSection
          label="Previous experiment"
          experimentNumber={previousNumber}
          snapshot={previousSnapshot}
          selectedVariantId={selectedVariantId}
          onSelectVariant={onSelectVariant}
          emptyMessage="No previous experiment — this is Experiment 1."
        />

        <ComparisonSection
          label="Current experiment results"
          experimentNumber={experimentNumber}
          snapshot={currentSnapshot}
          showJudgment
          selectedVariantId={selectedVariantId}
          onSelectVariant={onSelectVariant}
        />
      </div>

      {selectedVariant && selectedJudgment && (
        <JudgmentPanel
          variant={selectedVariant}
          judgment={selectedJudgment}
          onViewBehavior={
            onViewBehavior ? () => onViewBehavior(selectedVariant.id) : undefined
          }
        />
      )}
    </div>
  );
}

export function snapshotFromRun(
  experimentNumber: number,
  variants: PageVariant[],
  judgmentsByVariant: Record<string, VariantJudgment> = {}
): ExperimentSnapshot {
  return { experimentNumber, variants, judgmentsByVariant };
}
