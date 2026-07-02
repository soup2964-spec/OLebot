import type { PageVariant } from "@/lib/schema/page";
import type { Visit, VariantMetrics } from "@/lib/schema/events";

/**
 * Behavior weighting — the single source of truth for how much each simulated
 * behavior counts toward a variant's fitness. Surfaced verbatim in the
 * behavior report so the presented criteria never drift from the scoring.
 *
 * Rationale for the ordering:
 *   conversion  dominates — only behavior that maps directly to revenue
 *   scroll      strongest attention proxy (deep scroll precedes conversion)
 *   bounce      early-abandonment guard (overlaps scroll; catches worst cases)
 *   sentiment   softest, most subjective signal — kept small
 */
export const FITNESS_WEIGHTS = {
  conversion: 0.6,
  scroll: 0.2,
  bounce: 0.1,
  sentiment: 0.1,
  /** Conversion rate at which the conversion term saturates (8% > 2-5% B2B benchmark). */
  conversionCeiling: 0.08,
} as const;

/**
 * Fitness (0-100): conversion dominates, engagement quality refines.
 * Weights come from FITNESS_WEIGHTS above.
 */
export function computeMetrics(variant: PageVariant, visits: Visit[]): VariantMetrics {
  const v = visits.filter((x) => x.variantId === variant.id);
  const n = v.length || 1;
  const conversions = v.filter((x) => x.converted).length;
  const conversionRate = conversions / n;
  const avgScrollDepth = v.reduce((s, x) => s + x.scrollDepth, 0) / n;
  const avgDwellMs = v.reduce((s, x) => s + x.totalDwellMs, 0) / n;
  const bounces = v.filter((x) => x.events.some((e) => e.type === "bounce")).length;
  const bounceRate = bounces / n;

  const allSentiments = v.flatMap((x) => x.reactions.map((r) => r.sentiment));
  const meanSentiment = allSentiments.length
    ? allSentiments.reduce((s, x) => s + x, 0) / allSentiments.length
    : 0;

  const fitness =
    100 *
    (FITNESS_WEIGHTS.conversion *
      Math.min(1, conversionRate / FITNESS_WEIGHTS.conversionCeiling) +
      FITNESS_WEIGHTS.scroll * avgScrollDepth +
      FITNESS_WEIGHTS.bounce * (1 - bounceRate) +
      FITNESS_WEIGHTS.sentiment * ((meanSentiment + 2) / 4));

  const perSection = variant.sections.map((s) => {
    const views = v.filter((x) => x.events.some((e) => e.type === "view_section" && e.sectionId === s.id));
    const reads = v.filter((x) => x.events.some((e) => e.type === "read" && e.sectionId === s.id));
    const skims = v.filter((x) => x.events.some((e) => e.type === "skim" && e.sectionId === s.id));
    const dwells = v.flatMap((x) =>
      x.events.filter((e) => (e.type === "read" || e.type === "skim") && e.sectionId === s.id)
    );
    const sentiments = v.flatMap((x) => x.reactions.filter((r) => r.sectionId === s.id).map((r) => r.sentiment));
    const exits = v.filter((x) => x.events.some((e) => e.type === "bounce" && e.sectionId === s.id));
    return {
      sectionId: s.id,
      views: views.length,
      reads: reads.length,
      skims: skims.length,
      avgDwellMs: dwells.length ? dwells.reduce((sum, e) => sum + (e.dwellMs ?? 0), 0) / dwells.length : 0,
      avgSentiment: sentiments.length ? sentiments.reduce((sum, x) => sum + x, 0) / sentiments.length : 0,
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
  };
}
