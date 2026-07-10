import type { PageVariant, ObjectionId } from "@/platform/schema/page";
import type { Persona } from "@/platform/schema/persona";
import type { Visit, VisitEvent, SectionReaction, ObjectionUpdate } from "@/platform/schema/events";
import type { PersonaReading } from "./reading";
import { gaussian, type Rng } from "./rng";
import {
  isBounceExit,
  isCtaSection,
  POSTHOG_EVENTS,
  scrollDepthMilestones,
} from "@/domains/analytics/posthog-events";

/**
 * Samples one stochastic visit from a PersonaReading.
 * Emits PostHog-style events: $pageview, section_viewed, scroll_depth,
 * section_engaged (sim detail), book_demo_click, page_exit (sim) / $pageleave (live).
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
  let ctaViewedFired = false;
  const firedScroll = new Set<number>();
  const sectionsViewedIds = new Set<string>();

  const pushPageExit = (atSectionId?: string, forceBounced?: boolean) => {
    const maxScrollDepth = sectionsSeen / variant.sections.length;
    events.push({
      type: POSTHOG_EVENTS.PAGE_EXIT,
      sectionId: atSectionId,
      at: clock,
      bounced: forceBounced ?? isBounceExit(maxScrollDepth),
      maxScrollDepth,
      sectionsViewedCount: sectionsViewedIds.size,
      converted,
      unresolvedObjections: critical.filter((c) => !resolved.has(c)),
    });
  };

  events.push({ type: POSTHOG_EVENTS.PAGEVIEW, at: 0 });

  for (let i = 0; i < variant.sections.length; i++) {
    const section = variant.sections[i];
    const r = reading.sections[i];
    sectionsSeen++;
    sectionsViewedIds.add(section.id);
    events.push({
      type: POSTHOG_EVENTS.SECTION_VIEWED,
      sectionId: section.id,
      at: clock,
    });

    const depthFraction = sectionsSeen / variant.sections.length;
    for (const pct of scrollDepthMilestones(depthFraction)) {
      if (!firedScroll.has(pct)) {
        firedScroll.add(pct);
        events.push({
          type: POSTHOG_EVENTS.SCROLL_DEPTH,
          at: clock,
          scrollDepthPct: pct,
        });
      }
    }

    const overBudget = Math.max(0, dwellTotal - patienceMs) / patienceMs;
    const fatigue = Math.max(0.15, 1 - overBudget);

    const pRead = r.appeal * (1 - persona.skimPropensity * 0.6) * fatigue;
    const isRead = rng() < pRead;
    const dwellMs = Math.round(
      section.readSeconds * 1000 * (isRead ? 0.85 + rng() * 0.45 : 0.15 + rng() * 0.25)
    );
    clock += dwellMs;
    dwellTotal += dwellMs;

    events.push({
      type: POSTHOG_EVENTS.SECTION_ENGAGED,
      sectionId: section.id,
      at: clock,
      dwellMs,
      engagement: isRead ? "read" : "skim",
    });
    reactions.push({
      sectionId: section.id,
      action: isRead ? "read" : "skim",
      sentiment: r.sentiment,
      thought: r.thought,
    });

    const applyEffects = isRead || rng() < 0.35;
    if (applyEffects) {
      for (const eff of r.objectionEffects) {
        if (eff.effect === "resolved") {
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

    const hasButton = Boolean(section.ctaLabel) || section.type === "cta";
    if (hasButton && !ctaViewedFired && (isCtaSection(section.id) || section.type === "cta")) {
      ctaViewedFired = true;
      events.push({
        type: POSTHOG_EVENTS.CTA_VIEWED,
        sectionId: section.id,
        at: clock,
        ctaLabel: section.ctaLabel,
      });
    }

    if (hasButton && !converted) {
      const criticalResolved = critical.every((c) => resolved.has(c));
      const aggravationPenalty = Math.pow(0.55, aggravated.size);
      const pClick = criticalResolved
        ? reading.ctaInclination * persona.ctaPropensity * aggravationPenalty
        : 0.02;
      if (rng() < pClick) {
        converted = true;
        clock += 800;
        events.push({
          type: POSTHOG_EVENTS.BOOK_DEMO_CLICK,
          sectionId: section.id,
          at: clock,
          ctaLabel: section.ctaLabel,
        });
        break;
      }
    }

    if (i < variant.sections.length - 1) {
      const pContinue = Math.min(0.98, r.continueDesire * fatigue + 0.05);
      if (rng() > pContinue) {
        bounced = true;
        clock += 300;
        pushPageExit(section.id, true);
        break;
      }
    }
  }

  if (!converted && !bounced) {
    clock += 300;
    pushPageExit();
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
