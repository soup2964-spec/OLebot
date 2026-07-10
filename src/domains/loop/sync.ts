import { fetchPostHogMetrics } from "@/domains/calibration/posthog";
import { computeCalibration } from "@/domains/calibration/calibrate";
import { loadCalibration, saveCalibration } from "@/domains/calibration/store";
import { runDemoExperiment, simulatedMetricsFromRun } from "@/domains/evolve/demo-run";
import { promoteAndDeploy, type PromoteResult } from "@/domains/deploy/promote";
import { invalidateRunCache, loadRun, saveRun } from "@/platform/registry";
import {
  loadLoopState,
  minNewVisitors,
  minSyncIntervalMs,
  saveLoopState,
  isAutonomousMode,
} from "./state";

export interface LoopStatus {
  runVersion: number;
  lastSyncAt: string | null;
  liveVisitors: number;
  newVisitorsSinceSync: number;
  heartbeatVisits: number;
  posthogConfigured: boolean;
  readyToSync: boolean;
  nextSyncReason: string;
  calibrationVersion: number;
  lastRunId: string | null;
}

export interface SyncResult {
  synced: boolean;
  reason: string;
  runVersion?: number;
  calibrationVersion?: number;
  liveVisitors?: number;
  deploy?: PromoteResult;
}

async function liveVisitorCount(): Promise<number> {
  const state = await loadLoopState();
  let posthogCount = 0;
  if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID) {
    try {
      const real = await fetchPostHogMetrics(30);
      posthogCount = real?.aggregate.visitors ?? 0;
    } catch {
      /* heartbeat-only fallback */
    }
  }
  return Math.max(posthogCount, state.heartbeatVisits);
}

export async function getLoopStatus(): Promise<LoopStatus> {
  const state = await loadLoopState();
  const liveVisitors = await liveVisitorCount();
  const newVisitors = Math.max(0, liveVisitors - state.lastVisitorCount);
  const elapsed = state.lastSyncAt ? Date.now() - new Date(state.lastSyncAt).getTime() : Infinity;
  const posthogConfigured = Boolean(
    process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID
  );

  let readyToSync = false;
  let nextSyncReason = `Waiting for ${minNewVisitors()} new visitors (${newVisitors} so far)`;

  if (liveVisitors === 0) {
    nextSyncReason = "No live traffic yet — visit a variant page to start the loop";
  } else if (newVisitors >= minNewVisitors()) {
    readyToSync = true;
    nextSyncReason = `${newVisitors} new visitors since last sync — ready to recalibrate`;
  } else if (elapsed >= minSyncIntervalMs() && liveVisitors > state.lastVisitorCount) {
    readyToSync = true;
    nextSyncReason = "Sync interval elapsed with new traffic";
  }

  return {
    runVersion: state.runVersion,
    lastSyncAt: state.lastSyncAt,
    liveVisitors,
    newVisitorsSinceSync: newVisitors,
    heartbeatVisits: state.heartbeatVisits,
    posthogConfigured,
    readyToSync,
    nextSyncReason,
    calibrationVersion: state.lastCalibrationVersion,
    lastRunId: state.lastRunId,
  };
}

export async function syncLoop(force = false): Promise<SyncResult> {
  const state = await loadLoopState();
  const status = await getLoopStatus();

  if (!force && !status.readyToSync) {
    return { synced: false, reason: status.nextSyncReason, liveVisitors: status.liveVisitors };
  }

  if (status.liveVisitors === 0) {
    return { synced: false, reason: "No live traffic to calibrate from" };
  }

  let real = null;
  if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID) {
    real = await fetchPostHogMetrics(30);
  }

  if (!real || real.aggregate.visitors === 0) {
    real = {
      fetchedAt: new Date().toISOString(),
      source: "posthog" as const,
      windowDays: 30,
      byVariant: [],
      aggregate: {
        visitors: status.liveVisitors,
        conversionRate: 0.03,
        avgScrollDepth: 0.45,
        bounceRate: 0.55,
      },
    };
  }

  const existingRun = await loadRun();
  const simulated =
    (existingRun && simulatedMetricsFromRun(existingRun)) ?? {
      conversionRate: 0.025,
      bounceRate: 0.5,
      avgScrollDepth: 0.42,
    };

  const prevCal = await loadCalibration();
  const calibration = computeCalibration(real, simulated, (prevCal?.version ?? 0) + 1);
  await saveCalibration(calibration);

  const seed = Date.now() % 1_000_000_000;
  const run = await runDemoExperiment({ seed });
  await saveRun(run);
  invalidateRunCache();

  const next: typeof state = {
    ...state,
    runVersion: state.runVersion + 1,
    lastSyncAt: new Date().toISOString(),
    lastVisitorCount: status.liveVisitors,
    lastCalibrationVersion: calibration.version,
    lastRunId: run.id,
    syncHistory: [
      { at: new Date().toISOString(), visitors: status.liveVisitors, reason: force ? "manual" : "auto" },
      ...state.syncHistory.slice(0, 19),
    ],
  };
  await saveLoopState(next);

  const forceBest = process.env.AUTO_DEPLOY_BEST !== "0";
  const deploy = await promoteAndDeploy(run, { forceBest });

  return {
    synced: true,
    reason: force ? "Manual sync completed" : "Auto-sync triggered by new traffic",
    runVersion: next.runVersion,
    calibrationVersion: calibration.version,
    liveVisitors: status.liveVisitors,
    deploy,
  };
}

export async function maybeAutoSync(): Promise<SyncResult | null> {
  const state = await loadLoopState();
  if (!isAutonomousMode(state)) return null;
  const status = await getLoopStatus();
  if (!status.readyToSync) return null;
  return syncLoop(false);
}
