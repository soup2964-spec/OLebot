import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/lib/schema/page";
import type { ExperimentRun } from "@/lib/schema/experiment";
import fs from "fs";
import path from "path";

/**
 * Variant + run registry. The precomputed experiment lives in data/run.json
 * (committed to the repo - no database needed). Generated variants come from
 * the run; Generation 0 comes from config.
 */

const RUN_PATH = path.join(process.cwd(), "data", "run.json");

let cachedRun: ExperimentRun | null | undefined;

export function loadRun(): ExperimentRun | null {
  if (cachedRun !== undefined) return cachedRun;
  try {
    const raw = fs.readFileSync(RUN_PATH, "utf-8");
    cachedRun = JSON.parse(raw) as ExperimentRun;
    return cachedRun;
  } catch {
    cachedRun = null;
    return null;
  }
}

export function allVariants(): PageVariant[] {
  const run = loadRun();
  if (run) return run.variants;
  return GENERATION_0;
}

export function getVariant(id: string): PageVariant | undefined {
  return allVariants().find((v) => v.id === id);
}

export function getVisit(generation: number, visitId: string) {
  const run = loadRun();
  return run?.generations[generation]?.visits.find((v) => v.id === visitId);
}

/** Slim index for client components — avoids shipping 1.6MB of visit traces. */
export function visitIndex(run: ExperimentRun) {
  return run.generations.map((g) => ({
    generation: g.generation,
    variantIds: g.variantIds,
    metrics: g.metrics,
    visits: g.visits.map((v) => ({
      id: v.id,
      personaId: v.personaId,
      variantId: v.variantId,
      converted: v.converted,
    })),
  }));
}

export type VisitIndex = ReturnType<typeof visitIndex>;
