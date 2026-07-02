import { GENERATION_0 } from "@/config/variants";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import type { ExperimentProgress } from "@/lib/schema/experiment-progress";
import type { ExperimentHistoryEntry } from "@/lib/loop/state";

export const BRED_GRID_SIZE = 6;

export function sortGen0Variants(variants: PageVariant[]): PageVariant[] {
  return [...variants]
    .filter((v) => v.generation === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, BRED_GRID_SIZE);
}

export function sortBredVariants(variants: PageVariant[]): PageVariant[] {
  return [...variants]
    .filter((v) => v.generation > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, BRED_GRID_SIZE);
}

/** Frozen original challengers — never use deploy-merged baseline for comparison. */
export function originalGen0Variants(): PageVariant[] {
  return sortGen0Variants(GENERATION_0.map((v) => structuredClone(v)));
}

export function bredVariantsFromRun(run: ExperimentRun | null): PageVariant[] {
  if (!run) return [];
  const byId = new Map(run.variants.map((v) => [v.id, v]));
  for (let i = run.generations.length - 1; i >= 0; i--) {
    const ids = run.generations[i].offspringIds ?? [];
    if (ids.length) {
      return sortBredVariants(
        ids.map((id) => byId.get(id)).filter((v): v is PageVariant => Boolean(v))
      );
    }
  }
  return sortBredVariants(run.variants);
}

export function maxExperimentIteration(
  experimentHistory: ExperimentHistoryEntry[],
  isRunning: boolean
): number {
  const completed = experimentHistory.reduce(
    (max, e) => Math.max(max, e.experimentNumber),
    0
  );
  return Math.max(1, completed + (isRunning ? 1 : 0));
}

export function comparisonSnapshotsForIteration(
  iteration: number,
  opts: {
    run: ExperimentRun | null;
    experimentHistory: ExperimentHistoryEntry[];
    progress: ExperimentProgress | null;
  }
): { previous: PageVariant[]; current: PageVariant[] } {
  const { run, experimentHistory, progress } = opts;
  const isRunning = progress?.status === "running";
  const historyEntry = experimentHistory.find((e) => e.experimentNumber === iteration);

  if (historyEntry) {
    return {
      previous:
        iteration === 1
          ? originalGen0Variants()
          : sortBredVariants(
              experimentHistory.find((e) => e.experimentNumber === iteration - 1)
                ?.currentVariants ?? []
            ),
      current: sortBredVariants(historyEntry.currentVariants),
    };
  }

  const activeExperiment = maxExperimentIteration(experimentHistory, isRunning);

  if (iteration === activeExperiment && isRunning) {
    return {
      previous:
        iteration === 1
          ? originalGen0Variants()
          : sortBredVariants(
              experimentHistory.find((e) => e.experimentNumber === iteration - 1)
                ?.currentVariants ?? []
            ),
      current: sortBredVariants(progress?.bredVariants ?? []),
    };
  }

  if (iteration === 1) {
    return { previous: originalGen0Variants(), current: [] };
  }

  return { previous: originalGen0Variants(), current: [] };
}
