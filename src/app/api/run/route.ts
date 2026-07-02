export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { allVariants, loadRun, visitIndex } from "@/lib/registry";
import { getComparisonVariants } from "@/lib/deploy/promote";
import { loadDeployState } from "@/lib/deploy/state";
import { ensureExperimentSnapshots, loadRunForExperiment } from "@/lib/experiments/store";
import { loadLoopState } from "@/lib/loop/state";
import { loadExperimentProgress } from "@/lib/loop/experiment-progress";
import type { ExperimentRun } from "@/lib/schema/experiment";

function runPayload(run: ExperimentRun) {
  const lastGen = run.generations[run.generations.length - 1];
  return {
    runId: run.id,
    updatedAt: run.createdAt,
    personaSetVersion: run.personaSetVersion,
    variantCount: run.variants.length,
    generationCount: run.generations.length,
    totalVisits: run.generations.reduce(
      (s, g) => s + (g.totalVisits ?? g.visits.length),
      0
    ),
    index: visitIndex(run),
    variants: run.variants,
    generations: run.generations.map((g) => ({
      generation: g.generation,
      variantIds: g.variantIds,
      totalVisits: g.totalVisits,
      metrics: g.metrics,
      decisions: g.decisions,
      allocationHistory: g.allocationHistory,
      offspringIds: g.offspringIds,
      report: { insights: g.report.insights },
    })),
    lastGenBest: lastGen.metrics[0]
      ? {
          variantId: lastGen.metrics[0].variantId,
          conversionRate: lastGen.metrics[0].conversionRate,
          fitness: lastGen.metrics[0].fitness,
        }
      : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const experimentParam = searchParams.get("experiment");
  const experimentNumber = experimentParam ? Number(experimentParam) : null;

  const state = await loadLoopState();
  const history = await ensureExperimentSnapshots(state.experimentHistory ?? []);
  const deploy = await loadDeployState();
  const comparison = await getComparisonVariants();
  const progress = await loadExperimentProgress();
  const variants = await allVariants();

  const base = {
    runVersion: state.runVersion,
    experimentHistory: history,
    experimentProgress: progress,
    deployVersion: deploy.deployVersion,
    lastPromotedVariantId: deploy.lastPromotedVariantId,
    deploy,
    comparison,
    variants,
    experimentNumber: experimentNumber ?? progress.experimentNumber ?? null,
  };

  const run =
    experimentNumber != null && Number.isFinite(experimentNumber)
      ? (await loadRunForExperiment(experimentNumber, history, progress)) ?? (await loadRun())
      : await loadRun();

  if (!run) {
    return NextResponse.json({
      ...base,
      runId: null,
      index: {},
      generations: [],
      totalVisits: 0,
      generationCount: 0,
      variantCount: variants.length,
      lastGenBest: null,
    });
  }

  return NextResponse.json({
    ...base,
    ...runPayload(run),
  });
}
