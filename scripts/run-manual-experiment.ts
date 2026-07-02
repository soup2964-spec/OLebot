/**
 * CLI entry — manual experiment (demo or LLM per control-center toggle in loop-state.json).
 * Usage: npx tsx scripts/run-manual-experiment.ts
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const { manualExperimentMode } = await import("../src/lib/loop/manual-experiment");
  const { runManualExperiment } = await import("../src/lib/loop/manual-experiment");

  const mode = manualExperimentMode();
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
