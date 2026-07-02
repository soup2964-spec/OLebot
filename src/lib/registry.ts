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

export function loadRun(): ExperimentRun | null {
  try {
    const raw = fs.readFileSync(RUN_PATH, "utf-8");
    return JSON.parse(raw) as ExperimentRun;
  } catch {
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
