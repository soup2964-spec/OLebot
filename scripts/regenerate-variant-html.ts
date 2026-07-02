/**
 * Regenerate static HTML for all variants and optionally promote the best candidate.
 */
import { loadRun } from "../src/lib/registry";
import { promoteAndDeploy } from "../src/lib/deploy/promote";

const forceBest = process.argv.includes("--promote");

function main() {
  const run = loadRun();
  if (!run) {
    console.error("No data/run.json — run npm run demo first.");
    process.exit(1);
  }

  const result = promoteAndDeploy(run, { forceBest: forceBest || true });
  console.log(JSON.stringify(result, null, 2));
}

main();
