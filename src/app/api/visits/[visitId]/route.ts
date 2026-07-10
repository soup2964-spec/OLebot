import { NextRequest, NextResponse } from "next/server";
import { getVisit, loadRun } from "@/platform/registry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  const gen = Number(req.nextUrl.searchParams.get("gen") ?? 0);

  if (!(await loadRun())) {
    return NextResponse.json({ error: "No experiment run found" }, { status: 404 });
  }

  const visit = await getVisit(gen, visitId);
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json(visit);
}
