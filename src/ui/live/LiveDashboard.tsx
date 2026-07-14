"use client";

import { useCallback, useState } from "react";
import { LiveLoopPanel } from "@/ui/live/LiveLoopPanel";
import { CalibrationPanel } from "@/ui/live/CalibrationPanel";
import type { SimulatedMetricsSnapshot } from "@/lab/calibration/types";

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
        Instrumentation reference — Scholé AI GTM Challenge
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Aligned to schole.ai production: PostHog (defaults 2026-01-30), GTM{" "}
        <code className="rounded bg-white px-1 text-xs">GTM-KMB4RW7C</code>, GA4, HubSpot via{" "}
        <code className="rounded bg-white px-1 text-xs">generate_lead</code>.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        <li>
          <strong className="text-slate-900">Fitness events (weighted)</strong> — $pageview,
          section_viewed, scroll_depth, book_demo_click, $pageleave
        </li>
        <li>
          <strong className="text-slate-900">GTM / GA4 dataLayer</strong> — page_view,
          generate_lead, scroll, section_view, select_content, session_end
        </li>
        <li>
          <strong className="text-slate-900">Phase 2 diagnostics</strong> — cta_viewed (funnel
          exposure); simulation page_exit with unresolved_objections
        </li>
        <li>
          <strong className="text-slate-900">Super-properties</strong> — challenge, experiment_number,
          variant_id, generation, strategy, source
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
