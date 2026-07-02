import type { Visit, VisitEvent } from "@/lib/schema/events";
import { POSTHOG_EVENTS } from "./posthog-events";

/** Tier-2 funnel rates — diagnostic inputs for copy updates, not fitness weights. */
export interface VariantFunnelMetrics {
  sessions: number;
  /** Sessions where a CTA block entered viewport (cta_viewed). */
  ctaExposed: number;
  /** Sessions with book_demo_click (or converted). */
  ctaClicks: number;
  /** cta_viewed / sessions — layout & scroll problem if low. */
  ctaExposureRate: number;
  /** book_demo_click / cta_viewed — copy & friction problem if low. */
  ctaClickThroughRate: number;
  /** book_demo_click / sessions — same as conversion rate. */
  demoBookingRate: number;
}

export interface FunnelMetricDefinition {
  id: keyof Pick<
    VariantFunnelMetrics,
    "ctaExposureRate" | "ctaClickThroughRate" | "demoBookingRate"
  >;
  label: string;
  formula: string;
  role: string;
  why: string;
  /** When this metric is low, the optimizer should focus on… */
  copyLever: string;
}

export const FUNNEL_METRIC_DEFINITIONS: FunnelMetricDefinition[] = [
  {
    id: "ctaExposureRate",
    label: "CTA exposure rate",
    formula: "cta_viewed ÷ sessions",
    role: "Top of funnel",
    why: "Did the visitor scroll far enough to see the demo ask? Separates layout/hero problems from copy problems.",
    copyLever: "Hero height, CTA placement, page length, above-the-fold clarity",
  },
  {
    id: "ctaClickThroughRate",
    label: "CTA click-through rate",
    formula: "book_demo_click ÷ cta_viewed",
    role: "Mid funnel",
    why: "Among visitors who saw the CTA, how many clicked? The core copy and friction diagnostic for landing tests.",
    copyLever: "CTA label, proof near ask, objection handling before CTA, friction reducers",
  },
  {
    id: "demoBookingRate",
    label: "Demo booking rate",
    formula: "book_demo_click ÷ sessions",
    role: "Bottom of funnel",
    why: "Overall conversion — composes exposure × CTR. This is the primary outcome in fitness scoring (80% weight).",
    copyLever: "Full-page narrative: problem → proof → ask",
  },
];

export function visitCtaExposed(events: VisitEvent[]): boolean {
  return events.some((e) => e.type === POSTHOG_EVENTS.CTA_VIEWED);
}

export function visitDemoClicked(visit: Pick<Visit, "converted" | "events">): boolean {
  return (
    visit.converted ||
    visit.events.some((e) => e.type === POSTHOG_EVENTS.BOOK_DEMO_CLICK)
  );
}

export function computeFunnelRates(
  sessions: number,
  ctaExposed: number,
  ctaClicks: number
): VariantFunnelMetrics {
  const n = Math.max(0, sessions);
  const exposed = Math.max(0, Math.min(ctaExposed, n));
  const clicks = Math.max(0, Math.min(ctaClicks, n));
  return {
    sessions: n,
    ctaExposed: exposed,
    ctaClicks: clicks,
    ctaExposureRate: n > 0 ? exposed / n : 0,
    ctaClickThroughRate: exposed > 0 ? clicks / exposed : 0,
    demoBookingRate: n > 0 ? clicks / n : 0,
  };
}

export function computeFunnelFromVisits(visits: Visit[]): VariantFunnelMetrics {
  const sessions = visits.length;
  const ctaExposed = visits.filter((v) => visitCtaExposed(v.events)).length;
  const ctaClicks = visits.filter((v) => visitDemoClicked(v)).length;
  return computeFunnelRates(sessions, ctaExposed, ctaClicks);
}

export function aggregateFunnelMetrics(
  funnels: VariantFunnelMetrics[]
): VariantFunnelMetrics {
  const sessions = funnels.reduce((s, f) => s + f.sessions, 0);
  const ctaExposed = funnels.reduce((s, f) => s + f.ctaExposed, 0);
  const ctaClicks = funnels.reduce((s, f) => s + f.ctaClicks, 0);
  return computeFunnelRates(sessions, ctaExposed, ctaClicks);
}

export function formatFunnelPct(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}
