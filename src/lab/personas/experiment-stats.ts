import type { VariantMetrics } from "@/shared/schema/events";
import type { Persona } from "@/shared/schema/persona";

export interface PersonaExperimentStats {
  visits: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgScroll: number;
  /** Share of traffic this persona received on this variant (0–1). */
  trafficShare: number;
}

export function personaStatsForVariant(
  metrics: VariantMetrics | undefined,
  personas: Persona[]
): Map<string, PersonaExperimentStats> {
  const result = new Map<string, PersonaExperimentStats>();
  const totalVisits = metrics?.visits ?? 0;

  for (const persona of personas) {
    const row = metrics?.byPersona?.[persona.id];
    const visits = row?.visits ?? 0;
    const conversions = row?.conversions ?? 0;
    result.set(persona.id, {
      visits,
      conversions,
      conversionRate: visits ? conversions / visits : 0,
      bounceRate: 0,
      avgScroll: 0,
      trafficShare: totalVisits ? visits / totalVisits : 0,
    });
  }

  return result;
}

export function formatPersonaStatLine(stats: PersonaExperimentStats | undefined): string {
  if (!stats?.visits) return "No visits in this run";
  return `${stats.visits} visits · ${(stats.conversionRate * 100).toFixed(0)}% conv`;
}
