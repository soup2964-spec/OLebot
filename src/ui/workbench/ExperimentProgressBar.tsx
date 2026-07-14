"use client";

import type { ExperimentProgress } from "@/shared/schema/experiment-progress";

const STAGE_LABELS: Record<ExperimentProgress["stage"], string> = {
  starting: "Starting",
  readings: "Persona readings",
  simulating: "Simulating traffic",
  evaluating: "Behavior report",
  breeding: "Optimizer",
  saving: "Saving",
  done: "Complete",
  error: "Failed",
};

export function ExperimentProgressBar({
  progress,
  onDismiss,
}: {
  progress: ExperimentProgress | null;
  onDismiss?: () => void;
}) {
  if (!progress || progress.status === "idle") return null;

  const percent = progress.percent;
  const isError = progress.status === "error";
  const isComplete = progress.status === "complete";
  const canDismiss = Boolean(onDismiss) && (isError || isComplete);

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        isError
          ? "border-rose-200 bg-rose-50"
          : isComplete
            ? "border-emerald-200 bg-emerald-50"
            : "border-schole-primary/20 bg-schole-primary/5"
      }`}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className={`font-medium ${isError ? "text-rose-800" : "text-slate-900"}`}>
          {progress.label}
        </p>
        <div className="flex items-center gap-2">
          <p className={`tabular-nums ${isError ? "text-rose-700" : "text-slate-600"}`}>
            {percent}%
          </p>
          {canDismiss && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isError ? "bg-rose-500" : isComplete ? "bg-emerald-500" : "bg-schole-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${
            isError ? "bg-rose-100 text-rose-800" : "bg-white/80 text-slate-700"
          }`}
        >
          {STAGE_LABELS[progress.stage]}
        </span>
        {progress.totalGenerations > 0 && (
          <span className="text-slate-500">
            Gen {progress.generation + 1} / {progress.totalGenerations}
          </span>
        )}
        {progress.detail && (
          <span className={`${isError ? "text-rose-700" : "text-slate-500"}`}>
            {progress.detail}
          </span>
        )}
      </div>
    </div>
  );
}
