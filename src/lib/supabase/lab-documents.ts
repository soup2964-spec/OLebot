import fs from "fs";
import path from "path";
import { getSupabaseAdmin, supabaseConfigured } from "./server";

/** Singleton docs and experiment snapshots — all persisted under lab_documents. */
export const LAB_DOC = {
  ACTIVE_RUN: "active_run",
  LOOP_STATE: "loop_state",
  DEPLOY_STATE: "deploy_state",
  CALIBRATION: "calibration",
  EXPERIMENT_PROGRESS: "experiment_progress",
  experiment: (n: number) => `experiment:${n}`,
} as const;

const FS_PATHS: Record<string, string> = {
  [LAB_DOC.ACTIVE_RUN]: "data/run.json",
  [LAB_DOC.LOOP_STATE]: "data/loop-state.json",
  [LAB_DOC.DEPLOY_STATE]: "data/deploy-state.json",
  [LAB_DOC.CALIBRATION]: "data/calibration.json",
  [LAB_DOC.EXPERIMENT_PROGRESS]: "data/experiment-progress.json",
};

function fsPathForId(id: string): string | null {
  if (FS_PATHS[id]) return FS_PATHS[id];
  const m = /^experiment:(\d+)$/.exec(id);
  if (m) return `data/experiments/experiment-${m[1]}.json`;
  return null;
}

export function labDocumentsEnabled(): boolean {
  return supabaseConfigured();
}

function readFs<T>(id: string): T | null {
  const rel = fsPathForId(id);
  if (!rel) return null;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeFs<T>(id: string, doc: T) {
  const rel = fsPathForId(id);
  if (!rel) return;
  const full = path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(doc, null, 2), "utf8");
}

export async function getLabDocument<T>(id: string): Promise<T | null> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from("lab_documents")
      .select("doc")
      .eq("id", id)
      .maybeSingle();
    if (!error && data?.doc != null) {
      return data.doc as T;
    }
  }
  return readFs<T>(id);
}

export async function setLabDocument<T>(id: string, doc: T): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb.from("lab_documents").upsert({
      id,
      doc: doc as object,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(`lab_documents upsert failed (${id}): ${error.message}`);
    }
  }
  writeFs(id, doc);
}

/** Sync read — filesystem only (build scripts / static generation). */
export function getLabDocumentSync<T>(id: string): T | null {
  return readFs<T>(id);
}
