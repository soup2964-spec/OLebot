"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Visit } from "@/lib/schema/events";
import type { PageVariant } from "@/lib/schema/page";
import { LandingPage } from "./LandingPage";
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
        className="max-h-[520px] overflow-y-auto rounded-2xl border border-slate-800 bg-white shadow-2xl"
      >
        <LandingPage variant={variant} highlightSectionId={current.sectionId} />
      </div>

      <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Replay theater</div>
        <div className="mt-1 font-semibold text-white">
          {persona?.name ?? visit.personaId}
          <span className="ml-2 text-xs font-normal text-slate-500">{persona?.role}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-slate-500">
          {variant.id} · {visit.converted ? "converted" : "lost"} · step {step + 1}/{timeline.length}
        </div>

        <div className="mt-4 flex-1 rounded-xl bg-slate-950 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
            {current.label}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{current.thought}</p>
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
            className="flex-1 rounded-full bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {playing ? "Playing…" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(timeline.length - 1, s + 1));
            }}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300"
          >
            Step
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300"
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
    if (ev.type === "page_view") {
      steps.push({
        at: ev.at,
        label: "Lands on page",
        thought: "Let me see what this is about…",
      });
    } else if (ev.type === "view_section" && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: `Scrolls to: ${section?.headline.slice(0, 40) ?? ev.sectionId}`,
        sectionId: ev.sectionId,
        thought: reactionBySection.get(ev.sectionId)?.thought ?? "Scanning this section…",
      });
    } else if ((ev.type === "read" || ev.type === "skim") && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: ev.type === "read" ? "Reads carefully" : "Skims quickly",
        sectionId: ev.sectionId,
        thought: reactionBySection.get(ev.sectionId)?.thought ?? "",
        objectionNote: objectionsBySection.get(ev.sectionId)?.join(" "),
      });
    } else if (ev.type === "cta_click" && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: "Clicks CTA",
        sectionId: ev.sectionId,
        thought: "This is worth a next step.",
      });
    } else if (ev.type === "bounce" && ev.sectionId) {
      steps.push({
        at: ev.at,
        label: "Bounces",
        sectionId: ev.sectionId,
        thought: `Leaving. Still unresolved: ${visit.unresolvedCritical.join(", ") || "none"}.`,
      });
    } else if (ev.type === "exit_complete") {
      steps.push({
        at: ev.at,
        label: "Exits without converting",
        thought: visit.verdict,
      });
    }
  }

  return steps.length ? steps : [{ at: 0, label: "No events", thought: visit.verdict }];
}
