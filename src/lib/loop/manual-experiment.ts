import { runExperiment, llmExperimentConfig } from "@/lib/evolve/run";
import { promoteAndDeploy, type PromoteResult } from "@/lib/deploy/promote";
import { writeAllVariantHtml } from "@/lib/deploy/write-html";
import { isLlmConfigured, llmProvider } from "@/lib/llm";
import { invalidateRunCache, saveRun } from "@/lib/registry";
import { loadLoopState, saveLoopState } from "./state";

export interface ManualExperimentResult {
  runId: string;
  runVersion: number;
  totalVisits: number;
  offspringCount: number;
  offspringIds: string[];
  llmProvider: string;
  deploy: PromoteResult;
}

/** LLM personas read pages, evaluator reports, optimizer breeds new copy. */
export async function runManualExperiment(): Promise<ManualExperimentResult> {
  if (!isLlmConfigured()) {
    throw new Error(
      "LLM API key not configured — set KIE_API_KEY (or OPENAI_API_KEY) in .env.local"
    );
  }

  const seed = Date.now() % 1_000_000_000;
  const run = await runExperiment(
    llmExperimentConfig(seed, (msg) => console.log(`[experiment] ${msg}`))
  );

  saveRun(run);
  invalidateRunCache();
  writeAllVariantHtml(run.variants);

  const offspringIds =
    [...run.generations].reverse().find((g) => g.offspringIds?.length)?.offspringIds ?? [];
  const totalVisits = run.generations.reduce(
    (sum, g) => sum + (g.totalVisits ?? g.visits.length),
    0
  );

  const state = loadLoopState();
  const next = {
    ...state,
    runVersion: state.runVersion + 1,
    lastSyncAt: new Date().toISOString(),
    lastRunId: run.id,
    syncHistory: [
      {
        at: new Date().toISOString(),
        visitors: 0,
        reason: "manual-llm-experiment",
      },
      ...state.syncHistory.slice(0, 19),
    ],
  };
  saveLoopState(next);

  const deploy = promoteAndDeploy(run, {
    forceBest: process.env.AUTO_DEPLOY_BEST !== "0",
  });

  return {
    runId: run.id,
    runVersion: next.runVersion,
    totalVisits,
    offspringCount: offspringIds.length,
    offspringIds,
    llmProvider: llmProvider(),
    deploy,
  };
}
