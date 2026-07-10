import {
  getLabDocument,
  getLabDocumentSync,
  LAB_DOC,
  setLabDocument,
} from "@/platform/supabase/lab-documents";
import type { ExperimentRun } from "@/platform/schema/experiment";
import { compactRunForStorage } from "@/domains/evolve/compact-run";

let cachedRun: ExperimentRun | null | undefined;

export async function loadRun(): Promise<ExperimentRun | null> {
  if (cachedRun !== undefined) return cachedRun;
  cachedRun = await getLabDocument<ExperimentRun>(LAB_DOC.ACTIVE_RUN);
  return cachedRun;
}

export function loadRunSync(): ExperimentRun | null {
  return getLabDocumentSync<ExperimentRun>(LAB_DOC.ACTIVE_RUN);
}

export async function saveRun(run: ExperimentRun) {
  cachedRun = run;
  await setLabDocument(LAB_DOC.ACTIVE_RUN, compactRunForStorage(run));
}

export function invalidateRunCache() {
  cachedRun = undefined;
}
