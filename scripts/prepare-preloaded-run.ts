/**
 * Write data/run.json from demo-preload-gen0.json — Generation 0 results only,
 * no bred offspring. Run the experiment from Control Center to populate New variants.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { compactRunForStorage } from "../src/lib/evolve/compact-run";
import { buildGen0PreloadRun } from "../src/lib/lab/gen0-preload-run";

const OUT = path.join(process.cwd(), "data", "run.json");

async function main() {
  const run = buildGen0PreloadRun();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(compactRunForStorage(run), null, 2), "utf8");
  const top = run.generations[0]?.metrics[0];
  console.log(`Wrote ${OUT} (gen-0 preload only — no bred variants)`);
  if (top) {
    console.log(`  top variant: ${top.variantId} fitness=${top.fitness.toFixed(1)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
