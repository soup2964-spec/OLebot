import { NextResponse } from "next/server";
import { runManualExperiment } from "@/lib/loop/manual-experiment";
import { isAutonomousMode, loadLoopState, saveLoopState } from "@/lib/loop/state";
import { isLlmConfigured, llmProvider } from "@/lib/llm";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  const state = loadLoopState();
  return NextResponse.json({
    autonomous: isAutonomousMode(state),
    runVersion: state.runVersion,
    lastRunId: state.lastRunId,
    lastSyncAt: state.lastSyncAt,
    llmConfigured: isLlmConfigured(),
    llmProvider: isLlmConfigured() ? llmProvider() : null,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { autonomous?: boolean };
  if (typeof body.autonomous !== "boolean") {
    return NextResponse.json({ error: "autonomous (boolean) is required" }, { status: 400 });
  }

  const state = loadLoopState();
  saveLoopState({ ...state, autonomous: body.autonomous });

  return NextResponse.json({ autonomous: body.autonomous });
}

export async function POST() {
  if (isAutonomousMode()) {
    return NextResponse.json(
      { error: "Turn off Autonomous mode to run an experiment manually" },
      { status: 400 }
    );
  }

  if (!isLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "LLM API key not configured — add KIE_API_KEY or OPENAI_API_KEY to .env.local and restart the dev server",
      },
      { status: 503 }
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
