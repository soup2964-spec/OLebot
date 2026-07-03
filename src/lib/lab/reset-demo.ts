import fs from "fs";
import path from "path";
import { GENERATION_0 } from "@/config/variants";
import { removeBredVariantHtml } from "@/lib/deploy/write-html";
import { saveDeployState } from "@/lib/deploy/state";
import { demoPreloadEnabled } from "@/lib/evolve/demo-preload";
import { buildGen0PreloadRun } from "@/lib/lab/gen0-preload-run";
import { resetExperimentProgress } from "@/lib/loop/experiment-progress";
import { invalidateLoopCache, loadLoopState, saveLoopState } from "@/lib/loop/state";
import { labFsWritable } from "@/lib/lab-fs";
import { invalidateRunCache, saveRun } from "@/lib/registry";
import {
  invalidateLabDocumentCache,
  LAB_DOC,
  listExperimentNumbers,
} from "@/lib/supabase/lab-documents";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface ResetDemoResult {
  restoredPreload: boolean;
  removedHtml: string[];
}

function rmIfExists(p: string) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function clearLocalExperimentFiles() {
  if (!labFsWritable()) return;

  const expDir = path.join(process.cwd(), "data", "experiments");
  if (!fs.existsSync(expDir)) return;
  for (const f of fs.readdirSync(expDir)) {
    if (f.endsWith(".json")) rmIfExists(path.join(expDir, f));
  }
}

async function deleteRemoteExperimentDocs() {
  const sb = getSupabaseAdmin();
  if (!sb) return;

  const numbers = await listExperimentNumbers();
  const ids = [...numbers.map((n) => LAB_DOC.experiment(n)), LAB_DOC.ACTIVE_RUN];
  if (ids.length) {
    const { error } = await sb.from("lab_documents").delete().in("id", ids);
    if (error) throw new Error(`lab_documents delete: ${error.message}`);
  }
}

async function deleteActiveRunLocally() {
  if (!labFsWritable()) return;
  rmIfExists(path.join(process.cwd(), "data", "run.json"));
}

/**
 * Reset the lab to demo starting state: clear experiment history, remove bred pages,
 * and restore gen-0 preload when DEMO_PRELOAD=1.
 */
export async function resetDemoLab(): Promise<ResetDemoResult> {
  const loop = await loadLoopState();
  const restorePreload = demoPreloadEnabled();

  await deleteRemoteExperimentDocs();
  clearLocalExperimentFiles();
  await deleteActiveRunLocally();

  await saveLoopState({
    autonomous: loop.autonomous,
    llmPersonas: loop.llmPersonas,
    runVersion: loop.runVersion,
    lastSyncAt: null,
    lastVisitorCount: 0,
    heartbeatVisits: loop.heartbeatVisits,
    lastCalibrationVersion: loop.lastCalibrationVersion,
    lastRunId: null,
    syncHistory: [],
    experimentHistory: [],
  });

  await saveDeployState({
    deployVersion: 0,
    lastPromotedAt: null,
    lastPromotedVariantId: null,
    previousVariants: [...GENERATION_0],
    currentVariants: [...GENERATION_0],
    htmlVariantIds: GENERATION_0.map((v) => v.id),
    history: [],
  });

  await resetExperimentProgress();

  if (restorePreload) {
    const run = buildGen0PreloadRun();
    await saveRun(run);
  } else {
    invalidateRunCache();
    if (labFsWritable()) {
      rmIfExists(path.join(process.cwd(), "data", "run.json"));
    }
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from("lab_documents").delete().eq("id", LAB_DOC.ACTIVE_RUN);
    }
  }

  const removedHtml = removeBredVariantHtml();

  invalidateRunCache();
  invalidateLoopCache();
  invalidateLabDocumentCache();

  return { restoredPreload: restorePreload, removedHtml };
}
