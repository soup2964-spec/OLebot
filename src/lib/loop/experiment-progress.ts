import type {
  ExperimentMode,
  ExperimentProgress,
  ExperimentStage,
} from "@/lib/schema/experiment-progress";
import type { PageVariant } from "@/lib/schema/page";
import { getLabDocument, LAB_DOC, setLabDocument } from "@/lib/supabase/lab-documents";
import {
  isProgressActivelyRunning,
  reconcileExperimentProgress,
} from "./experiment-progress-utils";

export type { ExperimentMode, ExperimentProgress, ExperimentStage };
export { isProgressActivelyRunning, isProgressStale, reconcileExperimentProgress } from "./experiment-progress-utils";

const IDLE: ExperimentProgress = {
  status: "idle",
  stage: "starting",
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

let current: ExperimentProgress = { ...IDLE };

const PERSIST_DEBOUNCE_MS = 2000;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPersist: ExperimentProgress | null = null;

function flushPersistSync() {
  if (!pendingPersist) return;
  const state = pendingPersist;
  pendingPersist = null;
  void setLabDocument(LAB_DOC.EXPERIMENT_PROGRESS, state);
}

function persistSync(state: ExperimentProgress, immediate = false) {
  current = state;
  pendingPersist = state;
  if (immediate) {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    flushPersistSync();
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushPersistSync();
  }, PERSIST_DEBOUNCE_MS);
}

async function persist(state: ExperimentProgress) {
  current = state;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  pendingPersist = null;
  try {
    await setLabDocument(LAB_DOC.EXPERIMENT_PROGRESS, state);
  } catch {
    /* non-fatal — in-memory still updated for this request */
  }
}

export async function loadExperimentProgress(): Promise<ExperimentProgress> {
  if (pendingPersist) return pendingPersist;
  if (isProgressActivelyRunning(current)) return current;

  try {
    const stored = await getLabDocument<ExperimentProgress>(LAB_DOC.EXPERIMENT_PROGRESS);
    if (stored) {
      const merged = { ...IDLE, ...stored };
      const reconciled = reconcileExperimentProgress(merged);
      if (reconciled.status !== merged.status || reconciled.stage !== merged.stage) {
        await persist(reconciled);
        return reconciled;
      }
      current = merged;
      return current;
    }
  } catch {
    /* use memory */
  }
  return current;
}

export function loadExperimentProgressSync(): ExperimentProgress {
  return current;
}

export async function clearExperimentProgress() {
  await persist({ ...IDLE });
}

function stageWeights(mode: ExperimentMode) {
  if (mode === "full") {
    return { readings: 0.72, simulating: 0.03, evaluating: 0.1, breeding: 0.15 };
  }
  return { readings: 0.08, simulating: 0.07, evaluating: 0.25, breeding: 0.6 };
}

export class ExperimentProgressReporter {
  private mode: ExperimentMode;
  private totalGenerations: number;
  private genSpan: number;
  private gen = 0;
  private stage: ExperimentStage = "starting";
  private stageBase = 0;
  private stageSpan = 0;
  private startedAt: string;
  private bredVariants: PageVariant[] = [];
  private experimentNumber: number;

  constructor(mode: ExperimentMode, totalGenerations: number, experimentNumber: number) {
    this.mode = mode;
    this.totalGenerations = totalGenerations;
    this.experimentNumber = experimentNumber;
    this.genSpan = 92 / Math.max(1, totalGenerations);
    this.startedAt = new Date().toISOString();
    this.publish("starting", 0, "Starting experiment…", null);
  }

  setGeneration(gen: number, poolSize: number) {
    this.gen = gen;
    this.stageBase = gen * this.genSpan;
    this.publish(
      "readings",
      this.stageBase,
      `Generation ${gen + 1} of ${this.totalGenerations}`,
      `${poolSize} variants in pool`
    );
  }

  readingsStart(total: number) {
    const w = stageWeights(this.mode);
    this.stageSpan = this.genSpan * w.readings;
    this.stage = "readings";
    const label =
      this.mode === "full"
        ? `LLM persona readings (${total})`
        : `Heuristic persona readings (${total})`;
    this.publish("readings", this.stageBase, label, "0% complete");
  }

  readingsProgress(done: number, total: number) {
    const frac = total > 0 ? done / total : 1;
    this.publish(
      "readings",
      this.stageBase + this.stageSpan * frac,
      this.mode === "full" ? "LLM persona readings" : "Heuristic persona readings",
      `${done} / ${total}`
    );
  }

  readingsDone() {
    this.simulating();
  }

  simulating() {
    const w = stageWeights(this.mode);
    this.stage = "simulating";
    this.stageBase += this.stageSpan;
    this.stageSpan = this.genSpan * w.simulating;
    this.publish(
      "simulating",
      this.stageBase + this.stageSpan * 0.5,
      "Simulating visitor traffic",
      "Thompson bandit · Monte Carlo visits"
    );
  }

  evaluating() {
    const w = stageWeights(this.mode);
    this.stageBase += this.stageSpan;
    this.stageSpan = this.genSpan * w.evaluating;
    this.stage = "evaluating";
    this.publish(
      "evaluating",
      this.stageBase + this.stageSpan * 0.2,
      "Building behavior report",
      `Generation ${this.gen + 1}`
    );
  }

  breedingStart(total: number) {
    const w = stageWeights(this.mode);
    this.stageBase += this.stageSpan;
    this.stageSpan = this.genSpan * w.breeding;
    this.stage = "breeding";
    this.publish(
      "breeding",
      this.stageBase,
      "LLM optimizer breeding new pages",
      `0 / ${total} offspring`
    );
  }

  breedingProgress(done: number, total: number) {
    const frac = total > 0 ? done / total : 1;
    this.publish(
      "breeding",
      this.stageBase + this.stageSpan * frac,
      "LLM optimizer breeding new pages",
      `${done} / ${total} offspring`
    );
  }

  addBredVariant(variant: PageVariant) {
    this.bredVariants = [...this.bredVariants, variant];
    persistSync(
      {
        ...current,
        bredVariants: [...this.bredVariants],
        detail: `${this.bredVariants.length} page${this.bredVariants.length === 1 ? "" : "s"} ready`,
        updatedAt: new Date().toISOString(),
      },
      true
    );
  }

  saving(label: string) {
    this.stage = "saving";
    this.publish("saving", 94, label, null);
  }

  complete() {
    this.publish("done", 100, "Experiment complete", null, "complete");
  }

  fail(error: string) {
    persistSync(
      {
        ...current,
        status: "error",
        stage: "error",
        label: "Experiment failed",
        detail: error,
        error,
        percent: current.percent,
        updatedAt: new Date().toISOString(),
      },
      true
    );
  }

  private publish(
    stage: ExperimentStage,
    percent: number,
    label: string,
    detail: string | null,
    status: ExperimentProgress["status"] = "running"
  ) {
    this.stage = stage;
    persistSync(
      {
        status,
        stage,
        mode: this.mode,
        generation: this.gen,
        totalGenerations: this.totalGenerations,
        label,
        detail,
        percent: Math.min(100, Math.max(0, Math.round(percent))),
        startedAt: this.startedAt,
        updatedAt: new Date().toISOString(),
        error: null,
        experimentNumber: this.experimentNumber,
        bredVariants: [...this.bredVariants],
      },
      status === "complete" || status === "error"
    );
  }
}
