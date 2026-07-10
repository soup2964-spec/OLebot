import type { PageVariant } from "@/platform/schema/page";
import type { Visit, VisitEvent, VariantMetrics } from "@/platform/schema/events";
import {
  computeFitnessFromPostHogRates,
  POSTHOG_BEHAVIOR_WEIGHTS,
  POSTHOG_EVENTS,
} from "@/domains/analytics/posthog-events";
import {
  computeFunnelFromVisits,
} from "@/domains/analytics/funnel-metrics";

/** @deprecated Use POSTHOG_BEHAVIOR_WEIGHTS — kept for imports that expect this name. */
export const FITNESS_WEIGHTS = {
  conversion: POSTHOG_BEHAVIOR_WEIGHTS.cta_click,
  scroll: POSTHOG_BEHAVIOR_WEIGHTS.scroll_depth,
  bounce: POSTHOG_BEHAVIOR_WEIGHTS.page_exit,
  sectionViewed: POSTHOG_BEHAVIOR_WEIGHTS.section_viewed,
  conversionCeiling: POSTHOG_BEHAVIOR_WEIGHTS.conversionCeiling,
} as const;

function uniqueSectionsViewed(events: VisitEvent[]): number {
  return new Set(
    events
      .filter((e) => e.type === POSTHOG_EVENTS.SECTION_VIEWED && e.sectionId)
      .map((e) => e.sectionId!)
  ).size;
}

function visitBounced(events: VisitEvent[]): boolean {
  const exit = events.find((e) => e.type === POSTHOG_EVENTS.PAGE_EXIT);
  return exit?.bounced === true;
}

/**
 * Fitness (0-100) from PostHog-style event rates on simulated visits.
 */
export function computeMetrics(variant: PageVariant, visits: Visit[]): VariantMetrics {
  const v = visits.filter((x) => x.variantId === variant.id);
  const n = v.length || 1;
  const sectionCount = Math.max(1, variant.sections.length);

  const conversions = v.filter((x) => x.converted).length;
  const conversionRate = conversions / n;
  const avgScrollDepth = v.reduce((s, x) => s + x.scrollDepth, 0) / n;
  const bounces = v.filter((x) => visitBounced(x.events)).length;
  const bounceRate = bounces / n;
  const avgSectionReach =
    v.reduce((s, x) => s + uniqueSectionsViewed(x.events) / sectionCount, 0) / n;

  const fitness = computeFitnessFromPostHogRates({
    ctaClickRate: conversionRate,
    avgScrollDepth,
    bounceRate,
    avgSectionReach,
  });

  const avgDwellMs = v.reduce((s, x) => s + x.totalDwellMs, 0) / n;

  const perSection = variant.sections.map((s) => {
    const views = v.filter((x) =>
      x.events.some(
        (e) => e.type === POSTHOG_EVENTS.SECTION_VIEWED && e.sectionId === s.id
      )
    );
    const reads = v.filter((x) =>
      x.events.some(
        (e) =>
          e.type === POSTHOG_EVENTS.SECTION_ENGAGED &&
          e.sectionId === s.id &&
          e.engagement === "read"
      )
    );
    const skims = v.filter((x) =>
      x.events.some(
        (e) =>
          e.type === POSTHOG_EVENTS.SECTION_ENGAGED &&
          e.sectionId === s.id &&
          e.engagement === "skim"
      )
    );
    const dwells = v.flatMap((x) =>
      x.events.filter(
        (e) => e.type === POSTHOG_EVENTS.SECTION_ENGAGED && e.sectionId === s.id
      )
    );
    const sentiments = v.flatMap((x) =>
      x.reactions.filter((r) => r.sectionId === s.id).map((r) => r.sentiment)
    );
    const exits = v.filter((x) =>
      x.events.some(
        (e) =>
          e.type === POSTHOG_EVENTS.PAGE_EXIT &&
          e.bounced &&
          e.sectionId === s.id
      )
    );
    return {
      sectionId: s.id,
      views: views.length,
      reads: reads.length,
      skims: skims.length,
      avgDwellMs: dwells.length
        ? dwells.reduce((sum, e) => sum + (e.dwellMs ?? 0), 0) / dwells.length
        : 0,
      avgSentiment: sentiments.length
        ? sentiments.reduce((sum, x) => sum + x, 0) / sentiments.length
        : 0,
      exitRate: views.length ? exits.length / views.length : 0,
    };
  });

  const byPersona: Record<string, { visits: number; conversions: number }> = {};
  for (const x of v) {
    byPersona[x.personaId] ??= { visits: 0, conversions: 0 };
    byPersona[x.personaId].visits++;
    if (x.converted) byPersona[x.personaId].conversions++;
  }

  const objectionFailures: Record<string, number> = {};
  for (const x of v) {
    if (x.converted) continue;
    for (const o of x.unresolvedCritical) {
      objectionFailures[o] = (objectionFailures[o] ?? 0) + 1;
    }
  }

  return {
    variantId: variant.id,
    visits: v.length,
    conversions,
    conversionRate,
    avgScrollDepth,
    avgDwellMs,
    bounceRate,
    fitness,
    perSection,
    byPersona,
    objectionFailures,
    funnel: computeFunnelFromVisits(v),
  };
}
