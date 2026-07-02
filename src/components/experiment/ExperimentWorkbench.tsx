"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExperimentRun, GenerationRun } from "@/lib/schema/experiment";
import type { VisitIndex } from "@/lib/registry";
import type { PageVariant } from "@/lib/schema/page";
import type { ExperimentProgress } from "@/lib/schema/experiment-progress";
import type { ExperimentHistoryEntry } from "@/lib/loop/state";
import { CRITERIA } from "@/config/criteria";
import { buildJudgmentsFromMetrics } from "@/lib/judgment/criteria";
import { comparisonSnapshotsForIteration, maxExperimentIteration } from "@/lib/comparison/snapshots";
import { ControlCenterView } from "@/components/experiment/ControlCenterView";
import { ExperimentDetailPanel } from "@/components/experiment/ExperimentDetailPanel";
import { ExperimentProgressBar } from "@/components/experiment/ExperimentProgressBar";
import { PageComparisonView } from "@/components/experiment/PageComparisonView";
import {
  ExperimentSideMenu,
  type WorkbenchView,
} from "@/components/experiment/ExperimentSideMenu";

interface RunPayload {
  runId?: string | null;
  runVersion: number;
  updatedAt?: string;
  personaSetVersion?: number;
  experimentHistory?: ExperimentHistoryEntry[];
  experimentProgress?: ExperimentProgress;
  experimentNumber?: number | null;
  deployVersion?: number;
  lastPromotedVariantId?: string | null;
  deploy?: {
    deployVersion: number;
    lastPromotedVariantId: string | null;
    history?: { reason: string }[];
  };
  comparison?: {
    previous: PageVariant[];
    current: PageVariant[];
    deployVersion: number;
    lastPromotedVariantId: string | null;
  };
  variants: PageVariant[];
  index: VisitIndex;
  generations?: Array<
    Pick<
      GenerationRun,
      | "generation"
      | "variantIds"
      | "totalVisits"
      | "metrics"
      | "decisions"
      | "allocationHistory"
      | "offspringIds"
    > & { report: { insights: string } }
  >;
}

function runFromPayload(data: RunPayload): ExperimentRun | null {
  if (!data.generations?.length) return null;
  return {
    id: data.runId ?? "live",
    createdAt: data.updatedAt ?? new Date().toISOString(),
    personaSetVersion: data.personaSetVersion ?? 1,
    variants: data.variants,
    generations: data.generations.map((g) => ({
      ...g,
      visits: [],
      offspringIds: g.offspringIds ?? [],
      report: {
        generation: g.generation,
        insights: g.report.insights,
        findings: [],
        scorecards: [],
      },
    })),
  };
}

export function ExperimentWorkbench({
  initialRun,
  initialVariants,
  initialDeployVersion,
  initialIndex,
}: {
  initialRun: ExperimentRun | null;
  initialVariants: PageVariant[];
  initialDeployVersion: number;
  initialIndex: VisitIndex | null;
}) {
  const [iterationRun, setIterationRun] = useState<ExperimentRun | null>(initialRun);
  const [visitIndex, setVisitIndex] = useState<VisitIndex | null>(initialIndex);
  const [activeView, setActiveView] = useState<WorkbenchView>("control");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [deployVersion, setDeployVersion] = useState(initialDeployVersion);
  const [experimentHistory, setExperimentHistory] = useState<ExperimentHistoryEntry[]>([]);
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [iteration, setIteration] = useState(1);

  const isRunning = progress?.status === "running";
  const maxIteration = maxExperimentIteration(experimentHistory, isRunning);
  const experimentActive =
    isRunning || progress?.status === "complete" || progress?.status === "error";

  const pollProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/control/progress");
      if (!res.ok) return;
      setProgress(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const loadIteration = useCallback(async (experimentNumber: number) => {
    try {
      const res = await fetch(`/api/run?experiment=${experimentNumber}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as RunPayload;
      setExperimentHistory(data.experimentHistory ?? []);
      if (data.experimentProgress) setProgress(data.experimentProgress);
      const nextDeploy = data.deployVersion ?? data.deploy?.deployVersion ?? 0;
      setDeployVersion(nextDeploy);
      setIterationRun(runFromPayload(data));
      setVisitIndex(data.index ?? null);
      return data;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const data = await loadIteration(iteration);
    if (!data) return null;
    const hist = data.experimentHistory ?? [];
    const running = data.experimentProgress?.status === "running";
    setIteration((i) => Math.min(Math.max(1, i), maxExperimentIteration(hist, running)));
    return data;
  }, [iteration, loadIteration]);

  useEffect(() => {
    void pollProgress();
    void loadIteration(1);
  }, [loadIteration, pollProgress]);

  useEffect(() => {
    void loadIteration(iteration);
  }, [iteration, loadIteration]);

  useEffect(() => {
    const ms = isRunning ? 800 : 5000;
    void pollProgress();
    const t = setInterval(pollProgress, ms);
    return () => clearInterval(t);
  }, [isRunning, pollProgress]);

  useEffect(() => {
    if (!isRunning || iteration !== maxIteration) return;
    void loadIteration(iteration);
    const t = setInterval(() => loadIteration(iteration), 5000);
    return () => clearInterval(t);
  }, [isRunning, iteration, maxIteration, loadIteration]);

  useEffect(() => {
    setIteration((i) => Math.min(Math.max(1, i), maxIteration));
  }, [maxIteration]);

  const judgmentsByVariant = useMemo(() => {
    const lastGen = iterationRun?.generations[iterationRun.generations.length - 1];
    if (!lastGen?.metrics) return {};
    return buildJudgmentsFromMetrics(lastGen.metrics, lastGen.decisions);
  }, [iterationRun]);

  const iterationVariants = iterationRun?.variants ?? [];

  const { previous: previousVariants, current: currentVariants } = useMemo(
    () =>
      comparisonSnapshotsForIteration(iteration, {
        run: iterationRun,
        experimentHistory,
        progress,
      }),
    [iteration, iterationRun, experimentHistory, progress]
  );

  const comparisonMeta = CRITERIA.find((c) => c.id === "1");
  const progressExperiment = progress?.experimentNumber ?? maxIteration;

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-slate-100">
      <ExperimentSideMenu
        activeView={activeView}
        onViewChange={setActiveView}
        iteration={iteration}
        maxIteration={maxIteration}
        onPrevIteration={() => setIteration((i) => Math.max(1, i - 1))}
        onNextIteration={() => setIteration((i) => Math.min(maxIteration, i + 1))}
      />

      <div className="min-w-0 flex-1 overflow-y-auto lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)]">
        {experimentActive && progress && progress.status !== "idle" && (
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 p-4 backdrop-blur">
            <ExperimentProgressBar progress={progress} />
            {progress.experimentNumber != null && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Experiment {progress.experimentNumber} · progress saved — switch tabs freely
              </p>
            )}
          </div>
        )}

        {activeView === "control" ? (
          <ControlCenterView
            progress={progress}
            pollProgress={pollProgress}
            onExperimentComplete={async () => {
              const data = await refresh();
              await pollProgress();
              const hist = data?.experimentHistory ?? [];
              const next = maxExperimentIteration(hist, false);
              setIteration(next);
              await loadIteration(next);
              setActiveView("versions");
            }}
          />
        ) : activeView === "versions" ? (
          <div className="p-6">
            {comparisonMeta && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">{comparisonMeta.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{comparisonMeta.question}</p>
              </div>
            )}
            <PageComparisonView
              experimentNumber={iteration}
              previousVariants={previousVariants}
              currentVariants={currentVariants}
              isRunning={isRunning && iteration === progressExperiment}
            />
          </div>
        ) : (
          <div className="bg-white">
            <ExperimentDetailPanel
              key={`${iterationRun?.id ?? "none"}-${iteration}`}
              activeView={activeView}
              run={iterationRun}
              variants={iterationVariants}
              visitIndex={visitIndex}
              selectedVariantId={selectedVariantId}
              experimentNumber={iteration}
              bredVariants={currentVariants}
              judgmentsByVariant={judgmentsByVariant}
            />
          </div>
        )}
      </div>
    </div>
  );
}
