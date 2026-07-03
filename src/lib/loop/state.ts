import type { PageVariant } from "@/lib/schema/page";
import { getLabDocument, invalidateLabDocumentCache, LAB_DOC, setLabDocument } from "@/lib/supabase/lab-documents";

export interface LoopState {
  autonomous: boolean;
  llmPersonas: boolean;
  runVersion: number;
  lastSyncAt: string | null;
  lastVisitorCount: number;
  heartbeatVisits: number;
  lastCalibrationVersion: number;
  lastRunId: string | null;
  syncHistory: { at: string; visitors: number; reason: string }[];
  experimentHistory: ExperimentHistoryEntry[];
}

export interface ExperimentHistoryEntry {
  experimentNumber: number;
  runId: string;
  previousVariants: PageVariant[];
  currentVariants: PageVariant[];
  /** True while the run is still in progress or ended before full save. */
  partial?: boolean;
}

const DEFAULT_STATE: LoopState = {
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

export function normalizeExperimentHistory(
  history: ExperimentHistoryEntry[] = []
): ExperimentHistoryEntry[] {
  if (!history.length) return [];
  const sorted = [...history].sort(
    (a, b) => a.experimentNumber - b.experimentNumber || a.runId.localeCompare(b.runId)
  );
  return sorted.map((entry, index) => ({
    ...entry,
    experimentNumber: index + 1,
  }));
}

export function nextExperimentNumber(history: ExperimentHistoryEntry[] = []): number {
  return normalizeExperimentHistory(history).length + 1;
}

export async function loadLoopState(): Promise<LoopState> {
  const raw = await getLabDocument<Partial<LoopState>>(LAB_DOC.LOOP_STATE);
  return {
    ...DEFAULT_STATE,
    ...raw,
    experimentHistory: normalizeExperimentHistory(raw?.experimentHistory ?? []),
  };
}

export function isAutonomousMode(state?: LoopState): boolean {
  return Boolean(state?.autonomous);
}

export async function saveLoopState(state: LoopState) {
  await setLabDocument(LAB_DOC.LOOP_STATE, {
    ...state,
    experimentHistory: normalizeExperimentHistory(state.experimentHistory ?? []),
  });
}

export async function recordHeartbeat() {
  const state = await loadLoopState();
  state.heartbeatVisits += 1;
  await saveLoopState(state);
  return state.heartbeatVisits;
}

export function minNewVisitors() {
  return Number(process.env.LOOP_MIN_NEW_VISITORS ?? 5);
}

export function minSyncIntervalMs() {
  return Number(process.env.LOOP_MIN_SYNC_MS ?? 3 * 60 * 1000);
}

export function invalidateLoopCache() {
  invalidateLabDocumentCache(LAB_DOC.LOOP_STATE);
}
