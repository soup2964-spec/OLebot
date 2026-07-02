import type { PageVariant, ObjectionId } from "@/lib/schema/page";
import type { Persona } from "@/lib/schema/persona";
import type { Visit, VisitEvent, SectionReaction, ObjectionUpdate } from "@/lib/schema/events";
import type { PersonaReading } from "./reading";
import { gaussian, type Rng } from "./rng";

/**
 * Samples one stochastic visit from a PersonaReading.
 *
 * Behavioral model:
 * - Attention budget: patience sampled per visit; fatigue grows as accumulated
 *   dwell exceeds it, raising skim and bounce probability (position bias falls
 *   out naturally: later sections are seen less - consistent with NNG scroll research).
 * - Objection ledger: sections resolve/aggravate objections (per the LLM
 *   reading); skimming a section only applies its effects sometimes.
 * - Conversion gate: the persona clicks the CTA only if all critical
 *   objections are resolved, modulated by ctaInclination and ctaPropensity.
 */
export function sampleVisit(
  rng: Rng,
  persona: Persona,
  variant: PageVariant,
  reading: PersonaReading,
  generation: number,
  visitIndex: number
): Visit {
  const events: VisitEvent[] = [];
  const reactions: SectionReaction[] = [];
  const objectionUpdates: ObjectionUpdate[] = [];

  const resolved = new Set<ObjectionId>();
  const aggravated = new Set<ObjectionId>();
  const critical = persona.objections.filter((o) => o.critical).map((o) => o.id);

  const patienceMs =
    Math.max(10, gaussian(rng, persona.patienceSeconds.mean, persona.patienceSeconds.stdDev)) * 1000;

  let clock = 0;
  let dwellTotal = 0;
  let converted = false;
  let bounced = false;
  let sectionsSeen = 0;

  events.push({ type: "page_view", at: 0 });

  for (let i = 0; i < variant.sections.length; i++) {
    const section = variant.sections[i];
    const r = reading.sections[i];
    sectionsSeen++;
    events.push({ type: "view_section", sectionId: section.id, at: clock });

    // Fatigue: 1 while under budget, decays toward 0.15 once over it.
    const overBudget = Math.max(0, dwellTotal - patienceMs) / patienceMs;
    const fatigue = Math.max(0.15, 1 - overBudget);

    // Read vs skim.
    const pRead = r.appeal * (1 - persona.skimPropensity * 0.6) * fatigue;
    const isRead = rng() < pRead;
    const dwellMs = Math.round(
      section.readSeconds * 1000 * (isRead ? 0.85 + rng() * 0.45 : 0.15 + rng() * 0.25)
    );
    clock += dwellMs;
    dwellTotal += dwellMs;

    events.push({
      type: isRead ? "read" : "skim",
      sectionId: section.id,
      at: clock,
      dwellMs,
    });
    reactions.push({
      sectionId: section.id,
      action: isRead ? "read" : "skim",
      sentiment: r.sentiment,
      thought: r.thought,
    });

    // Objection effects: guaranteed on careful read, 35% chance on skim
    // (headlines still carry some signal).
    const applyEffects = isRead || rng() < 0.35;
    if (applyEffects) {
      for (const eff of r.objectionEffects) {
        if (eff.effect === "resolved") {
          // Skeptical personas sometimes don't buy the claim.
          if (rng() < 1 - persona.skepticism * 0.4) {
            resolved.add(eff.objectionId);
            aggravated.delete(eff.objectionId);
            objectionUpdates.push({
              objectionId: eff.objectionId,
              sectionId: section.id,
              effect: "resolved",
              note: eff.note,
            });
          }
        } else {
          aggravated.add(eff.objectionId);
          resolved.delete(eff.objectionId);
          objectionUpdates.push({
            objectionId: eff.objectionId,
            sectionId: section.id,
            effect: "aggravated",
            note: eff.note,
          });
        }
      }
    }

    // CTA decision at any section with a button, gated by the objection ledger.
    const hasButton = Boolean(section.ctaLabel) || section.type === "cta";
    if (hasButton && !converted) {
      const criticalResolved = critical.every((c) => resolved.has(c));
      const aggravationPenalty = Math.pow(0.55, aggravated.size);
      const pClick = criticalResolved
        ? reading.ctaInclination * persona.ctaPropensity * aggravationPenalty
        : 0.02; // rare curiosity click
      if (rng() < pClick) {
        converted = true;
        clock += 800;
        events.push({ type: "cta_click", sectionId: section.id, at: clock });
        break;
      }
    }

    // Continue or bounce (never bounce "at" the final section - that's exit_complete).
    if (i < variant.sections.length - 1) {
      const pContinue = Math.min(0.98, r.continueDesire * fatigue + 0.05);
      if (rng() > pContinue) {
        bounced = true;
        clock += 300;
        events.push({ type: "bounce", sectionId: section.id, at: clock });
        break;
      }
    }
  }

  if (!converted && !bounced) {
    clock += 300;
    events.push({ type: "exit_complete", at: clock });
  }

  return {
    id: `${variant.id}__${persona.id}__${visitIndex}`,
    variantId: variant.id,
    personaId: persona.id,
    personaVersion: persona.version,
    generation,
    events,
    reactions,
    objectionUpdates,
    converted,
    scrollDepth: sectionsSeen / variant.sections.length,
    totalDwellMs: dwellTotal,
    verdict: reading.verdict,
    unresolvedCritical: critical.filter((c) => !resolved.has(c)),
  };
}
