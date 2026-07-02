import type { PageVariant } from "@/lib/schema/page";
import type { Persona } from "@/lib/schema/persona";
import type { ObjectionId } from "@/lib/schema/page";
import { chatJSONRetry, readerProvider } from "@/lib/llm";

/**
 * A PersonaReading is one LLM pass of a persona over a page: per-section
 * reactions, objection effects, and conversion inclination. The Monte Carlo
 * visit engine samples many stochastic visits from a few readings, so LLM
 * cost is bounded while visit counts stay statistically meaningful.
 */

export interface SectionReading {
  sectionId: string;
  /** 0-1: how compelling this section is to read carefully (vs skim). */
  appeal: number;
  /** -2..+2 */
  sentiment: number;
  thought: string;
  /** 0-1: inclination to keep scrolling after this section. */
  continueDesire: number;
  objectionEffects: { objectionId: ObjectionId; effect: "resolved" | "aggravated"; note: string }[];
}

export interface PersonaReading {
  personaId: string;
  variantId: string;
  seed: number;
  sections: SectionReading[];
  /** 0-1: probability of clicking the CTA if all critical objections are resolved by page end. */
  ctaInclination: number;
  verdict: string;
}

const SYSTEM = `You simulate a specific B2B software buyer persona reading a landing page, section by section, top to bottom. You are rigorous about staying in character: this person is busy, has specific objections, and does not care about marketing language that doesn't address their actual concerns.

Rules:
- React to sections IN ORDER. You cannot react to content you haven't reached yet.
- A section only resolves an objection if its content actually, substantively addresses it. Vague claims do not resolve objections. Content can also AGGRAVATE an objection (e.g. a "book a demo to see pricing" pattern aggravates price concerns).
- appeal: probability (0-1) this persona reads the section carefully instead of skimming, based on how relevant the headline/content is to their goals.
- continueDesire: 0-1 desire to keep scrolling AFTER this section (low if bored, satisfied, or annoyed).
- sentiment: -2 (actively off-putting) to +2 (compelling).
- thought: one short first-person sentence in the persona's voice. Be specific and honest, not polite.
- ctaInclination: 0-1 probability of clicking the CTA assuming all their critical objections got resolved. Consider how well the CTA offer matches what they need.
- verdict: 2-3 first-person sentences on the overall page: what worked, what was missing, why they would or wouldn't convert.

Return JSON exactly matching:
{"sections":[{"sectionId":string,"appeal":number,"sentiment":number,"thought":string,"continueDesire":number,"objectionEffects":[{"objectionId":string,"effect":"resolved"|"aggravated","note":string}]}],"ctaInclination":number,"verdict":string}`;

export async function readPage(
  persona: Persona,
  variant: PageVariant,
  seed: number
): Promise<PersonaReading> {
  const objections = persona.objections
    .map((o) => `- ${o.id}${o.critical ? " (CRITICAL - must be resolved before I convert)" : ""}: "${o.text}"`)
    .join("\n");

  const sections = variant.sections
    .map((s, i) => {
      const items = s.items?.map((it) => `    * ${it.title}: ${it.detail}`).join("\n") ?? "";
      return `${i + 1}. [${s.id}] (${s.type}) "${s.headline}"\n   ${s.body}${items ? "\n" + items : ""}${s.ctaLabel ? `\n   [BUTTON: "${s.ctaLabel}"]` : ""}`;
    })
    .join("\n\n");

  const user = `PERSONA
Name: ${persona.name}, ${persona.role}
Profile: ${persona.profile}
Goals: ${persona.goals.join("; ")}
Objections (use these exact ids in objectionEffects):
${objections}
Skepticism: ${persona.skepticism} (0=trusting, 1=hostile to marketing claims)

LANDING PAGE (product: Scholé AI, an adaptive AI-upskilling platform; page goal: "${variant.ctaGoal}")

${sections}

Walk this page top to bottom as ${persona.name} and return the JSON. Reading variation seed: ${seed}.`;

  const out = await chatJSONRetry<Omit<PersonaReading, "personaId" | "variantId" | "seed">>(
    SYSTEM,
    user,
    // Reader can be a different provider than the breeder (LLM_READER_PROVIDER)
    // so the model judging copy isn't the same one that wrote it.
    { temperature: 0.9, provider: readerProvider() }
  );

  // Clamp + sanitize LLM output; keep only known section/objection ids.
  const validSections = new Set(variant.sections.map((s) => s.id));
  const validObjections = new Set(persona.objections.map((o) => o.id));
  const clamp = (n: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Number(n) || 0));

  const bySection = new Map(
    (out.sections ?? []).filter((s) => validSections.has(s.sectionId)).map((s) => [s.sectionId, s])
  );

  return {
    personaId: persona.id,
    variantId: variant.id,
    seed,
    ctaInclination: clamp(out.ctaInclination, 0, 1),
    verdict: String(out.verdict ?? ""),
    sections: variant.sections.map((s) => {
      const r = bySection.get(s.id);
      return {
        sectionId: s.id,
        appeal: clamp(r?.appeal ?? 0.4, 0, 1),
        sentiment: clamp(r?.sentiment ?? 0, -2, 2),
        thought: String(r?.thought ?? "(skimmed past)"),
        continueDesire: clamp(r?.continueDesire ?? 0.5, 0, 1),
        objectionEffects: (r?.objectionEffects ?? [])
          .filter((e) => validObjections.has(e.objectionId))
          .map((e) => ({
            objectionId: e.objectionId,
            effect: e.effect === "aggravated" ? ("aggravated" as const) : ("resolved" as const),
            note: String(e.note ?? ""),
          })),
      };
    }),
  };
}
