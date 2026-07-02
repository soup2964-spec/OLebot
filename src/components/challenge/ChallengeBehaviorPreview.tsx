"use client";

import { BehaviorDashboardClient } from "@/components/behavior/BehaviorDashboardClient";
import type { VisitIndex } from "@/lib/registry";
import type { PageVariant } from "@/lib/schema/page";

/** Compact behavior preview embedded in the challenge dashboard. */
export function ChallengeBehaviorPreview({
  initialIndex,
  initialVariants,
}: {
  initialIndex: VisitIndex;
  initialVariants: PageVariant[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <BehaviorDashboardClient
        initialIndex={initialIndex}
        initialVariants={initialVariants}
      />
    </div>
  );
}
