/**
 * CLI entry — manual experiment (demo or LLM per control-center toggle in loop-state.json).
 * Usage: npx tsx scripts/run-manual-experiment.ts
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const { manualExperimentMode, runManualExperiment } = await import(
    "../src/domains/loop/manual-experiment"
  );
  const { loadLoopState } = await import("../src/domains/loop/state");

  const state = await loadLoopState();
  const mode = manualExperimentMode(state);
  console.log(
    `Starting ${mode === "full" ? "full LLM" : "hybrid (heuristic readings + LLM eval/breed)"} experiment...\n`
  );

  const result = await runManualExperiment();
  console.log("\nDone:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
