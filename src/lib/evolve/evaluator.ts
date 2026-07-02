import type { PageVariant } from "@/lib/schema/page";
import type { Visit, VariantMetrics } from "@/lib/schema/events";
import type { GenerationReport, Scorecard } from "@/lib/schema/experiment";
import { chatJSONRetry, evaluatorProvider } from "@/lib/llm";
import { computeFunnelFromVisits } from "@/lib/analytics/funnel-metrics";

/**
 * Evaluator agent: reads the quantitative rollup plus sampled qualitative
 * traces and produces the generation report. Judge/actor separation - it
 * never writes pages, only diagnoses them.
 */

const SYSTEM = `You are a rigorous conversion-optimization analyst evaluating landing page variants for Scholé AI (B2B adaptive AI-upskilling platform). You are given simulation results: metrics per variant, per-section engagement, per-persona conversion, unresolved buyer objections at exit, and sampled verbatim visitor reactions.

Be evidence-driven and specific. Cite numbers and quote visitor reactions. Do not be diplomatic - name what failed.

Scorecard dimensions (0-10):
- valueClarity: how quickly and clearly the page communicates its value
- credibility: how well it earns trust
- ctaStrength: how compelling and low-friction the conversion ask is
- audienceFit: how well it serves the personas who actually visited

Return JSON exactly:
{"insights": string (3-5 paragraph plain-English analysis of what the data says overall),
 "findings": [{"finding": string, "evidence": string}] (5-8 key findings, each with specific numeric or quoted evidence),
 "scorecards": [{"variantId": string, "valueClarity": number, "credibility": number, "ctaStrength": number, "audienceFit": number, "frictionPoints": [string], "strengths": [string], "summary": string}]}`;

export async function evaluateGeneration(
  generation: number,
  variants: PageVariant[],
  metrics: VariantMetrics[],
  visits: Visit[]
): Promise<GenerationReport> {
  const metricsWithFunnel = metrics.map((m) => ({
    ...m,
    funnel:
      m.funnel ??
      computeFunnelFromVisits(visits.filter((v) => v.variantId === m.variantId)),
  }));

  const metricsBlock = metricsWithFunnel
    .map((m) => {
      const variant = variants.find((v) => v.id === m.variantId)!;
      const sections = m.perSection
        .map(
          (s) =>
            `    ${s.sectionId}: views=${s.views} readRate=${(s.reads / Math.max(1, s.views)).toFixed(2)} avgDwell=${(s.avgDwellMs / 1000).toFixed(1)}s sentiment=${s.avgSentiment.toFixed(2)} exitRate=${(s.exitRate * 100).toFixed(0)}%`
        )
        .join("\n");
      const personas = Object.entries(m.byPersona)
        .map(([p, d]) => `${p}: ${d.conversions}/${d.visits}`)
        .join(", ");
      const objections = Object.entries(m.objectionFailures)
        .sort((a, b) => b[1] - a[1])
        .map(([o, c]) => `${o} (${c} lost visitors)`)
        .join(", ");
      return `VARIANT ${m.variantId} "${variant.name}" (strategy: ${variant.strategy})
  Thesis: ${variant.thesis}
  visits=${m.visits} conversions=${m.conversions} (${(m.conversionRate * 100).toFixed(1)}%) fitness=${m.fitness.toFixed(1)}
  funnel: ctaExposure=${(m.funnel.ctaExposureRate * 100).toFixed(1)}% ctaCTR=${(m.funnel.ctaClickThroughRate * 100).toFixed(1)}% demoRate=${(m.funnel.demoBookingRate * 100).toFixed(1)}%
  scrollDepth=${(m.avgScrollDepth * 100).toFixed(0)}% bounceRate=${(m.bounceRate * 100).toFixed(0)}% avgDwell=${(m.avgDwellMs / 1000).toFixed(0)}s
  Per-persona conversion: ${personas}
  Unresolved critical objections at exit: ${objections || "none"}
  Per-section:
${sections}`;
    })
    .join("\n\n");

  // Sample verbatim verdicts: a few per variant, mixing converts and bounces.
  const verdictBlock = variants
    .map((variant) => {
      const vs = visits.filter((x) => x.variantId === variant.id);
      const converted = vs.filter((x) => x.converted).slice(0, 2);
      const lost = vs.filter((x) => !x.converted).slice(0, 3);
      const lines = [...converted, ...lost].map(
        (x) => `  [${x.personaId}${x.converted ? ", CONVERTED" : ", LOST"}] "${x.verdict}"`
      );
      return `${variant.id}:\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const user = `GENERATION ${generation} SIMULATION RESULTS

${metricsBlock}

SAMPLED VISITOR VERDICTS (verbatim)
${verdictBlock}

Produce the JSON report.`;

  const out = await chatJSONRetry<{
    insights: string;
    findings: { finding: string; evidence: string }[];
    scorecards: Scorecard[];
  }>(SYSTEM, user, {
    temperature: 0.4,
    maxTokens: 6000,
    thinkingFlag: false,
    provider: evaluatorProvider(),
  });

  return { generation, ...out };
}
