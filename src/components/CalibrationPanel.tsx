import { PageShell } from "@/components/Nav";

/** Published B2B landing page benchmarks for sanity-checking simulated aggregates. */
const BENCHMARKS = {
  conversionRate: { label: "Demo booking CTA", low: 0.02, high: 0.05, source: "Unbounce B2B SaaS benchmarks" },
  bounceRate: { label: "Bounce rate", low: 0.4, high: 0.6, source: "Typical B2B landing pages" },
  scrollAboveFold: { label: "Time above fold", low: 0.57, high: 0.57, source: "Nielsen Norman Group scroll research" },
};

export function CalibrationPanel({
  simulated,
}: {
  simulated?: { conversionRate: number; bounceRate: number; avgScrollDepth: number };
}) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="font-semibold text-white">Simulated vs. real calibration</h2>
      <p className="mt-2 text-sm text-slate-400">
        Simulated personas are a prior. Every variant page is tagged in Microsoft Clarity (
        <code className="rounded bg-slate-800 px-1">variant_id</code>,{" "}
        <code className="rounded bg-slate-800 px-1">generation</code>,{" "}
        <code className="rounded bg-slate-800 px-1">cta_click</code> events) so real reviewer
        traffic can be compared against simulation and used to recalibrate persona parameters.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {simulated ? (
          <>
            <CalRow
              label="Conversion rate"
              sim={(simulated.conversionRate * 100).toFixed(1) + "%"}
              bench={`${BENCHMARKS.conversionRate.low * 100}-${BENCHMARKS.conversionRate.high * 100}%`}
            />
            <CalRow
              label="Bounce rate"
              sim={(simulated.bounceRate * 100).toFixed(0) + "%"}
              bench={`${BENCHMARKS.bounceRate.low * 100}-${BENCHMARKS.bounceRate.high * 100}%`}
            />
            <CalRow
              label="Avg scroll depth"
              sim={(simulated.avgScrollDepth * 100).toFixed(0) + "%"}
              bench="position-biased (NNG)"
            />
          </>
        ) : (
          <p className="text-sm text-slate-500 sm:col-span-3">Run an experiment to populate simulated aggregates.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-950/60 p-4 text-xs text-slate-500">
        {clarityId ? (
          <>
            Clarity project connected (<code>{clarityId.slice(0, 6)}…</code>). Real aggregates
            sync via the Data Export API into <code>persona_versions</code> when configured.
          </>
        ) : (
          <>
            Set <code>NEXT_PUBLIC_CLARITY_ID</code> in <code>.env.local</code> to instrument real
            traffic. Reviewers visiting your hosted pages become the calibration signal.
          </>
        )}
      </div>
    </section>
  );
}

function CalRow({
  label,
  sim,
  bench,
}: {
  label: string;
  sim: string;
  bench: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{sim}</div>
      <div className="mt-0.5 text-xs text-slate-600">Benchmark: {bench}</div>
    </div>
  );
}

export function CalibrationPageShell() {
  return (
    <PageShell
      active="/results"
      title="Calibration"
      subtitle="Closing the sim-to-real loop."
    >
      <CalibrationPanel />
    </PageShell>
  );
}
