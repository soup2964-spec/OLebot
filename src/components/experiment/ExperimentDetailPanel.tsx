"use client";

import { CRITERIA } from "@/config/criteria";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { VisitIndex } from "@/lib/registry";
import type { PageVariant } from "@/lib/schema/page";
import { BehaviorReport } from "./details/BehaviorReport";
import { ChangelogDetail } from "./details/ChangelogDetail";
import { MethodDetail } from "./details/MethodDetail";
import { NewVariantsDetail } from "./details/NewVariantsDetail";
import { VersionsDetail } from "./details/VersionsDetail";
import { WinnersDetail } from "./details/WinnersDetail";
import type { WorkbenchView } from "./ExperimentSideMenu";

export type DetailTab = "method" | "behavior" | "winners" | "new" | "changelog";

const VIEW_CRITERION: Record<WorkbenchView, string> = {
  versions: "1",
  method: "2",
  behavior: "3",
  winners: "4",
  new: "5",
  changelog: "6",
};

export function ExperimentDetailPanel({
  activeView,
  run,
  variants,
  visitIndex,
  selectedVariantId,
}: {
  activeView: WorkbenchView;
  run: ExperimentRun | null;
  variants: PageVariant[];
  visitIndex: VisitIndex | null;
  selectedVariantId?: string | null;
}) {
  const meta = CRITERIA.find((c) => c.id === VIEW_CRITERION[activeView]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {meta && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{meta.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{meta.question}</p>
          </div>
        )}

        {activeView === "versions" && <VersionsDetail variants={variants} />}
        {activeView === "method" && <MethodDetail run={run} />}
        {activeView === "behavior" && (
          <BehaviorReport
            run={run}
            index={visitIndex}
            variants={variants}
            selectedVariantId={selectedVariantId}
          />
        )}
        {activeView === "winners" && <WinnersDetail run={run} variants={variants} />}
        {activeView === "new" && <NewVariantsDetail run={run} variants={variants} />}
        {activeView === "changelog" && <ChangelogDetail variants={variants} />}
      </div>
    </div>
  );
}
