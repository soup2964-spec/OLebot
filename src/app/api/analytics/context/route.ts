import { NextResponse } from "next/server";
import { GTM_CHALLENGE } from "@/domains/analytics/posthog-events";
import { loadExperimentProgress } from "@/domains/loop/experiment-progress";
import { loadLoopState, normalizeExperimentHistory } from "@/domains/loop/state";

export const dynamic = "force-dynamic";

/** Lightweight context for variant-page PostHog / GTM super-properties. */
export async function GET() {
  const [state, progress] = await Promise.all([loadLoopState(), loadExperimentProgress()]);
  const history = normalizeExperimentHistory(state.experimentHistory);

  const experimentNumber =
    progress.experimentNumber ??
    (history.length > 0 ? history[history.length - 1].experimentNumber : 1);

  return NextResponse.json({
    challenge: GTM_CHALLENGE.slug,
    challengeName: GTM_CHALLENGE.name,
    product: GTM_CHALLENGE.product,
    experimentNumber,
    runVersion: state.runVersion,
  });
}
