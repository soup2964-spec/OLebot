import type { PageVariant } from "@/shared/schema/page";
import type { Persona } from "@/shared/schema/persona";
import type { PersonaReading, SectionReading } from "./reading";
import { makeRng } from "./rng";

/**
 * Rule-based page reader for offline demo runs (no LLM key required).
 * Scores sections by how many of the persona's objections they address,
 * modulated by strategy fit and skepticism.
 */
export function heuristicReadPage(
  persona: Persona,
  variant: PageVariant,
  seed: number
): PersonaReading {
  const rng = makeRng(seed);
  const criticalIds = new Set(persona.objections.filter((o) => o.critical).map((o) => o.id));

  const sections: SectionReading[] = variant.sections.map((s) => {
    const overlap = s.addresses.filter((a) => persona.objections.some((o) => o.id === a));
    const criticalHit = overlap.filter((a) => criticalIds.has(a)).length;
    const relevance = overlap.length / Math.max(1, persona.objections.length);

    let appeal = 0.25 + relevance * 0.55 + criticalHit * 0.12;
    let sentiment = -0.5 + relevance * 2.5 + criticalHit * 0.4;

    // Strategy fit nudges
    if (persona.id === "compliance_lead" && variant.strategy === "compliance") {
      appeal += 0.15;
      sentiment += 0.5;
    }
    if (persona.id === "ld_director" && variant.strategy === "roi") {
      appeal += 0.12;
      sentiment += 0.4;
    }
    if (persona.id === "employee_ic" && variant.strategy === "learner_first") {
      appeal += 0.18;
      sentiment += 0.6;
    }
    if (persona.id === "ops_it_buyer" && s.type === "integration") {
      appeal += 0.2;
      sentiment += 0.5;
    }
    if (persona.id === "hr_manager" && variant.strategy === "problem_first") {
      appeal += 0.1;
      sentiment += 0.3;
    }

    // Baseline is long and tries everything - decent for everyone, great for no one
    if (variant.strategy === "baseline") {
      appeal -= 0.05;
      sentiment -= 0.1;
    }

    appeal = clamp(appeal - persona.skepticism * 0.15 + (rng() - 0.5) * 0.08, 0.08, 0.95);
    sentiment = clamp(sentiment + (rng() - 0.5) * 0.4, -2, 2);
    const continueDesire = clamp(0.35 + appeal * 0.45 + sentiment * 0.08, 0.1, 0.95);

    const objectionEffects = overlap.map((oid) => {
      const obj = persona.objections.find((o) => o.id === oid)!;
      const resolves = rng() > persona.skepticism * 0.35;
      return {
        objectionId: oid,
        effect: resolves ? ("resolved" as const) : ("aggravated" as const),
        note: resolves
          ? `"${s.headline}" actually spoke to my concern about ${obj.text.slice(0, 40)}...`
          : `They mention ${oid} but it felt like marketing, not proof.`,
      };
    });

    const thought =
      sentiment > 1
        ? `This ${s.type} section is exactly what I needed - "${s.headline.slice(0, 50)}..."`
        : sentiment > 0
          ? `Relevant enough. ${overlap.length ? "Touches my concerns." : "Not sure this is for me."}`
          : sentiment > -1
            ? `Skimming. ${overlap.length ? "Vague on what I actually need." : "Doesn't address my situation."}`
            : `This is generic B2B fluff. Moving on.`;

    return {
      sectionId: s.id,
      appeal,
      sentiment,
      thought,
      continueDesire,
      objectionEffects,
    };
  });

  const resolvedPotential = new Set(
    sections.flatMap((s) =>
      s.objectionEffects.filter((e) => e.effect === "resolved").map((e) => e.objectionId)
    )
  );
  const criticalResolved = [...criticalIds].filter((c) => resolvedPotential.has(c)).length;
  const ctaInclination = clamp(
    0.2 +
      (criticalResolved / Math.max(1, criticalIds.size)) * 0.55 +
      sections.reduce((s, r) => s + r.sentiment, 0) / sections.length / 8,
    0.05,
    0.85
  );

  const verdict =
    ctaInclination > 0.55
      ? `This page addressed ${criticalResolved}/${criticalIds.size} of my critical concerns. I'd ${variant.ctaGoal.toLowerCase()}.`
      : criticalResolved < criticalIds.size / 2
        ? `Too many unanswered questions (${[...criticalIds].filter((c) => !resolvedPotential.has(c)).join(", ")}). Not converting.`
        : `Decent page but I'm not fully convinced. Would need more proof before ${variant.ctaGoal.toLowerCase()}.`;

  return {
    personaId: persona.id,
    variantId: variant.id,
    seed,
    sections,
    ctaInclination,
    verdict,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
