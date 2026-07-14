"use client";

import { useCallback, useEffect, useState } from "react";
import { BehaviorDashboard } from "@/ui/workbench/behavior/BehaviorDashboard";
import { LiveLoopPanel } from "@/ui/live/LiveLoopPanel";
import type { VisitIndex } from "@/shared/registry";
import type { PageVariant } from "@/shared/schema/page";

function EmptyRun() {
  return null;
}

interface RunPayload {
  runVersion: number;
  index: VisitIndex;
  variants: PageVariant[];
}

export function BehaviorDashboardClient({
  initialIndex,
  initialVariants,
}: {
  initialIndex: VisitIndex | null;
  initialVariants: PageVariant[];
}) {
  const [runVersion, setRunVersion] = useState(0);
  const [index, setIndex] = useState<VisitIndex | null>(initialIndex);
  const [variants, setVariants] = useState<PageVariant[]>(initialVariants);
  const [loading, setLoading] = useState(false);

  const refreshRun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/run");
      if (!res.ok) return;
      const data = (await res.json()) as RunPayload;
      setIndex(data.index);
      setRunVersion(data.runVersion);
      setVariants(data.variants);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRun();
    const t = setInterval(refreshRun, 30_000);
    return () => clearInterval(t);
  }, [refreshRun]);

  if (!index) return <EmptyRun />;

  return (
    <div className="space-y-8">
      <LiveLoopPanel onUpdate={() => refreshRun()} />
      {loading && (
        <p className="text-center text-xs text-schole-primary/80">Refreshing simulation data…</p>
      )}
      <BehaviorDashboard key={runVersion} index={index} variants={variants} />
    </div>
  );
}
