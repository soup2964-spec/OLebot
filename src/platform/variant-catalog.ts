import { GENERATION_0 } from "@/content/variants";
import type { DeployState } from "@/domains/deploy/state";
import {
  getLabDocument,
  getLabDocumentSync,
  LAB_DOC,
  listExperimentNumbers,
} from "@/platform/supabase/lab-documents";
import { normalizeExperimentHistory, type LoopState } from "@/domains/loop/state";
import { sortBredVariants } from "@/domains/comparison/snapshots";
import type { ExperimentRun } from "@/platform/schema/experiment";
import type { ExperimentProgress } from "@/platform/schema/experiment-progress";
import type { PageVariant } from "@/platform/schema/page";
import { loadRun, loadRunSync } from "@/platform/run-store";

function bredVariantsFromHistorySync(): PageVariant[] {
  const loop = getLabDocumentSync<LoopState>(LAB_DOC.LOOP_STATE);
  const history = normalizeExperimentHistory(loop?.experimentHistory ?? []);
  const byId = new Map<string, PageVariant>();
  for (const entry of history) {
    for (const v of entry.currentVariants) {
      byId.set(v.id, v);
    }
  }
  return sortBredVariants([...byId.values()]);
}

async function bredVariantsFromHistory(): Promise<PageVariant[]> {
  const loop = await getLabDocument<LoopState>(LAB_DOC.LOOP_STATE);
  const history = normalizeExperimentHistory(loop?.experimentHistory ?? []);
  const byId = new Map<string, PageVariant>();
  for (const entry of history) {
    for (const v of entry.currentVariants) {
      byId.set(v.id, v);
    }
  }
  return sortBredVariants([...byId.values()]);
}

function deploySnapshotSync(): DeployState | null {
  return getLabDocumentSync<DeployState>(LAB_DOC.DEPLOY_STATE);
}

export function getGen0Variants(): PageVariant[] {
  const deploy = deploySnapshotSync();
  return deploy?.currentVariants?.length ? deploy.currentVariants : GENERATION_0;
}

export function getProductionVariant(): PageVariant | null {
  const deploy = deploySnapshotSync();
  if (!deploy || deploy.deployVersion === 0) return null;
  const baseline = deploy.currentVariants.find((v) => v.id === "v0-baseline");
  if (!baseline) return null;
  return {
    ...baseline,
    id: "production",
    name: "Production (auto-deployed winner)",
    strategy: "baseline",
  };
}

export async function allVariants(): Promise<PageVariant[]> {
  const run = await loadRun();
  const gen0 = getGen0Variants();
  const gen0Ids = new Set(gen0.map((v) => v.id));
  const fromRun = run?.variants.filter((v) => !gen0Ids.has(v.id)) ?? [];
  const fromHistory = await bredVariantsFromHistory();
  const byId = new Map<string, PageVariant>();
  for (const v of fromHistory) byId.set(v.id, v);
  for (const v of fromRun) byId.set(v.id, v);
  const bred = sortBredVariants([...byId.values()]);
  const production = getProductionVariant();
  return [...gen0, ...bred, ...(production ? [production] : [])];
}

export function allVariantsSync(): PageVariant[] {
  const run = loadRunSync();
  const gen0 = getGen0Variants();
  const gen0Ids = new Set(gen0.map((v) => v.id));
  const fromRun = run?.variants.filter((v) => !gen0Ids.has(v.id)) ?? [];
  const fromHistory = bredVariantsFromHistorySync();
  const byId = new Map<string, PageVariant>();
  for (const v of fromHistory) byId.set(v.id, v);
  for (const v of fromRun) byId.set(v.id, v);
  const bred = sortBredVariants([...byId.values()]);
  const production = getProductionVariant();
  return [...gen0, ...bred, ...(production ? [production] : [])];
}

export async function getVariant(id: string): Promise<PageVariant | undefined> {
  return findVariant(id);
}

/** Resolve a variant from active run, deploy state, or saved experiment snapshots. */
export async function findVariant(id: string): Promise<PageVariant | undefined> {
  if (id === "production") return getProductionVariant() ?? undefined;

  const variants = await allVariants();
  const fromActive = variants.find((v) => v.id === id);
  if (fromActive) return fromActive;

  const progress = await getLabDocument<ExperimentProgress>(LAB_DOC.EXPERIMENT_PROGRESS);
  const fromProgress = progress?.bredVariants?.find((v) => v.id === id);
  if (fromProgress) return fromProgress;

  const loop = await getLabDocument<LoopState>(LAB_DOC.LOOP_STATE);
  const history = normalizeExperimentHistory(loop?.experimentHistory ?? []);
  for (let i = history.length - 1; i >= 0; i--) {
    const found = history[i]!.currentVariants.find((v) => v.id === id);
    if (found) return found;
  }

  const numbers = await listExperimentNumbers();
  for (let i = numbers.length - 1; i >= 0; i--) {
    const run = await getLabDocument<ExperimentRun>(LAB_DOC.experiment(numbers[i]!));
    const found = run?.variants.find((v) => v.id === id);
    if (found) return found;
  }

  return undefined;
}

export async function getVisit(generation: number, visitId: string) {
  const run = await loadRun();
  return run?.generations[generation]?.visits.find((v) => v.id === visitId);
}
