"use client";

import { CRITERIA } from "@/config/criteria";
import type { DetailTab } from "./ExperimentDetailPanel";

export type WorkbenchView = DetailTab | "control" | "versions";

const MENU_ITEMS: { id: WorkbenchView; criterionId: string }[] = [
  { id: "control", criterionId: "0" },
  { id: "versions", criterionId: "1" },
  { id: "method", criterionId: "2" },
  { id: "personas", criterionId: "3" },
  { id: "behavior", criterionId: "4" },
  { id: "winners", criterionId: "5" },
  { id: "new", criterionId: "6" },
  { id: "changelog", criterionId: "7" },
];

function NavArrow({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        {direction === "left" ? (
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
            clipRule="evenodd"
          />
        )}
      </svg>
    </button>
  );
}

export function ExperimentSideMenu({
  activeView,
  onViewChange,
  iteration,
  experimentOptions,
  runningExperimentNumber,
  partialExperimentNumbers,
  onPrevIteration,
  onNextIteration,
  onSelectIteration,
}: {
  activeView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  iteration: number;
  experimentOptions: number[];
  runningExperimentNumber?: number | null;
  partialExperimentNumbers?: Set<number>;
  onPrevIteration: () => void;
  onNextIteration: () => void;
  onSelectIteration: (n: number) => void;
}) {
  const maxIteration = experimentOptions[experimentOptions.length - 1] ?? 1;
  const currentIndex = experimentOptions.indexOf(iteration);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < experimentOptions.length - 1;

  return (
    <nav
      className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white py-4 lg:w-48"
      aria-label="Experiment sections"
    >
      <div className="mx-2 mb-4 space-y-2 border-b border-slate-100 pb-4">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Experiment run
        </p>
        <div className="flex items-center gap-1">
          <NavArrow
            direction="left"
            disabled={!canGoPrev}
            onClick={onPrevIteration}
            label={canGoPrev ? "Previous experiment" : "Already on the first experiment"}
          />
          <select
            value={iteration}
            onChange={(e) => onSelectIteration(Number(e.target.value))}
            aria-label="Select experiment run"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-schole-primary focus:outline-none focus:ring-2 focus:ring-schole-primary/20"
          >
            {experimentOptions.map((n) => (
              <option key={n} value={n}>
                Experiment {n}
                {runningExperimentNumber === n ? " (running)" : ""}
                {runningExperimentNumber !== n && partialExperimentNumbers?.has(n)
                  ? " (partial)"
                  : ""}
              </option>
            ))}
          </select>
          <NavArrow
            direction="right"
            disabled={!canGoNext}
            onClick={onNextIteration}
            label={
              canGoNext
                ? "Next experiment"
                : experimentOptions.length <= 1
                  ? "Run another experiment to add a menu option"
                  : "Already on the latest experiment"
            }
          />
        </div>
        {experimentOptions.length > 1 && (
          <p className="px-1 text-[10px] text-slate-500">
            {iteration} of {maxIteration} · all sections below follow this run
          </p>
        )}
      </div>

      {MENU_ITEMS.map(({ id, criterionId }) => {
        const meta = CRITERIA.find((c) => c.id === criterionId);
        const active = activeView === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            title={meta?.title}
            className={`group relative mx-2 flex items-center rounded-lg px-3 py-2.5 text-left transition ${
              active
                ? "bg-schole-primary/10 text-schole-primary"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-schole-primary" />
            )}
            <span className="text-sm font-semibold leading-tight">{meta?.short}</span>
          </button>
        );
      })}
    </nav>
  );
}

