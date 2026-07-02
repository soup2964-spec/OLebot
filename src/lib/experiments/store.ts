import type { ExperimentRun } from "@/lib/schema/experiment";
import type { ExperimentProgress } from "@/lib/schema/experiment-progress";
import { loadRun } from "@/lib/registry";
import { getLabDocument, LAB_DOC, setLabDocument } from "@/lib/supabase/lab-documents";
import { normalizeExperimentHistory, type ExperimentHistoryEntry } from "@/lib/loop/state";

export async function saveExperimentRun(experimentNumber: number, run: ExperimentRun) {
  await setLabDocument(LAB_DOC.experiment(experimentNumber), run);
}

export async function loadExperimentRun(experimentNumber: number): Promise<ExperimentRun | null> {
  return getLabDocument<ExperimentRun>(LAB_DOC.experiment(experimentNumber));
}

export async function ensureExperimentSnapshots(history: ExperimentHistoryEntry[] = []) {
  const normalized = normalizeExperimentHistory(history);
  const activeRun = await loadRun();
  if (!activeRun) return normalized;

  for (const entry of normalized) {
    if (await loadExperimentRun(entry.experimentNumber)) continue;
    if (entry.runId !== activeRun.id) continue;
    await saveExperimentRun(entry.experimentNumber, activeRun);
  }

  return normalized;
}

export async function loadRunForExperiment(
  experimentNumber: number,
  history: ExperimentHistoryEntry[] = [],
  progress: ExperimentProgress | null = null
): Promise<ExperimentRun | null> {
  await ensureExperimentSnapshots(history);
  const saved = await loadExperimentRun(experimentNumber);
  if (saved) return saved;

  const entry = normalizeExperimentHistory(history).find(
    (e) => e.experimentNumber === experimentNumber
  );
  if (entry) {
    const activeRun = await loadRun();
    if (activeRun?.id === entry.runId) return activeRun;
    return null;
  }

  if (
    progress?.status === "running" &&
    progress.experimentNumber === experimentNumber
  ) {
    const activeRun = await loadRun();
    if (activeRun && progress.startedAt && activeRun.createdAt >= progress.startedAt) {
      return activeRun;
    }
  }

  return null;
}
