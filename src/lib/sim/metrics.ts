import type { PageVariant } from "@/lib/schema/page";
import type { Visit, VariantMetrics } from "@/lib/schema/events";

/**
 * Fitness (0-100): conversion dominates, engagement quality refines.
 *   60% conversion rate (normalized against an 8% ceiling - generous vs the
 *       2-5% B2B SaaS benchmark so improvement stays visible)
 *   20% scroll depth
 *   10% inverse bounce rate
 *   10% mean sentiment (shifted to 0-1)
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
    (0.6 * Math.min(1, conversionRate / 0.08) +
      0.2 * avgScrollDepth +
      0.1 * (1 - bounceRate) +
      0.1 * ((meanSentiment + 2) / 4));

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
