import { GENERATION_0 } from "@/config/variants";
import { loadDemoPreloadSnapshot } from "@/lib/evolve/demo-preload";
import type { ExperimentRun } from "@/lib/schema/experiment";

/** Gen-0 simulation results only — no bred offspring (demo starting state). */
export function buildGen0PreloadRun(): ExperimentRun {
  const snap = loadDemoPreloadSnapshot();
  return {
    id: `run-${snap.seed}`,
    createdAt: new Date().toISOString(),
    personaSetVersion: 1,
    variants: [...GENERATION_0],
    generations: [
      {
        generation: 0,
        variantIds: snap.pool.map((v) => v.id),
        visits: snap.visits,
        totalVisits: snap.totalVisits,
        metrics: snap.metrics,
        allocationHistory: snap.allocationHistory,
        report: snap.report,
        decisions: snap.decisions,
        offspringIds: [],
      },
    ],
  };
}
