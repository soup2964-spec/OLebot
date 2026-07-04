export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readRobustnessSnapshot } from "@/lib/evolve/robustness-snapshot";

export async function GET() {
  const snapshot = readRobustnessSnapshot();
  if (!snapshot) {
    return NextResponse.json(
      { error: "robustness.json missing — run npm run prepare:robustness" },
      { status: 404 }
    );
  }
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
