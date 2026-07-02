"use client";

import { CRITERIA } from "@/config/criteria";
import type { DetailTab } from "./ExperimentDetailPanel";

export type WorkbenchView = DetailTab | "control" | "versions";

const MENU_ITEMS: { id: WorkbenchView; criterionId: string }[] = [
  { id: "control", criterionId: "0" },
  { id: "versions", criterionId: "1" },
  { id: "method", criterionId: "2" },
  { id: "behavior", criterionId: "3" },
  { id: "winners", criterionId: "4" },
  { id: "new", criterionId: "5" },
  { id: "changelog", criterionId: "6" },
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
  maxIteration,
  onPrevIteration,
  onNextIteration,
}: {
  activeView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  iteration: number;
  maxIteration: number;
  onPrevIteration: () => void;
  onNextIteration: () => void;
}) {
  return (
    <nav
      className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white py-4 lg:w-48"
      aria-label="Experiment sections"
    >
      <div className="mx-2 mb-4 flex items-center justify-between gap-1 border-b border-slate-100 pb-4">
        <NavArrow
          direction="left"
          disabled={iteration <= 1}
          onClick={onPrevIteration}
          label="Previous experiment"
        />
        <span className="text-center text-xs font-semibold text-slate-900">
          Experiment {iteration}
        </span>
        <NavArrow
          direction="right"
          disabled={iteration >= maxIteration}
          onClick={onNextIteration}
          label="Next experiment"
        />
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
