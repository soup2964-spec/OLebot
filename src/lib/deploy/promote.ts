import { GENERATION_0 } from "@/config/variants";
import type { ExperimentRun } from "@/lib/schema/experiment";
import type { PageVariant } from "@/lib/schema/page";
import type { VariantDecision } from "@/lib/stats/bayes";
import { buildJudgmentsFromMetrics } from "@/lib/judgment/criteria";
import { loadLoopState } from "@/lib/loop/state";
import { mergeWinnerIntoBaseline } from "./normalize-variant";
import { loadDeployState, saveDeployState, type DeployState } from "./state";
import { writeAllVariantHtml, writeProductionBaseline, loadSourceBaselineHtml } from "./write-html";

export interface PromoteResult {
  promoted: boolean;
  reason: string;
  variantId?: string;
  deployVersion?: number;
  htmlWritten: number;
  patchCount?: number;
}

function findPromotedDecision(
  run: ExperimentRun
): { variant: PageVariant; decision: VariantDecision } | null {
  const lastGen = run.generations[run.generations.length - 1];
  if (!lastGen?.decisions?.length) return null;

  for (const decision of lastGen.decisions) {
    if (decision.status !== "promoted" || decision.variantId === "v0-baseline") continue;
    const variant = run.variants.find((v) => v.id === decision.variantId);
    if (variant) return { variant, decision };
  }
  return null;
}

/** Fallback when strict promote threshold isn't met — best lift with guardrails. */
function findBestDeployCandidate(
  run: ExperimentRun
): { variant: PageVariant; decision: VariantDecision; reason: string } | null {
  const lastGen = run.generations[run.generations.length - 1];
  if (!lastGen?.decisions?.length || !lastGen.metrics.length) return null;

  const judgments = buildJudgmentsFromMetrics(lastGen.metrics, lastGen.decisions);
  let best: { variant: PageVariant; decision: VariantDecision; lift: number } | null = null;

  for (const decision of lastGen.decisions) {
    if (decision.variantId === "v0-baseline") continue;
    if (decision.status === "killed") continue;
    if (!decision.guardrailBounceOk) continue;

    const judgment = judgments[decision.variantId];
    if (!judgment || judgment.liftPp === null || judgment.liftPp <= 0) continue;

    const variant = run.variants.find((v) => v.id === decision.variantId);
    if (!variant) continue;

    if (!best || judgment.liftPp > best.lift) {
      best = { variant, decision, lift: judgment.liftPp };
    }
  }

  if (!best) return null;
  return {
    variant: best.variant,
    decision: best.decision,
    reason: `Best lift candidate (+${best.lift.toFixed(1)}pp, P(best) ${(best.decision.pBest * 100).toFixed(0)}%)`,
  };
}

function gen0FromDeploy(state: DeployState): PageVariant[] {
  return state.currentVariants.length ? state.currentVariants : [...GENERATION_0];
}

/**
 * Promote winning copy → merge into production baseline → regenerate HTML for /v/ routes.
 */
export function promoteAndDeploy(run: ExperimentRun, opts?: { forceBest?: boolean }): PromoteResult {
  const deploy = loadDeployState();
  const loop = loadLoopState();
  const baseline = GENERATION_0[0];

  let winner: PageVariant | null = null;
  let reason = "";

  const promoted = findPromotedDecision(run);
  if (promoted) {
    winner = promoted.variant;
    reason = promoted.decision.reason;
  } else if (opts?.forceBest) {
    const candidate = findBestDeployCandidate(run);
    if (candidate) {
      winner = candidate.variant;
      reason = candidate.reason;
    }
  }

  const htmlResults = writeAllVariantHtml(run.variants);
  const htmlWritten = htmlResults.length;

  if (!winner) {
    saveDeployState({
      ...deploy,
      htmlVariantIds: [
        ...new Set([
          ...deploy.htmlVariantIds,
          ...htmlResults.map((r) => r.variantId),
        ]),
      ],
    });
    return {
      promoted: false,
      reason: promoted
        ? "No deployable winner"
        : "No variant met promote threshold — HTML refreshed for all /v/ routes",
      htmlWritten,
    };
  }

  const previousVariants = gen0FromDeploy(deploy).map((v) => structuredClone(v));
  const mergedBaseline = mergeWinnerIntoBaseline(baseline, winner);
  const currentVariants = GENERATION_0.map((v) =>
    v.id === baseline.id ? mergedBaseline : v
  );

  const productionWrite = writeProductionBaseline(
    mergedBaseline,
    loadSourceBaselineHtml()
  );

  const nextDeploy: DeployState = {
    deployVersion: deploy.deployVersion + 1,
    lastPromotedAt: new Date().toISOString(),
    lastPromotedVariantId: winner.id,
    previousVariants,
    currentVariants,
    htmlVariantIds: [
      ...new Set([
        ...htmlResults.map((r) => r.variantId),
        "production",
        baseline.id,
        winner.id,
      ]),
    ],
    history: [
      {
        at: new Date().toISOString(),
        variantId: winner.id,
        runId: run.id,
        runVersion: loop.runVersion,
        reason,
        patchCount: productionWrite.patchCount,
      },
      ...deploy.history.slice(0, 19),
    ],
  };
  saveDeployState(nextDeploy);

  return {
    promoted: true,
    reason,
    variantId: winner.id,
    deployVersion: nextDeploy.deployVersion,
    htmlWritten: htmlWritten + 1,
    patchCount: productionWrite.patchCount,
  };
}

export function getComparisonVariants(): {
  previous: PageVariant[];
  current: PageVariant[];
  deployVersion: number;
  lastPromotedVariantId: string | null;
} {
  const deploy = loadDeployState();
  return {
    previous: deploy.previousVariants,
    current: deploy.currentVariants,
    deployVersion: deploy.deployVersion,
    lastPromotedVariantId: deploy.lastPromotedVariantId,
  };
}
