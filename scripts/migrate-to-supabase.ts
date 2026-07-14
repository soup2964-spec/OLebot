/**
 * Upload local data/*.json files to Supabase lab_documents.
 * Run once after adding Supabase env vars, or to backfill a new deploy.
 *
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { LAB_DOC, setLabDocument, labDocumentsEnabled } from "../src/shared/db/lab-documents";

async function migrateFile(id: string, filePath: string) {
  const full = path.join(process.cwd(), filePath);
  if (!fs.existsSync(full)) {
    console.log(`  skip ${id} — no ${filePath}`);
    return;
  }
  const doc = JSON.parse(fs.readFileSync(full, "utf8"));
  await setLabDocument(id, doc);
  const kb = (fs.statSync(full).size / 1024).toFixed(1);
  console.log(`  ✓ ${id} (${kb} KB)`);
}

async function main() {
  if (!labDocumentsEnabled()) {
    console.error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Migrating local JSON → Supabase lab_documents…");

  await migrateFile(LAB_DOC.ACTIVE_RUN, "data/run.json");
  await migrateFile(LAB_DOC.LOOP_STATE, "data/loop-state.json");
  await migrateFile(LAB_DOC.DEPLOY_STATE, "data/deploy-state.json");
  await migrateFile(LAB_DOC.CALIBRATION, "data/calibration.json");
  await migrateFile(LAB_DOC.EXPERIMENT_PROGRESS, "data/experiment-progress.json");

  const expDir = path.join(process.cwd(), "data", "experiments");
  if (fs.existsSync(expDir)) {
    for (const file of fs.readdirSync(expDir)) {
      const m = /^experiment-(\d+)\.json$/.exec(file);
      if (!m) continue;
      await migrateFile(LAB_DOC.experiment(Number(m[1])), path.join("data", "experiments", file));
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
