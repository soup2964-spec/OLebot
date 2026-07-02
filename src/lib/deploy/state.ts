import fs from "fs";
import path from "path";
import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/lib/schema/page";

export interface DeployRecord {
  at: string;
  variantId: string;
  runId: string;
  runVersion: number;
  reason: string;
  patchCount: number;
}

export interface DeployState {
  deployVersion: number;
  lastPromotedAt: string | null;
  lastPromotedVariantId: string | null;
  /** Gen-0 snapshot before the latest production merge (for comparison grid). */
  previousVariants: PageVariant[];
  /** Gen-0 snapshot after the latest production merge. */
  currentVariants: PageVariant[];
  htmlVariantIds: string[];
  history: DeployRecord[];
}

const DEPLOY_PATH = path.join(process.cwd(), "data", "deploy-state.json");

const DEFAULT_STATE: DeployState = {
  deployVersion: 0,
  lastPromotedAt: null,
  lastPromotedVariantId: null,
  previousVariants: [...GENERATION_0],
  currentVariants: [...GENERATION_0],
  htmlVariantIds: GENERATION_0.map((v) => v.id),
  history: [],
};

export function loadDeployState(): DeployState {
  try {
    const parsed = JSON.parse(fs.readFileSync(DEPLOY_PATH, "utf8")) as Partial<DeployState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      previousVariants: parsed.previousVariants ?? DEFAULT_STATE.previousVariants,
      currentVariants: parsed.currentVariants ?? DEFAULT_STATE.currentVariants,
      htmlVariantIds: parsed.htmlVariantIds ?? DEFAULT_STATE.htmlVariantIds,
      history: parsed.history ?? [],
    };
  } catch {
    return { ...DEFAULT_STATE, previousVariants: [...GENERATION_0], currentVariants: [...GENERATION_0] };
  }
}

export function saveDeployState(state: DeployState) {
  fs.mkdirSync(path.dirname(DEPLOY_PATH), { recursive: true });
  fs.writeFileSync(DEPLOY_PATH, JSON.stringify(state, null, 2), "utf8");
}
