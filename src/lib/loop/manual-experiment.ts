import { runExperiment, llmExperimentConfig } from "@/lib/evolve/run";
import { GENERATION_0 } from "@/config/variants";
import { promoteAndDeploy, type PromoteResult } from "@/lib/deploy/promote";
import { writeAllVariantHtml } from "@/lib/deploy/write-html";
import { isLlmConfigured, llmProvider } from "@/lib/llm";
import { invalidateRunCache, saveRun } from "@/lib/registry";
import type { ExperimentMode } from "@/lib/schema/experiment-progress";
import {
  ExperimentProgressReporter,
  clearExperimentProgress,
} from "./experiment-progress";
import {
  loadLoopState,
  nextExperimentNumber,
  normalizeExperimentHistory,
  saveLoopState,
} from "./state";

export type { ExperimentMode };

export interface ManualExperimentResult {
  runId: string;
  runVersion: number;
  experimentNumber: number;
  totalVisits: number;
  offspringCount: number;
  offspringIds: string[];
  experimentMode: ExperimentMode;
  llmProvider: string | null;
  deploy: PromoteResult;
}

/** full = LLM persona readings; hybrid = heuristic readings + LLM eval/breed (toggle off). */
export function manualExperimentMode(state = loadLoopState()): ExperimentMode {
  return state.llmPersonas ? "full" : "hybrid";
}

export async function runManualExperiment(): Promise<ManualExperimentResult> {
  const state = loadLoopState();
  const mode = manualExperimentMode(state);

  if (!isLlmConfigured()) {
    throw new Error(
      "LLM API key required — add KIE_API_KEY or OPENAI_API_KEY to .env.local (evaluator and optimizer always use LLM)"
    );
  }

  const seed = Date.now() % 1_000_000_000;
  const generations = Number(process.env.LLM_GENERATIONS ?? 2);
  clearExperimentProgress();
  const progress = new ExperimentProgressReporter(mode, generations);

  try {
    const run = await runExperiment({
      ...llmExperimentConfig(seed, (msg) => console.log(`[experiment] ${msg}`)),
      personaReadingMode: mode === "full" ? "llm" : "heuristic",
      progress,
    });

    progress.saving("Saving results and writing page previews…");
    saveRun(run);
    invalidateRunCache();
    writeAllVariantHtml(run.variants, { includeLabBaseline: true });

    const offspringIds =
      [...run.generations].reverse().find((g) => g.offspringIds?.length)?.offspringIds ?? [];
    const totalVisits = run.generations.reduce(
      (sum, g) => sum + (g.totalVisits ?? g.visits.length),
      0
    );

    const loopState = loadLoopState();
    const history = normalizeExperimentHistory(loopState.experimentHistory);
    const experimentNumber = nextExperimentNumber(history);
    const previousVariants =
      experimentNumber === 1
        ? [...GENERATION_0]
        : [
            ...(history.find((e) => e.experimentNumber === experimentNumber - 1)
              ?.currentVariants ?? GENERATION_0),
          ];
    const currentVariants = offspringIds
      .map((id) => run.variants.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => Boolean(v));

    const next = {
      ...loopState,
      lastSyncAt: new Date().toISOString(),
      lastRunId: run.id,
      syncHistory: [
        {
          at: new Date().toISOString(),
          visitors: 0,
          reason: mode === "full" ? "manual-llm-experiment" : "manual-hybrid-experiment",
        },
        ...loopState.syncHistory.slice(0, 19),
      ],
      experimentHistory: [
        ...history,
        {
          experimentNumber,
          runId: run.id,
          previousVariants,
          currentVariants,
        },
      ],
    };
    saveLoopState(next);

    const deploy =
      process.env.AUTO_DEPLOY_BEST === "1"
        ? promoteAndDeploy(run, { forceBest: true })
        : {
            promoted: false,
            reason: "Lab mode — baseline preserved (set AUTO_DEPLOY_BEST=1 to auto-promote)",
            htmlWritten: run.variants.length,
          };

    progress.complete();

    return {
      runId: run.id,
      runVersion: loopState.runVersion,
      experimentNumber,
      totalVisits,
      offspringCount: offspringIds.length,
      offspringIds,
      experimentMode: mode,
      llmProvider: llmProvider(),
      deploy,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Experiment failed";
    progress.fail(message);
    throw err;
  }
}

/** Whether manual runs can use the optional LLM path. */
export function isLlmExperimentAvailable(): boolean {
  return isLlmConfigured();
}

export function llmExperimentProviderLabel(): string | null {
  return isLlmConfigured() ? llmProvider() : null;
}
