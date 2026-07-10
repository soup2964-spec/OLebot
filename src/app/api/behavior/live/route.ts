import { NextResponse } from "next/server";
import {
  fetchLiveBehaviorSnapshot,
  liveAnalyticsEnabled,
} from "@/platform/supabase/live-store";

export async function GET(req: Request) {
  if (!liveAnalyticsEnabled()) {
    return NextResponse.json(
      { configured: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const windowDays = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));

  try {
    const snapshot = await fetchLiveBehaviorSnapshot(windowDays);
    return NextResponse.json({ configured: true, ...snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch live behavior";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
