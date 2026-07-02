import type { PageVariant } from "@/lib/schema/page";
import { getLabDocument, LAB_DOC, setLabDocument } from "@/lib/supabase/lab-documents";

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

let loopCache: LoopState | undefined;

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
  if (loopCache) return loopCache;
  const raw = await getLabDocument<Partial<LoopState>>(LAB_DOC.LOOP_STATE);
  loopCache = {
    ...DEFAULT_STATE,
    ...raw,
    experimentHistory: normalizeExperimentHistory(raw?.experimentHistory ?? []),
  };
  return loopCache;
}

export function isAutonomousMode(state?: LoopState): boolean {
  return Boolean(state?.autonomous);
}

export async function saveLoopState(state: LoopState) {
  loopCache = {
    ...state,
    experimentHistory: normalizeExperimentHistory(state.experimentHistory ?? []),
  };
  await setLabDocument(LAB_DOC.LOOP_STATE, loopCache);
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
  loopCache = undefined;
}
