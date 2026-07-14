"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Visit } from "@/shared/schema/events";
import type { PageVariant } from "@/shared/schema/page";
import { POSTHOG_EVENTS } from "@/lab/analytics/posthog-events";
import { LandingPage } from "@/ui/landing/LandingPage";
import { PERSONA_SET_V1 } from "@/config/personas";

/**
 * Replays a stored visit trace on the real rendered page: scroll position,
 * section highlight, and the agent's thought bubble - no browser automation.
 */
export function ReplayTheater({
  visit,
  variant,
}: {
  visit: Visit;
  variant: PageVariant;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => buildTimeline(visit, variant), [visit, variant]);
  const current = timeline[step];
  const persona = PERSONA_SET_V1.personas.find((p) => p.id === visit.personaId);

  useEffect(() => {
    if (!playing) return;
    if (step >= timeline.length - 1) {
      setPlaying(false);
      return;
    }
    const delay = Math.max(400, (timeline[step + 1].at - current.at) / 3);
    const t = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [playing, step, timeline, current.at]);

  useEffect(() => {
    const el = containerRef.current?.querySelector(
      `[data-section-id="${current.sectionId}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current.sectionId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div
        ref={containerRef}
        className="max-h-[520px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <LandingPage variant={variant} highlightSectionId={current.sectionId} />
      </div>

      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Replay theater</div>
        <div className="mt-1 font-semibold text-slate-900">
          {persona?.name ?? visit.personaId}
          <span className="ml-2 text-xs font-normal text-slate-500">{persona?.role}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-slate-500">
          {variant.id} · {visit.converted ? "converted" : "lost"} · step {step + 1}/{timeline.length}
        </div>

        <div className="mt-4 flex-1 rounded-xl bg-slate-50 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-schole-primary">
            {current.label}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">{current.thought}</p>
          {current.objectionNote && (
            <p className="mt-2 text-xs text-amber-400/90">{current.objectionNote}</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            className="flex-1 rounded-full bg-schole-primary py-2 text-xs font-semibold text-white hover:bg-schole-primary-hover"
          >
            {playing ? "Playing…" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(timeline.length - 1, s + 1));
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-700"
          >
            Step
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-700"
          >
            Reset
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{visit.verdict}</p>
      </div>
    </div>
  );
}

interface TimelineStep {
  at: number;
  label: string;
  sectionId?: string;
  thought: string;
  objectionNote?: string;
}

function buildTimeline(visit: Visit, variant: PageVariant): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const reactionBySection = new Map(visit.reactions.map((r) => [r.sectionId, r]));
  const objectionsBySection = new Map<string, string[]>();
  for (const u of visit.objectionUpdates) {
    const list = objectionsBySection.get(u.sectionId) ?? [];
    list.push(`${u.effect === "resolved" ? "✓" : "✗"} ${u.objectionId}: ${u.note}`);
    objectionsBySection.set(u.sectionId, list);
  }

  for (const ev of visit.events) {
    const section = variant.sections.find((s) => s.id === ev.sectionId);
    if (ev.type === POSTHOG_EVENTS.PAGEVIEW) {
      steps.push({
        at: ev.at,
        label: "Lands on page",
        thought: "Let me see what this is about…",
      });
    } else if (ev.type === POSTHOG_EVENTS.SECTION_VIEWED && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: `Scrolls to: ${section?.headline.slice(0, 40) ?? ev.sectionId}`,
        sectionId: ev.sectionId,
        thought: reactionBySection.get(ev.sectionId)?.thought ?? "Scanning this section…",
      });
    } else if (ev.type === POSTHOG_EVENTS.SCROLL_DEPTH) {
      steps.push({
        at: ev.at,
        label: `Scroll depth ${ev.scrollDepthPct ?? 0}%`,
        thought: "Scrolling further…",
      });
    } else if (ev.type === POSTHOG_EVENTS.SECTION_ENGAGED && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: ev.engagement === "read" ? "Reads carefully" : "Skims quickly",
        sectionId: ev.sectionId,
        thought: reactionBySection.get(ev.sectionId)?.thought ?? "",
        objectionNote: objectionsBySection.get(ev.sectionId)?.join(" "),
      });
    } else if (ev.type === POSTHOG_EVENTS.CTA_VIEWED && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: "CTA enters view",
        sectionId: ev.sectionId,
        thought: ev.ctaLabel ? `Sees “${ev.ctaLabel}”.` : "Sees the demo ask.",
      });
    } else if (ev.type === POSTHOG_EVENTS.BOOK_DEMO_CLICK && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: "Clicks CTA",
        sectionId: ev.sectionId,
        thought: "This is worth a next step.",
      });
    } else if (ev.type === POSTHOG_EVENTS.PAGE_EXIT && ev.bounced && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: "Bounces",
        sectionId: ev.sectionId,
        thought: `Leaving. Still unresolved: ${visit.unresolvedCritical.join(", ") || "none"}.`,
      });
    } else if (ev.type === POSTHOG_EVENTS.PAGE_EXIT && !ev.bounced) {
      steps.push({
        at: ev.at,
        label: "Exits without converting",
        thought: visit.verdict,
      });
    }
  }

  return steps.length ? steps : [{ at: 0, label: "No events", thought: visit.verdict }];
}
