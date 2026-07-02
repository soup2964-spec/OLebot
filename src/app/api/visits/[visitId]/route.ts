import { NextRequest, NextResponse } from "next/server";
import { getVisit, loadRun } from "@/lib/registry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  const gen = Number(req.nextUrl.searchParams.get("gen") ?? 0);

  if (!loadRun()) {
    return NextResponse.json({ error: "No experiment run found" }, { status: 404 });
  }

  const visit = getVisit(gen, visitId);
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json(visit);
}
