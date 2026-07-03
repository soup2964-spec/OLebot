import { NextResponse } from "next/server";
import {
  clearExperimentProgress,
  loadExperimentProgress,
} from "@/lib/loop/experiment-progress";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadExperimentProgress());
}

/** Reset progress to idle (dismiss bar, unlock Run after complete/error/stale). */
export async function DELETE() {
  await clearExperimentProgress();
  return NextResponse.json({ ok: true, status: "idle" });
}
