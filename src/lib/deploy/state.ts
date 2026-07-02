import { GENERATION_0 } from "@/config/variants";
import { getLabDocument, getLabDocumentSync, LAB_DOC, setLabDocument } from "@/lib/supabase/lab-documents";
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
  previousVariants: PageVariant[];
  currentVariants: PageVariant[];
  htmlVariantIds: string[];
  history: DeployRecord[];
}

const DEFAULT_STATE: DeployState = {
  deployVersion: 0,
  lastPromotedAt: null,
  lastPromotedVariantId: null,
  previousVariants: [...GENERATION_0],
  currentVariants: [...GENERATION_0],
  htmlVariantIds: GENERATION_0.map((v) => v.id),
  history: [],
};

function mergeDeployState(parsed: Partial<DeployState> | null): DeployState {
  if (!parsed) {
    return { ...DEFAULT_STATE, previousVariants: [...GENERATION_0], currentVariants: [...GENERATION_0] };
  }
  return {
    ...DEFAULT_STATE,
    ...parsed,
    previousVariants: parsed.previousVariants ?? DEFAULT_STATE.previousVariants,
    currentVariants: parsed.currentVariants ?? DEFAULT_STATE.currentVariants,
    htmlVariantIds: parsed.htmlVariantIds ?? DEFAULT_STATE.htmlVariantIds,
    history: parsed.history ?? [],
  };
}

export async function loadDeployState(): Promise<DeployState> {
  const parsed = await getLabDocument<Partial<DeployState>>(LAB_DOC.DEPLOY_STATE);
  return mergeDeployState(parsed);
}

export function loadDeployStateSync(): DeployState {
  const parsed = getLabDocumentSync<Partial<DeployState>>(LAB_DOC.DEPLOY_STATE);
  return mergeDeployState(parsed);
}

export async function saveDeployState(state: DeployState) {
  await setLabDocument(LAB_DOC.DEPLOY_STATE, state);
}
