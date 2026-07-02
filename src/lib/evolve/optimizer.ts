import type { PageVariant, Section, ChangelogEntry } from "@/lib/schema/page";
import type { VariantMetrics } from "@/lib/schema/events";
import type { GenerationReport } from "@/lib/schema/experiment";
import { chatJSONRetry } from "@/lib/llm";

/**
 * Optimizer agent: breeds the next generation from the evaluator's report.
 * Two genetic operations:
 *  - MUTATION: rewrite the weak sections of the fittest variant
 *  - CROSSOVER: combine the best-performing sections across different parents
 * Every change must carry a changelog entry citing specific evidence.
 */

const VALID_SECTION_TYPES = [
  "hero", "problem", "how_it_works", "features", "outcomes", "social_proof",
  "credibility", "compliance", "product_tour", "integration", "pricing", "faq", "cta",
];

const VALID_OBJECTIONS = [
  "roi_proof", "employee_adoption", "integration_friction", "content_quality",
  "implementation_burden", "time_cost", "automation_anxiety", "relevance_to_role",
  "compliance_coverage", "credibility", "price_clarity",
];

const SYSTEM = `You are a landing page optimizer for Scholé AI (B2B adaptive AI-upskilling platform). You breed improved landing page variants from experiment evidence.

You will receive: parent page definitions, their metrics, the analyst's report, and the biggest unresolved buyer objections. Produce ONE new page variant.

Hard rules:
- Every section needs: id (short slug), type (one of: ${VALID_SECTION_TYPES.join(", ")}), headline, body, optional items [{title, detail}], optional ctaLabel, addresses (array of objection ids from: ${VALID_OBJECTIONS.join(", ")}), readSeconds (8-25, honest estimate).
- "addresses" must be honest: only list objections the section's content substantively answers.
- Ground every change in the evidence. If the data says personas bounced with integration_friction unresolved, ADD content that actually resolves it - don't just tweak adjectives.
- Keep what worked (high dwell, high sentiment, sections cited in conversions). Cut or rewrite what didn't (high exit rate, low read rate, negative sentiment).
- Stay truthful to the product. Do not invent case studies, customers, or statistics that weren't in the parent pages. You may restructure, reframe, and reprioritize freely.
- 6-8 sections. Page must end with a cta section.
- The changelog must have 4-8 entries, each: {what, why, evidence, sourceVariantId?}. Evidence must cite specific numbers or quotes from the report. Use sourceVariantId when importing a section idea from another parent.

Return JSON exactly:
{"name": string (short descriptive name),
 "thesis": string (one paragraph: the strategic bet this page makes and what evidence motivated it),
 "ctaGoal": string,
 "sections": [...],
 "changelog": [...]}`;

interface OptimizerOutput {
  name: string;
  thesis: string;
  ctaGoal: string;
  sections: Section[];
  changelog: ChangelogEntry[];
}

export async function breedVariant(
  mode: "mutation" | "crossover",
  parents: PageVariant[],
  metrics: VariantMetrics[],
  report: GenerationReport,
  generation: number,
  childIndex: number
): Promise<PageVariant> {
  const parentBlock = parents
    .map((p) => {
      const m = metrics.find((x) => x.variantId === p.id);
      const sections = p.sections
        .map((s) => {
          const ps = m?.perSection.find((x) => x.sectionId === s.id);
          const items = s.items?.map((it) => `      * ${it.title}: ${it.detail}`).join("\n") ?? "";
          return `  [${s.id}] (${s.type}, addresses: ${s.addresses.join("/") || "none"}) "${s.headline}"
    ${s.body}${items ? "\n" + items : ""}${s.ctaLabel ? `\n    [BUTTON: ${s.ctaLabel}]` : ""}
    METRICS: readRate=${ps ? (ps.reads / Math.max(1, ps.views)).toFixed(2) : "?"} sentiment=${ps?.avgSentiment.toFixed(2) ?? "?"} exitRate=${ps ? (ps.exitRate * 100).toFixed(0) + "%" : "?"}`;
        })
        .join("\n");
      return `PARENT ${p.id} "${p.name}" - conversion ${(m?.conversionRate ?? 0) * 100}%, fitness ${m?.fitness.toFixed(1)}
Thesis: ${p.thesis}
Unresolved objections costing conversions: ${Object.entries(m?.objectionFailures ?? {}).sort((a, b) => b[1] - a[1]).map(([o, c]) => `${o}(${c})`).join(", ") || "none"}
${sections}`;
    })
    .join("\n\n");

  const findings = report.findings.map((f) => `- ${f.finding} [evidence: ${f.evidence}]`).join("\n");

  const modeInstr =
    mode === "mutation"
      ? `MODE: MUTATION. Start from the fittest parent (${parents[0].id}). Keep its winning sections, rewrite/replace/reorder the underperforming ones, and add content resolving the objections that cost it conversions.`
      : `MODE: CROSSOVER. Combine the strongest sections across ALL parents into one page with a coherent narrative arc. Use sourceVariantId in the changelog to credit each imported section.`;

  const user = `GENERATION ${generation} EVIDENCE

ANALYST FINDINGS
${findings}

ANALYST SUMMARY
${report.insights}

${parentBlock}

${modeInstr}

Produce the JSON for the new variant.`;

  const out = await chatJSONRetry<OptimizerOutput>(SYSTEM, user, {
    temperature: 0.7,
    maxTokens: 6000,
  });

  const id = `g${generation + 1}-${mode === "mutation" ? "mut" : "x"}${childIndex}`;
  return {
    id,
    name: out.name,
    strategy: "generated",
    generation: generation + 1,
    parentIds: parents.map((p) => p.id),
    ctaGoal: out.ctaGoal || parents[0].ctaGoal,
    thesis: out.thesis,
    changelog: out.changelog,
    sections: sanitizeSections(out.sections, id),
  };
}

function sanitizeSections(sections: Section[], variantId: string): Section[] {
  const seen = new Set<string>();
  return (sections ?? [])
    .filter((s) => s && s.headline && s.body)
    .map((s, i) => {
      let id = (s.id || `s${i}`).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 24) || `s${i}`;
      while (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return {
        id,
        type: VALID_SECTION_TYPES.includes(s.type) ? s.type : "features",
        headline: String(s.headline),
        body: String(s.body),
        items: s.items?.slice(0, 6).map((it) => ({ title: String(it.title), detail: String(it.detail) })),
        ctaLabel: s.ctaLabel ? String(s.ctaLabel) : undefined,
        addresses: (s.addresses ?? []).filter((a) => VALID_OBJECTIONS.includes(a)),
        readSeconds: Math.min(25, Math.max(8, Number(s.readSeconds) || 12)),
      } as Section;
    });
}

/** Jaccard similarity on headline word sets - crude but effective diversity guard. */
export function pageSimilarity(a: PageVariant, b: PageVariant): number {
  const words = (v: PageVariant) =>
    new Set(
      v.sections
        .flatMap((s) => `${s.headline} ${s.body}`.toLowerCase().split(/\W+/))
        .filter((w) => w.length > 4)
    );
  const wa = words(a);
  const wb = words(b);
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union ? inter / union : 0;
}
