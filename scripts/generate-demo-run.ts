/**
 * CLI entry — writes active run to Supabase (and data/run.json fallback).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { runDemoExperiment } from "../src/lib/evolve/demo-run";
import { writeAllVariantHtml } from "../src/lib/deploy/write-html";
import { saveRun } from "../src/lib/registry";

const SEED = 20260701;

async function main() {
  console.log("Running demo experiment...");
  const run = await runDemoExperiment({ seed: SEED });
  await saveRun(run);
  console.log(`Saved run ${run.id} to Supabase + local fallback`);

  const htmlResults = writeAllVariantHtml(run.variants);
  console.log(`Wrote ${htmlResults.length} variant HTML replicas`);

  for (const g of run.generations) {
    console.log(`\nGen ${g.generation}:`);
    for (const m of g.metrics.slice(0, 4)) {
      console.log(
        `  ${m.variantId.padEnd(18)} fitness=${m.fitness.toFixed(1)} conv=${(m.conversionRate * 100).toFixed(1)}%`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
