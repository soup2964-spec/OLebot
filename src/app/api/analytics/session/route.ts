import { NextResponse } from "next/server";
import {
  ingestAnalyticsEvent,
  liveAnalyticsEnabled,
} from "@/lib/supabase/live-store";
import type { AnalyticsIngestBody } from "@/lib/supabase/types";

export async function POST(req: Request) {
  if (!liveAnalyticsEnabled()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let body: AnalyticsIngestBody;
  try {
    body = (await req.json()) as AnalyticsIngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sessionToken || !body.variantId || !body.event) {
    return NextResponse.json(
      { error: "sessionToken, variantId, and event are required" },
      { status: 400 }
    );
  }

  try {
    await ingestAnalyticsEvent(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
