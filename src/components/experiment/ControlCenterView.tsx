"use client";

import { useCallback, useEffect, useState } from "react";
import { CRITERIA } from "@/config/criteria";

interface ControlState {
  autonomous: boolean;
  runVersion: number;
  lastRunId: string | null;
  llmConfigured?: boolean;
  llmProvider?: string | null;
}

export function ControlCenterView({
  onExperimentComplete,
}: {
  onExperimentComplete?: () => void;
}) {
  const meta = CRITERIA.find((c) => c.id === "0");
  const [state, setState] = useState<ControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/control");
      if (!res.ok) return;
      setState(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAutonomous = async (autonomous: boolean) => {
    setError(null);
    setMessage(null);
    const prev = state?.autonomous ?? false;
    setState((s) =>
      s ? { ...s, autonomous } : { autonomous, runVersion: 0, lastRunId: null }
    );

    try {
      const res = await fetch("/api/control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autonomous }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update mode");
      }
      const body = await res.json();
      setState((s) => (s ? { ...s, autonomous: body.autonomous } : s));
    } catch (e) {
      setState((s) => (s ? { ...s, autonomous: prev } : s));
      setError(e instanceof Error ? e.message : "Failed to update mode");
    }
  };

  const runExperiment = async () => {
    setRunning(true);
    setError(null);
    setMessage("LLM agents are reading pages, evaluating results, and breeding new copy. This can take several minutes — keep this tab open.");

    try {
      const res = await fetch("/api/control", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Experiment failed");
      }

      setMessage(
        `LLM experiment complete (${body.llmProvider ?? "llm"}): ${body.totalVisits?.toLocaleString?.() ?? body.totalVisits} simulated visits, ${body.offspringCount} new page${body.offspringCount === 1 ? "" : "s"} bred.`
      );
      await refresh();
      onExperimentComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Experiment failed");
    } finally {
      setRunning(false);
    }
  };

  const autonomous = state?.autonomous ?? false;
  const llmReady = state?.llmConfigured ?? false;

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-start justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {meta && (
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">{meta.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{meta.question}</p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Autonomous</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {autonomous
                  ? "Live traffic automatically recalibrates personas and re-runs the loop."
                  : "Manual mode — you trigger each LLM experiment run."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autonomous}
              disabled={loading}
              onClick={() => setAutonomous(!autonomous)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                autonomous ? "bg-schole-primary" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  autonomous ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!autonomous && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={runExperiment}
                disabled={running || !llmReady}
                className="w-full rounded-xl bg-schole-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-schole-primary-hover disabled:opacity-50"
              >
                {running ? "Running LLM experiment…" : "Run experiment"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Personas read each page via LLM, traffic is simulated, winners are ranked, and
                the optimizer breeds six new landing pages with evidence-backed copy.
              </p>
              {!llmReady && !loading && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Add <code className="font-mono">KIE_API_KEY</code> or{" "}
                  <code className="font-mono">OPENAI_API_KEY</code> to{" "}
                  <code className="font-mono">.env.local</code> and restart the dev server.
                </p>
              )}
            </div>
          )}
        </section>

        {running && (
          <p className="rounded-xl border border-schole-primary/20 bg-schole-primary/5 px-4 py-3 text-sm text-slate-700">
            {message}
          </p>
        )}
        {!running && message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
