export type ExperimentStage =
  | "starting"
  | "readings"
  | "simulating"
  | "evaluating"
  | "breeding"
  | "saving"
  | "done"
  | "error";

export type ExperimentMode = "hybrid" | "full";

export interface ExperimentProgress {
  status: "idle" | "running" | "complete" | "error";
  stage: ExperimentStage;
  mode: ExperimentMode | null;
  generation: number;
  totalGenerations: number;
  label: string;
  detail: string | null;
  percent: number;
  startedAt: string | null;
  updatedAt: string | null;
  error: string | null;
  /** Which manual experiment (1…N) this progress belongs to. */
  experimentNumber?: number | null;
  /** Bred pages revealed so far during the active run (for page comparison grid). */
  bredVariants?: import("@/platform/schema/page").PageVariant[];
}
