import { NextResponse } from "next/server";
import { loadRun, visitIndex } from "@/lib/registry";
import { getComparisonVariants } from "@/lib/deploy/promote";
import { loadDeployState } from "@/lib/deploy/state";
import { loadLoopState } from "@/lib/loop/state";

export async function GET() {
  const run = loadRun();
  if (!run) {
    return NextResponse.json({ error: "No experiment run" }, { status: 404 });
  }

  const lastGen = run.generations[run.generations.length - 1];
  const state = loadLoopState();
  const deploy = loadDeployState();
  const comparison = getComparisonVariants();

  return NextResponse.json({
    runVersion: state.runVersion,
    deployVersion: deploy.deployVersion,
    lastPromotedVariantId: deploy.lastPromotedVariantId,
    deploy,
    comparison,
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
  });
}
