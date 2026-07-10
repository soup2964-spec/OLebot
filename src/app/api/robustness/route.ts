export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loadExperimentRobustness } from "@/domains/experiments/store";
import { readRobustnessSnapshot } from "@/domains/evolve/robustness-snapshot";

export async function GET(request: Request) {
  const experimentParam = new URL(request.url).searchParams.get("experiment");
  const experimentNumber = experimentParam ? Number(experimentParam) : null;

  if (experimentNumber != null && Number.isFinite(experimentNumber)) {
    const perExperiment = await loadExperimentRobustness(experimentNumber);
    if (perExperiment) {
      return NextResponse.json(perExperiment, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const snapshot = readRobustnessSnapshot();
  if (!snapshot) {
    return NextResponse.json(
      { error: "robustness.json missing — run an experiment or npm run prepare:robustness" },
      { status: 404 }
    );
  }
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
