import type { ObjectionId } from "./page";

/**
 * One simulated visit = one ordered event trace + the agent's verbalized
 * reasoning. Traces power the metrics, the heatmaps, AND the replay theater.
 */

export type VisitEventType =
  | "page_view"
  | "view_section" // section entered viewport
  | "read" // careful read (full dwell)
  | "skim" // partial dwell
  | "cta_click"
  | "bounce" // left without converting
  | "exit_complete"; // read to the end, left without converting

export interface VisitEvent {
  type: VisitEventType;
  sectionId?: string;
  /** Milliseconds since visit start. */
  at: number;
  /** Dwell time on this section in ms (for read/skim). */
  dwellMs?: number;
}

export interface ObjectionUpdate {
  objectionId: ObjectionId;
  sectionId: string;
  effect: "resolved" | "aggravated";
  note: string; // agent's words on why
}

export interface SectionReaction {
  sectionId: string;
  action: "read" | "skim";
  /** -2 (actively off-putting) to +2 (compelling) */
  sentiment: number;
  thought: string; // verbalized reaction, shown in replay theater
}

export interface Visit {
  id: string;
  variantId: string;
  personaId: string;
  personaVersion: number;
  generation: number;
  events: VisitEvent[];
  reactions: SectionReaction[];
  objectionUpdates: ObjectionUpdate[];
  converted: boolean;
  /** Max scroll depth as fraction of page sections seen (0-1). */
  scrollDepth: number;
  totalDwellMs: number;
  /** Agent's final verdict in its own words - the signal real analytics can never give. */
  verdict: string;
  /** Critical objections still unresolved at exit. */
  unresolvedCritical: ObjectionId[];
}

export interface VariantMetrics {
  variantId: string;
  visits: number;
  conversions: number;
  conversionRate: number;
  avgScrollDepth: number;
  avgDwellMs: number;
  bounceRate: number;
  /** Composite 0-100. */
  fitness: number;
  perSection: {
    sectionId: string;
    views: number;
    reads: number;
    skims: number;
    avgDwellMs: number;
    avgSentiment: number;
    /** Fraction of visits that ended (bounced) at this section. */
    exitRate: number;
  }[];
  /** Conversion by persona id. */
  byPersona: Record<string, { visits: number; conversions: number }>;
  /** Count of unresolved-critical objections at exit, by objection id. */
  objectionFailures: Record<string, number>;
}
