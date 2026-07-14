import type { ObjectionId } from "./page";
import { POSTHOG_EVENTS } from "@/lab/analytics/posthog-events";
import type { VariantFunnelMetrics } from "@/lab/analytics/funnel-metrics";

/**
 * One simulated visit = one ordered event trace + the agent's verbalized
 * reasoning. Event names match the PostHog tracking plan where possible.
 */

export type VisitEventType =
  | typeof POSTHOG_EVENTS.PAGEVIEW
  | typeof POSTHOG_EVENTS.SECTION_VIEWED
  | typeof POSTHOG_EVENTS.CTA_VIEWED
  | typeof POSTHOG_EVENTS.SCROLL_DEPTH
  | typeof POSTHOG_EVENTS.SECTION_ENGAGED
  | typeof POSTHOG_EVENTS.BOOK_DEMO_CLICK
  | typeof POSTHOG_EVENTS.PAGE_EXIT;

export interface VisitEvent {
  type: VisitEventType;
  sectionId?: string;
  /** Milliseconds since visit start. */
  at: number;
  /** Dwell time on this section in ms (section_engaged). */
  dwellMs?: number;
  /** scroll_depth milestone (25 / 50 / 75 / 100). */
  scrollDepthPct?: number;
  /** page_exit — left without meaningful engagement. */
  bounced?: boolean;
  /** page_exit — max scroll depth as page fraction (0–1). */
  maxScrollDepth?: number;
  /** page_exit — sections reached before exit. */
  sectionsViewedCount?: number;
  /** page_exit — critical objections still open (simulation). */
  unresolvedObjections?: string[];
  /** cta_viewed / cta_click — button copy shown. */
  ctaLabel?: string;
  /** page_exit — session converted before exit. */
  converted?: boolean;
  /** section_engaged — simulation detail for replay theater. */
  engagement?: "read" | "skim";
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
  /** Tier-2 funnel diagnostics (not weighted in fitness). */
  funnel: VariantFunnelMetrics;
}
