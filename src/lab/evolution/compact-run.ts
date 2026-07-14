import type { GenerationRun, ExperimentRun } from "@/shared/schema/experiment";
import type { Visit } from "@/shared/schema/events";

const DEFAULT_STORED_VISITS_PER_GEN = 20;

export function storedVisitsPerGenerationCap(): number {
  const fromEnv = Number(process.env.STORED_VISITS_PER_GEN);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : DEFAULT_STORED_VISITS_PER_GEN;
}

/** Stratified sample: conversions + losses per variant, capped per arm. */
export function sampleVisitsForStorage(
  visits: Visit[],
  variantIds: string[],
  storedCap: number
): Visit[] {
  if (!visits.length || storedCap <= 0) return [];
  if (visits.length <= storedCap) return visits;

  const perVariantCap = Math.max(8, Math.floor(storedCap / Math.max(1, variantIds.length)));
  const sampled: Visit[] = [];

  for (const variantId of variantIds) {
    const forVariant = visits.filter((v) => v.variantId === variantId);
    const converted = forVariant.filter((v) => v.converted);
    const lost = forVariant.filter((v) => !v.converted);
    const keepConv = converted.slice(0, Math.ceil(perVariantCap / 2));
    const keepLost = lost.slice(0, perVariantCap - keepConv.length);
    sampled.push(...keepConv, ...keepLost);
  }

  return sampled.slice(0, storedCap);
}

export function compactGenerationForStorage(
  generation: GenerationRun,
  storedCap = storedVisitsPerGenerationCap()
): GenerationRun {
  const totalVisits = generation.totalVisits ?? generation.visits.length;
  if (generation.visits.length <= storedCap) {
    return { ...generation, totalVisits };
  }

  return {
    ...generation,
    visits: sampleVisitsForStorage(generation.visits, generation.variantIds, storedCap),
    totalVisits,
  };
}

/** Shrink visit traces before Supabase/filesystem persist — metrics stay full-fidelity. */
export function compactRunForStorage(
  run: ExperimentRun,
  storedCap = storedVisitsPerGenerationCap()
): ExperimentRun {
  return {
    ...run,
    generations: run.generations.map((g) => compactGenerationForStorage(g, storedCap)),
  };
}
