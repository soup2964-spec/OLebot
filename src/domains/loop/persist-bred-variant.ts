import type { ExperimentProgress } from "@/platform/schema/experiment-progress";
import type { PageVariant } from "@/platform/schema/page";
import { originalGen0Variants, sortBredVariants } from "@/domains/comparison/snapshots";
import {
  invalidateLoopCache,
  loadLoopState,
  normalizeExperimentHistory,
  saveLoopState,
  type ExperimentHistoryEntry,
} from "./state";

function previousVariantsForExperiment(
  history: ExperimentHistoryEntry[],
  experimentNumber: number
): PageVariant[] {
  if (experimentNumber === 1) return originalGen0Variants();
  const prev = history.find((e) => e.experimentNumber === experimentNumber - 1);
  return sortBredVariants(prev?.currentVariants ?? []);
}

/** Append one fully bred page to loop_state so it survives timeout/dismiss. */
export async function persistBredVariantToHistory(opts: {
  experimentNumber: number;
  runId: string;
  variant: PageVariant;
}): Promise<void> {
  const state = await loadLoopState();
  const history = normalizeExperimentHistory(state.experimentHistory ?? []);
  const idx = history.findIndex((e) => e.experimentNumber === opts.experimentNumber);

  if (idx >= 0) {
    const entry = history[idx]!;
    if (entry.currentVariants.some((v) => v.id === opts.variant.id)) return;
    history[idx] = {
      ...entry,
      runId: opts.runId,
      partial: true,
      currentVariants: sortBredVariants([...entry.currentVariants, opts.variant]),
    };
  } else {
    history.push({
      experimentNumber: opts.experimentNumber,
      runId: opts.runId,
      previousVariants: previousVariantsForExperiment(history, opts.experimentNumber),
      currentVariants: sortBredVariants([opts.variant]),
      partial: true,
    });
  }

  await saveLoopState({
    ...state,
    experimentHistory: normalizeExperimentHistory(history),
    lastRunId: opts.runId,
  });
  invalidateLoopCache();
}

/** Belt-and-suspenders merge before progress is cleared to idle. */
export async function mergeProgressBredVariantsIntoHistory(
  progress: ExperimentProgress | null | undefined,
  runId?: string | null
): Promise<void> {
  if (!progress?.bredVariants?.length || progress.experimentNumber == null) return;

  const resolvedRunId =
    runId ??
    (progress.startedAt
      ? `run-partial-${progress.experimentNumber}-${progress.startedAt}`
      : `run-partial-${progress.experimentNumber}`);

  for (const variant of progress.bredVariants) {
    await persistBredVariantToHistory({
      experimentNumber: progress.experimentNumber,
      runId: resolvedRunId,
      variant,
    });
  }
}
