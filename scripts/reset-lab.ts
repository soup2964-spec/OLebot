/**
 * Wipe experiment runs, history, progress, and bred pages.
 * Keeps Generation 0 baseline pages (v0–v5) for the Base tab.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { GENERATION_0 } from "../src/content/variants";
import { LAB_DOC, invalidateLabDocumentCache, setLabDocument } from "../src/platform/supabase/lab-documents";
import { getSupabaseAdmin } from "../src/platform/supabase/server";

const ROOT = process.cwd();
const VARIANTS_DIR = path.join(ROOT, "public", "baseline", "variants");
const GEN0_IDS = new Set(GENERATION_0.map((v) => v.id));

const DEFAULT_LOOP_STATE = {
  autonomous: false,
  llmPersonas: false,
  runVersion: 0,
  lastSyncAt: null,
  lastVisitorCount: 0,
  heartbeatVisits: 0,
  lastCalibrationVersion: 0,
  lastRunId: null,
  syncHistory: [],
  experimentHistory: [],
};

const DEFAULT_DEPLOY_STATE = {
  deployVersion: 0,
  lastPromotedAt: null,
  lastPromotedVariantId: null,
  previousVariants: [...GENERATION_0],
  currentVariants: [...GENERATION_0],
  htmlVariantIds: GENERATION_0.map((v) => v.id),
  history: [],
};

const IDLE_PROGRESS = {
  status: "idle" as const,
  stage: "starting" as const,
  mode: null,
  generation: 0,
  totalGenerations: 0,
  label: "Idle",
  detail: null,
  percent: 0,
  startedAt: null,
  updatedAt: null,
  error: null,
  experimentNumber: null,
  bredVariants: [],
};

function rmIfExists(p: string) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function clearLocalFiles() {
  rmIfExists(path.join(ROOT, "data", "run.json"));
  rmIfExists(path.join(ROOT, "data", "calibration.json"));
  rmIfExists(path.join(ROOT, "data", "aa-test.json"));
  rmIfExists(path.join(ROOT, "experiment-run.log"));

  const expDir = path.join(ROOT, "data", "experiments");
  if (fs.existsSync(expDir)) {
    for (const f of fs.readdirSync(expDir)) {
      if (f.endsWith(".json")) rmIfExists(path.join(expDir, f));
    }
  }

  if (fs.existsSync(VARIANTS_DIR)) {
    for (const f of fs.readdirSync(VARIANTS_DIR)) {
      if (!f.endsWith(".html")) continue;
      const id = f.replace(/\.html$/, "");
      if (!GEN0_IDS.has(id)) {
        rmIfExists(path.join(VARIANTS_DIR, f));
        console.log(`  removed bred page ${f}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(ROOT, "data", "loop-state.json"),
    JSON.stringify(DEFAULT_LOOP_STATE, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "data", "deploy-state.json"),
    JSON.stringify(DEFAULT_DEPLOY_STATE, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "data", "experiment-progress.json"),
    JSON.stringify(IDLE_PROGRESS, null, 2),
    "utf8"
  );
}

async function clearSupabase() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    console.log("Supabase not configured — local files only.");
    return;
  }

  const { data: docs } = await sb.from("lab_documents").select("id");
  const experimentIds = (docs ?? [])
    .map((d) => d.id as string)
    .filter((id) => id.startsWith("experiment:") || id === "active_run");

  if (experimentIds.length) {
    const { error } = await sb.from("lab_documents").delete().in("id", experimentIds);
    if (error) throw new Error(`lab_documents delete: ${error.message}`);
    console.log(`  deleted ${experimentIds.length} lab_documents row(s)`);
  }

  await setLabDocument(LAB_DOC.LOOP_STATE, DEFAULT_LOOP_STATE);
  await setLabDocument(LAB_DOC.DEPLOY_STATE, DEFAULT_DEPLOY_STATE);
  await setLabDocument(LAB_DOC.EXPERIMENT_PROGRESS, IDLE_PROGRESS);

  const { error: calErr } = await sb.from("lab_documents").delete().eq("id", "calibration");
  if (calErr) throw new Error(`calibration delete: ${calErr.message}`);

  const { error: evErr } = await sb.from("lab_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (evErr) console.warn(`  lab_events clear: ${evErr.message}`);
  else console.log("  cleared lab_events");

  const { error: sessErr } = await sb.from("lab_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (sessErr) console.warn(`  lab_sessions clear: ${sessErr.message}`);
  else console.log("  cleared lab_sessions");

  invalidateLabDocumentCache();
}

async function main() {
  console.log("Resetting lab state (keeping Base tab pages v0–v5)…\n");

  console.log("Local files:");
  clearLocalFiles();
  console.log("  reset data/*.json");

  console.log("\nSupabase:");
  await clearSupabase();

  console.log("\nRegenerating Generation 0 HTML…");
  const { execSync } = await import("child_process");
  execSync("npm run prepare:variants", { cwd: ROOT, stdio: "inherit" });

  console.log("\nDone. Restart the dev server so in-memory caches pick up the reset.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
