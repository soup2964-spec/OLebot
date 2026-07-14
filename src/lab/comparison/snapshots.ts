import { GENERATION_0 } from "@/config/variants";
import type { ExperimentRun } from "@/shared/schema/experiment";
import type { PageVariant } from "@/shared/schema/page";
import type { ExperimentProgress } from "@/shared/schema/experiment-progress";
import type { ExperimentHistoryEntry } from "@/lab/live-loop/state";

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
  runningExperimentNumber?: number | null
): number {
  const completed = experimentHistory.reduce(
    (max, e) => Math.max(max, e.experimentNumber),
    0
  );
  if (runningExperimentNumber && runningExperimentNumber > completed) {
    return runningExperimentNumber;
  }
  return Math.max(1, completed);
}

/** Experiment numbers for the left-menu selector (client-safe). */
export function experimentNumbersFromHistory(
  history: ExperimentHistoryEntry[],
  runningExperimentNumber?: number | null
): number[] {
  const nums = [...new Set(history.map((e) => e.experimentNumber))].sort((a, b) => a - b);
  if (runningExperimentNumber && !nums.includes(runningExperimentNumber)) {
    return [...nums, runningExperimentNumber];
  }
  return nums.length > 0 ? nums : [1];
}

function mergeCurrentVariants(
  historyEntry: ExperimentHistoryEntry | undefined,
  progress: ExperimentProgress | null | undefined,
  iteration: number
): PageVariant[] {
  const fromHistory = historyEntry ? sortBredVariants(historyEntry.currentVariants) : [];
  const progressActive =
    progress &&
    progress.experimentNumber === iteration &&
    (progress.status === "running" || progress.status === "error");
  const fromProgress = progressActive
    ? sortBredVariants(progress.bredVariants ?? [])
    : [];
  const byId = new Map<string, PageVariant>();
  for (const v of fromHistory) byId.set(v.id, v);
  for (const v of fromProgress) byId.set(v.id, v);
  return sortBredVariants([...byId.values()]);
}

function previousForIteration(
  iteration: number,
  experimentHistory: ExperimentHistoryEntry[]
): PageVariant[] {
  if (iteration === 1) return originalGen0Variants();
  return sortBredVariants(
    experimentHistory.find((e) => e.experimentNumber === iteration - 1)?.currentVariants ?? []
  );
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
  const isActiveProgress =
    progress?.status === "running" || progress?.status === "error";
  const historyEntry = experimentHistory.find((e) => e.experimentNumber === iteration);

  if (historyEntry) {
    return {
      previous: previousForIteration(iteration, experimentHistory),
      current: mergeCurrentVariants(historyEntry, progress, iteration),
    };
  }

  const activeExperiment = maxExperimentIteration(
    experimentHistory,
    isRunning ? progress?.experimentNumber : null
  );

  if (iteration === activeExperiment && isActiveProgress) {
    return {
      previous: previousForIteration(iteration, experimentHistory),
      current: mergeCurrentVariants(undefined, progress, iteration),
    };
  }

  const bredFromRun = bredVariantsFromRun(run);
  if (bredFromRun.length > 0) {
    return {
      previous: previousForIteration(iteration, experimentHistory),
      current: bredFromRun,
    };
  }

  if (iteration === 1) {
    return { previous: originalGen0Variants(), current: [] };
  }

  return { previous: originalGen0Variants(), current: [] };
}
