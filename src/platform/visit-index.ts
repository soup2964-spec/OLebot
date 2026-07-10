import { POSTHOG_EVENTS } from "@/domains/analytics/posthog-events";
import type { ExperimentRun } from "@/platform/schema/experiment";

export interface VisitSummary {
  id: string;
  personaId: string;
  variantId: string;
  converted: boolean;
  bounced: boolean;
  scrollDepth: number;
  totalDwellMs: number;
  verdictPreview: string;
  path: { sectionId: string; action: "read" | "skim" | "bounce" }[];
}

export function visitIndex(run: ExperimentRun) {
  return run.generations.map((g) => ({
    generation: g.generation,
    totalVisits: g.totalVisits ?? g.visits.length,
    variantIds: g.variantIds,
    metrics: g.metrics,
    visits: g.visits.map((v) => ({
      id: v.id,
      personaId: v.personaId,
      variantId: v.variantId,
      converted: v.converted,
      bounced: v.events.some(
        (e) => e.type === POSTHOG_EVENTS.PAGE_EXIT && e.bounced === true
      ),
      scrollDepth: v.scrollDepth,
      totalDwellMs: v.totalDwellMs,
      verdictPreview: v.verdict.slice(0, 140),
      path: v.events
        .filter(
          (e): e is typeof e & { sectionId: string } =>
            !!e.sectionId && e.type === POSTHOG_EVENTS.SECTION_ENGAGED
        )
        .map((e) => ({
          sectionId: e.sectionId,
          action: (e.engagement === "read" ? "read" : e.engagement === "skim" ? "skim" : "bounce") as
            | "read"
            | "skim"
            | "bounce",
        })),
    })) satisfies VisitSummary[],
  }));
}

export type VisitIndex = ReturnType<typeof visitIndex>;
