import type { ExperimentProgress } from "@/platform/schema/experiment-progress";

/** No progress tick for this long while still "running" → treat as stale. */
const STALE_SAVING_MS = 3 * 60 * 1000;
const STALE_BREEDING_MS = 12 * 60 * 1000;
const STALE_RUNNING_MS = 25 * 60 * 1000;

export function progressAgeMs(p: ExperimentProgress): number {
  if (!p.updatedAt) return Infinity;
  return Date.now() - new Date(p.updatedAt).getTime();
}

export function isProgressStale(p: ExperimentProgress | null | undefined): boolean {
  if (!p || p.status !== "running") return false;
  const age = progressAgeMs(p);
  if (p.stage === "saving") return age > STALE_SAVING_MS;
  if (p.stage === "breeding") return age > STALE_BREEDING_MS;
  return age > STALE_RUNNING_MS;
}

export function isProgressActivelyRunning(p: ExperimentProgress | null | undefined): boolean {
  return p?.status === "running" && !isProgressStale(p);
}

/** Convert orphaned "running" progress (server restart, timeout) into a recoverable error. */
export function reconcileExperimentProgress(p: ExperimentProgress): ExperimentProgress {
  if (!isProgressStale(p)) return p;
  return {
    ...p,
    status: "error",
    stage: "error",
    label: "Experiment interrupted",
    detail:
      "Progress stopped updating — the run may have timed out or the dev server restarted. You can dismiss and run again.",
    error: "Stale experiment progress (no updates)",
    updatedAt: new Date().toISOString(),
  };
}
