import { NextResponse } from "next/server";
import { loadRun } from "@/lib/registry";
import { loadDeployState } from "@/lib/deploy/state";
import { getComparisonVariants, promoteAndDeploy } from "@/lib/deploy/promote";
import { writeAllVariantHtml } from "@/lib/deploy/write-html";

export async function GET() {
  const deploy = loadDeployState();
  const comparison = getComparisonVariants();
  return NextResponse.json({
    ...deploy,
    comparison,
  });
}

export async function POST(req: Request) {
  const run = loadRun();
  if (!run) {
    return NextResponse.json({ error: "No experiment run" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "promote" | "refresh-html";
    forceBest?: boolean;
  };

  if (body.action === "refresh-html") {
    const results = writeAllVariantHtml(run.variants);
    return NextResponse.json({
      ok: true,
      action: "refresh-html",
      htmlWritten: results.length,
      results,
    });
  }

  const result = promoteAndDeploy(run, { forceBest: body.forceBest ?? true });
  return NextResponse.json({ ok: true, ...result });
}
