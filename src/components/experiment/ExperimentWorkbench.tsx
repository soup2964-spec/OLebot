"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExperimentRun, GenerationRun } from "@/lib/schema/experiment";
import type { VisitIndex } from "@/lib/registry";
import type { PageVariant } from "@/lib/schema/page";
import { CRITERIA } from "@/config/criteria";
import { buildJudgmentsFromMetrics } from "@/lib/judgment/criteria";
import { ControlCenterView } from "@/components/experiment/ControlCenterView";
import { ExperimentDetailPanel } from "@/components/experiment/ExperimentDetailPanel";
import {
  PageComparisonView,
  snapshotFromRun,
} from "@/components/experiment/PageComparisonView";
import {
  ExperimentSideMenu,
  type WorkbenchView,
} from "@/components/experiment/ExperimentSideMenu";

interface RunPayload {
  runVersion: number;
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

function runFromPayload(
  initial: ExperimentRun | null,
  data: RunPayload
): ExperimentRun | null {
  if (!data.generations?.length) return initial;
  return {
    id: initial?.id ?? "live",
    createdAt: initial?.createdAt ?? new Date().toISOString(),
    personaSetVersion: initial?.personaSetVersion ?? 1,
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
  const [run, setRun] = useState(initialRun);
  const [variants, setVariants] = useState(initialVariants);
  const [visitIndex, setVisitIndex] = useState(initialIndex);
  const [activeView, setActiveView] = useState<WorkbenchView>("control");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [comparisonVariantId, setComparisonVariantId] = useState<string | null>(null);
  const [deployVersion, setDeployVersion] = useState(initialDeployVersion);
  const [lastPromotedVariantId, setLastPromotedVariantId] = useState<string | null>(null);
  const [lastDeployReason, setLastDeployReason] = useState<string | null>(null);
  const [comparisonVariants, setComparisonVariants] = useState<{
    previous: PageVariant[];
    current: PageVariant[];
  } | null>(null);
  const experimentNumber = Math.max(1, deployVersion || 1);
  const [iteration, setIteration] = useState(experimentNumber);

  const maxIteration = experimentNumber;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/run");
      if (!res.ok) return;
      const data = (await res.json()) as RunPayload;
      setVariants(data.variants);
      setVisitIndex(data.index);
      const nextDeploy = data.deployVersion ?? data.deploy?.deployVersion ?? 0;
      setDeployVersion(nextDeploy);
      setLastPromotedVariantId(
        data.lastPromotedVariantId ?? data.deploy?.lastPromotedVariantId ?? null
      );
      setLastDeployReason(data.deploy?.history?.[0]?.reason ?? null);
      if (data.comparison) {
        setComparisonVariants({
          previous: data.comparison.previous,
          current: data.comparison.current,
        });
      }
      setRun((prev) => runFromPayload(prev, data));
      const nextExperiment = Math.max(1, nextDeploy || 1);
      setIteration((i) => Math.min(Math.max(1, i), nextExperiment));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    setIteration((i) => Math.min(Math.max(1, i), maxIteration));
  }, [maxIteration]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setActiveView("behavior");
  };

  const judgmentsByVariant = useMemo(() => {
    const lastGen = run?.generations[run.generations.length - 1];
    if (!lastGen?.metrics) return {};
    return buildJudgmentsFromMetrics(lastGen.metrics, lastGen.decisions);
  }, [run]);

  const currentSnapshot = useMemo(() => {
    const gridVariants = comparisonVariants?.current ?? variants;
    return snapshotFromRun(deployVersion || iteration, gridVariants, judgmentsByVariant);
  }, [comparisonVariants, variants, deployVersion, iteration, judgmentsByVariant]);

  const previousSnapshot = useMemo(() => {
    if (!comparisonVariants?.previous?.length || deployVersion === 0) return null;
    return snapshotFromRun(Math.max(1, deployVersion - 1), comparisonVariants.previous);
  }, [comparisonVariants, deployVersion]);

  const comparisonMeta = CRITERIA.find((c) => c.id === "1");

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
        {activeView === "control" ? (
          <ControlCenterView
            onExperimentComplete={() => {
              void refresh();
              setActiveView("new");
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
              experimentNumber={experimentNumber}
              previousSnapshot={previousSnapshot}
              currentSnapshot={currentSnapshot}
              selectedVariantId={comparisonVariantId}
              onSelectVariant={setComparisonVariantId}
              onViewBehavior={handleSelectVariant}
            />
          </div>
        ) : (
          <div className="bg-white">
            <ExperimentDetailPanel
              activeView={activeView}
              run={run}
              variants={variants}
              visitIndex={visitIndex}
              selectedVariantId={selectedVariantId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
