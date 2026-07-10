"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisitIndex } from "@/platform/registry";
import type { Visit } from "@/platform/schema/events";
import type { PageVariant } from "@/platform/schema/page";
import type { PersonaSet } from "@/platform/schema/persona";
import { personaStatsForVariant } from "@/domains/personas/experiment-stats";

type OutcomeFilter = "all" | "converted" | "lost" | "bounced";

export function useBehaviorDashboard({
  index,
  variants,
  initialVariantId,
  runId,
}: {
  index: VisitIndex;
  variants: PageVariant[];
  initialVariantId?: string | null;
  runId?: string | null;
}) {
  const [genIdx, setGenIdx] = useState(() => Math.max(0, index.length - 1));
  const [variantId, setVariantId] = useState(
    () => initialVariantId ?? index[Math.max(0, index.length - 1)]?.variantIds[0] ?? ""
  );
  const [personaFilter, setPersonaFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [personaSet, setPersonaSet] = useState<PersonaSet | null>(null);

  const personas = personaSet?.personas ?? [];

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/personas", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPersonaSet(data as PersonaSet);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!index.length) return;
    const nextGenIdx = index.length - 1;
    const nextVariantId =
      initialVariantId && index[nextGenIdx]?.variantIds.includes(initialVariantId)
        ? initialVariantId
        : index[nextGenIdx]?.variantIds[0] ?? "";
    setGenIdx(nextGenIdx);
    setVariantId(nextVariantId);
    setPersonaFilter("all");
    setSelectedId(null);
  }, [index, runId, initialVariantId]);

  useEffect(() => {
    if (initialVariantId) setVariantId(initialVariantId);
  }, [initialVariantId]);

  const gen = index[genIdx];
  const variant = variants.find((v) => v.id === variantId);
  const metrics = gen?.metrics.find((m) => m.variantId === variantId);

  const filtered = useMemo(() => {
    let list = gen?.visits.filter((v) => v.variantId === variantId) ?? [];
    if (personaFilter !== "all") list = list.filter((v) => v.personaId === personaFilter);
    if (outcomeFilter === "converted") list = list.filter((v) => v.converted);
    if (outcomeFilter === "lost") list = list.filter((v) => !v.converted);
    if (outcomeFilter === "bounced") list = list.filter((v) => v.bounced);
    return list;
  }, [gen, variantId, personaFilter, outcomeFilter]);

  const stats = useMemo(() => {
    if (metrics) {
      return {
        visits: metrics.visits,
        conversionRate: metrics.conversionRate,
        bounceRate: metrics.bounceRate,
        avgScroll: metrics.avgScrollDepth,
        avgDwell: metrics.avgDwellMs,
      };
    }
    const visits = gen?.visits.filter((v) => v.variantId === variantId) ?? [];
    const n = visits.length || 1;
    return {
      visits: visits.length,
      conversionRate: visits.filter((v) => v.converted).length / n,
      bounceRate: visits.filter((v) => v.bounced).length / n,
      avgScroll: visits.reduce((s, v) => s + v.scrollDepth, 0) / n,
      avgDwell: visits.reduce((s, v) => s + v.totalDwellMs, 0) / n,
    };
  }, [metrics, gen, variantId]);

  const personaStats = useMemo(
    () => personaStatsForVariant(metrics, personas),
    [metrics, personas]
  );

  const fetchVisit = useCallback(async (id: string, generation: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${encodeURIComponent(id)}?gen=${generation}`);
      if (!res.ok) throw new Error("Failed");
      setVisit((await res.json()) as Visit);
    } catch {
      setVisit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      setVisit(null);
      return;
    }
    const pick = filtered.find((v) => v.id === selectedId) ?? filtered[0];
    if (pick.id !== selectedId) setSelectedId(pick.id);
    fetchVisit(pick.id, gen.generation);
  }, [filtered, selectedId, gen.generation, fetchVisit]);

  const selectedSummary = filtered.find((v) => v.id === selectedId);


  return {
    genIdx,
    setGenIdx,
    variantId,
    setVariantId,
    personaFilter,
    setPersonaFilter,
    outcomeFilter,
    setOutcomeFilter,
    selectedId,
    setSelectedId,
    visit,
    loading,
    personas,
    gen,
    variant,
    metrics,
    filtered,
    stats,
    personaStats,
    selectedSummary,
    index,
    variants,
  };
}
