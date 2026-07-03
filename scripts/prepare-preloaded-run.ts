/**
 * Write data/run.json from demo-preload-gen0.json — Generation 0 results only,
 * no bred offspring. Run the experiment from Control Center to populate New variants.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { GENERATION_0 } from "../src/config/variants";
import { loadDemoPreloadSnapshot } from "../src/lib/evolve/demo-preload";
import { compactRunForStorage } from "../src/lib/evolve/compact-run";
import type { ExperimentRun } from "../src/lib/schema/experiment";

const OUT = path.join(process.cwd(), "data", "run.json");

async function main() {
  const snap = loadDemoPreloadSnapshot();
  const run: ExperimentRun = {
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

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(compactRunForStorage(run), null, 2), "utf8");
  console.log(`Wrote ${OUT} (gen-0 preload only — no bred variants)`);
  console.log(`  top variant: ${snap.metrics[0]?.variantId} fitness=${snap.metrics[0]?.fitness.toFixed(1)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
