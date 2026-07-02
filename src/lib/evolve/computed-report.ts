import type { PageVariant } from "@/lib/schema/page";
import type { VariantMetrics } from "@/lib/schema/events";
import type { GenerationReport, Scorecard } from "@/lib/schema/experiment";
import type { VariantDecision } from "@/lib/stats/bayes";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Deterministic generation report computed straight from simulated behavior.
 * Replaces the LLM evaluator: same shape (insights/findings/scorecards), but
 * every claim is a direct function of the metrics and Bayesian decisions, so the
 * breeder's evidence traces back to what users actually did rather than to an
 * LLM's narrative. This keeps the "decisions are driven by behavior" line honest
 * and removes the single shared narrative that homogenized every offspring.
 */
export function buildComputedReport(
  generation: number,
  pool: PageVariant[],
  metrics: VariantMetrics[],
  decisions: VariantDecision[]
): GenerationReport {
  const ranked = [...metrics].sort((a, b) => b.fitness - a.fitness);
  const winner = ranked[0];
  const worst = ranked[ranked.length - 1];
  const nameOf = (id: string) => pool.find((v) => v.id === id)?.name ?? id;

  // Aggregate unresolved objections across the whole pool.
  const objTotals = new Map<string, number>();
  for (const m of metrics) {
    for (const [obj, count] of Object.entries(m.objectionFailures ?? {})) {
      objTotals.set(obj, (objTotals.get(obj) ?? 0) + count);
    }
  }
  const topObjections = [...objTotals.entries()].sort((a, b) => b[1] - a[1]);

  // Section-level signal across the pool: worst exit, best sentiment.
  let worstSection: { variantId: string; sectionId: string; exitRate: number; views: number } | null = null;
  let bestSection: { variantId: string; sectionId: string; sentiment: number; views: number } | null = null;
  for (const m of metrics) {
    for (const s of m.perSection ?? []) {
      if (s.views < 20) continue;
      if (!worstSection || s.exitRate > worstSection.exitRate) {
        worstSection = { variantId: m.variantId, sectionId: s.sectionId, exitRate: s.exitRate, views: s.views };
      }
      if (!bestSection || s.avgSentiment > bestSection.sentiment) {
        bestSection = { variantId: m.variantId, sectionId: s.sectionId, sentiment: s.avgSentiment, views: s.views };
      }
    }
  }

  const findings: { finding: string; evidence: string }[] = [];

  findings.push({
    finding: `${winner.variantId} (${nameOf(winner.variantId)}) led generation ${generation}.`,
    evidence: `fitness=${winner.fitness.toFixed(1)}, conversion=${(winner.conversionRate * 100).toFixed(1)}%, bounce=${(winner.bounceRate * 100).toFixed(0)}%.`,
  });

  if (worst && worst.variantId !== winner.variantId) {
    findings.push({
      finding: `${worst.variantId} (${nameOf(worst.variantId)}) was the weakest page.`,
      evidence: `fitness=${worst.fitness.toFixed(1)}, conversion=${(worst.conversionRate * 100).toFixed(1)}%.`,
    });
  }

  if (topObjections.length) {
    const [obj, count] = topObjections[0];
    findings.push({
      finding: `${obj} is the dominant unresolved objection across the pool.`,
      evidence: `${count} lost visitors cited ${obj} at exit${topObjections[1] ? `; next is ${topObjections[1][0]} (${topObjections[1][1]})` : ""}.`,
    });
  }

  if (worstSection) {
    findings.push({
      finding: `The ${worstSection.sectionId} section on ${worstSection.variantId} bleeds the most traffic.`,
      evidence: `exitRate=${(worstSection.exitRate * 100).toFixed(0)}% over ${worstSection.views} views.`,
    });
  }
  if (bestSection) {
    findings.push({
      finding: `The ${bestSection.sectionId} section on ${bestSection.variantId} resonated most.`,
      evidence: `avgSentiment=${bestSection.sentiment.toFixed(2)} over ${bestSection.views} views.`,
    });
  }

  for (const d of decisions.filter((x) => x.status !== "collecting")) {
    findings.push({ finding: `${d.variantId}: ${d.status}.`, evidence: d.reason });
  }

  const insights =
    `Generation ${generation}: ${winner.variantId} (${nameOf(winner.variantId)}) led with ` +
    `${(winner.conversionRate * 100).toFixed(1)}% conversion and fitness ${winner.fitness.toFixed(1)}. ` +
    (topObjections.length
      ? `The biggest conversion blocker pool-wide was ${topObjections[0][0]} (${topObjections[0][1]} lost visitors). `
      : "") +
    (worstSection
      ? `The ${worstSection.sectionId} section lost the most traffic (${(worstSection.exitRate * 100).toFixed(0)}% exit). `
      : "") +
    (bestSection
      ? `The ${bestSection.sectionId} section drew the strongest sentiment (${bestSection.sentiment.toFixed(2)}).`
      : "");

  const scorecards: Scorecard[] = pool.map((v) => {
    const m = metrics.find((x) => x.variantId === v.id);
    const cr = m?.conversionRate ?? 0;
    const scroll = m?.avgScrollDepth ?? 0;
    const hasProof = v.sections.some((s) => s.type === "social_proof" || s.type === "credibility");
    return {
      variantId: v.id,
      valueClarity: clamp(4 + cr * 200, 0, 10),
      credibility: clamp(5 + (hasProof ? 2 : 0), 0, 10),
      ctaStrength: clamp(4 + cr * 180, 0, 10),
      audienceFit: clamp(4 + scroll * 6, 0, 10),
      frictionPoints: Object.entries(m?.objectionFailures ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([o]) => `Unresolved: ${o}`),
      strengths: cr > 0.02 ? ["Above-pool conversion"] : ["Held scroll depth"],
      summary: `${v.name}: ${(cr * 100).toFixed(1)}% conversion, fitness ${(m?.fitness ?? 0).toFixed(1)}.`,
    };
  });

  return { generation, insights, findings, scorecards };
}
