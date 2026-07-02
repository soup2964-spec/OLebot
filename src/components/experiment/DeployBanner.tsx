"use client";

export function DeployBanner({
  deployVersion,
  lastPromotedVariantId,
  lastDeployReason,
}: {
  deployVersion: number;
  lastPromotedVariantId: string | null;
  lastDeployReason?: string | null;
}) {
  if (deployVersion === 0) {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Production copy matches Generation 0. The next promoted winner will auto-deploy to{" "}
        <code className="rounded bg-slate-100 px-1">/v/</code> routes and update the baseline.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-900">
        Deploy #{deployVersion} · production updated from{" "}
        <span className="font-mono">{lastPromotedVariantId}</span>
      </p>
      {lastDeployReason && (
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{lastDeployReason}</p>
      )}
      <p className="mt-2 text-xs text-emerald-700">
        Live baseline:{" "}
        <a href="/v/production" target="_blank" className="font-semibold underline">
          /v/production
        </a>{" "}
        · Previous vs current grids reflect copy before/after this deploy.
      </p>
    </div>
  );
}
