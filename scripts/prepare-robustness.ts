/**
 * Precompute gen-0 ranking stability across many RNG seeds.
 * Anchors to the active experiment's seed + gen-0 winner from data/run.json.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import type { ExperimentRun } from "../src/lib/schema/experiment";
import {
  refreshRobustnessSnapshot,
  ROBUSTNESS_JSON_PATH,
} from "../src/lib/evolve/robustness-snapshot";

const RUN_PATH = path.join(process.cwd(), "data", "run.json");

function loadRunFromDisk(): ExperimentRun | null {
  if (!fs.existsSync(RUN_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(RUN_PATH, "utf8")) as ExperimentRun;
  } catch {
    return null;
  }
}

async function main() {
  const run = loadRunFromDisk();
  const snapshot = await refreshRobustnessSnapshot(run);
  console.log(`Wrote ${ROBUSTNESS_JSON_PATH}`);
  console.log(
    `  experiment winner: ${snapshot.referenceWinnerId} (seed ${snapshot.referenceSeed})`
  );
  console.log(
    `  most frequent #1: ${snapshot.modalWinnerId} (${snapshot.winnerStabilityPct.toFixed(0)}% stability)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
