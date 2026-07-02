import { NextResponse } from "next/server";
import {
  isLlmExperimentAvailable,
  llmExperimentProviderLabel,
  manualExperimentMode,
  runManualExperiment,
} from "@/lib/loop/manual-experiment";
import { isAutonomousMode, loadLoopState, saveLoopState } from "@/lib/loop/state";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadLoopState();
  return NextResponse.json({
    autonomous: isAutonomousMode(state),
    llmPersonas: Boolean(state.llmPersonas),
    runVersion: state.runVersion,
    lastRunId: state.lastRunId,
    lastSyncAt: state.lastSyncAt,
    experimentMode: manualExperimentMode(state),
    llmExperimentAvailable: isLlmExperimentAvailable(),
    llmProvider: llmExperimentProviderLabel(),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    autonomous?: boolean;
    llmPersonas?: boolean;
  };

  if (typeof body.autonomous !== "boolean" && typeof body.llmPersonas !== "boolean") {
    return NextResponse.json(
      { error: "Provide autonomous and/or llmPersonas (boolean)" },
      { status: 400 }
    );
  }

  const state = await loadLoopState();
  const next = {
    ...state,
    ...(typeof body.autonomous === "boolean" ? { autonomous: body.autonomous } : {}),
    ...(typeof body.llmPersonas === "boolean" ? { llmPersonas: body.llmPersonas } : {}),
  };
  await saveLoopState(next);

  return NextResponse.json({
    autonomous: next.autonomous,
    llmPersonas: next.llmPersonas,
    experimentMode: manualExperimentMode(next),
  });
}

export async function POST() {
  const state = await loadLoopState();
  if (isAutonomousMode(state)) {
    return NextResponse.json(
      { error: "Turn off Autonomous mode to run an experiment manually" },
      { status: 400 }
    );
  }

  try {
    const result = await runManualExperiment();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Experiment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
