export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCalibratedPersonaSet } from "@/lib/calibration/store";

export async function GET() {
  const personaSet = await getCalibratedPersonaSet();
  return NextResponse.json(personaSet, {
    headers: { "Cache-Control": "no-store" },
  });
}
