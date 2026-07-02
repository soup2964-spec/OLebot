"use client";

import { useCallback, useState } from "react";
import { LiveLoopPanel } from "@/components/LiveLoopPanel";
import { CalibrationPanel } from "@/components/CalibrationPanel";
import type { SimulatedMetricsSnapshot } from "@/lib/calibration/types";

export function LiveDashboard({
  simulated,
}: {
  simulated?: SimulatedMetricsSnapshot;
}) {
  const [runVersion, setRunVersion] = useState(0);

  const onLoopUpdate = useCallback((v: number) => setRunVersion(v), []);

  return (
    <div className="space-y-8" key={runVersion}>
      <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Live version</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Real analytics from every variant. Open any page from the left sidebar — each fires
              PostHog, GTM, and Clarity events tagged with its variant ID.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-800">Listening for live traffic</span>
          </div>
        </div>
      </div>

      <LiveLoopPanel onUpdate={onLoopUpdate} />

      <CalibrationPanel simulated={simulated} />

      <LiveEventsReference />
    </div>
  );
}

function LiveEventsReference() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        Instrumentation reference
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        <li>
          <strong className="text-slate-900">PostHog</strong> — variant_page_view, cta_click,
          scroll_depth, page_exit (with variantId, generation, strategy)
        </li>
        <li>
          <strong className="text-slate-900">GTM / GA4</strong> — same events pushed to dataLayer
        </li>
        <li>
          <strong className="text-slate-900">Clarity</strong> — optional session replay per variant
          tag
        </li>
        <li>
          <strong className="text-slate-900">Auto-sync</strong> — after 5 new sessions, personas
          recalibrate and the simulation re-runs (updates the simulation dashboard)
        </li>
      </ul>
    </section>
  );
}
