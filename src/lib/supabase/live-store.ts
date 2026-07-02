import { allVariants } from "@/lib/registry";
import { FITNESS_WEIGHTS } from "@/lib/sim/metrics";
import { analyzeGeneration } from "@/lib/stats/bayes";
import type { VariantMetrics } from "@/lib/schema/events";
import type { VariantDecision } from "@/lib/stats/bayes";
import { getSupabaseAdmin, supabaseConfigured } from "./server";
import type { AnalyticsIngestBody, LabEventRow, LabSessionRow } from "./types";

const DEFAULT_WINDOW_DAYS = 30;

export function liveAnalyticsEnabled(): boolean {
  return supabaseConfigured();
}

export async function ingestAnalyticsEvent(body: AnalyticsIngestBody): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase is not configured");

  const { data: existing, error: fetchErr } = await sb
    .from("lab_sessions")
    .select("id")
    .eq("session_token", body.sessionToken)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);

  let sessionId = existing?.id as string | undefined;

  if (!sessionId) {
    const { data: created, error: createErr } = await sb
      .from("lab_sessions")
      .insert({
        session_token: body.sessionToken,
        variant_id: body.variantId,
        generation: body.generation ?? 0,
        strategy: body.strategy ?? null,
        target_token: body.targetToken ?? null,
      })
      .select("id")
      .single();

    if (createErr) throw new Error(createErr.message);
    sessionId = created.id;
  }

  const sessionPatch: Partial<LabSessionRow> = {};
  if (body.scrollDepth !== undefined) {
    sessionPatch.scroll_depth = Math.min(1, Math.max(0, body.scrollDepth));
  }
  if (body.dwellMs !== undefined) {
    sessionPatch.total_dwell_ms = Math.max(0, body.dwellMs);
  }
  if (body.converted !== undefined) sessionPatch.converted = body.converted;
  if (body.bounced !== undefined) sessionPatch.bounced = body.bounced;

  if (Object.keys(sessionPatch).length) {
    const { error: updateErr } = await sb
      .from("lab_sessions")
      .update(sessionPatch)
      .eq("id", sessionId);
    if (updateErr) throw new Error(updateErr.message);
  }

  const eventType =
    body.event === "session_start"
      ? "page_view"
      : body.event === "page_exit"
        ? "page_exit"
        : body.event;

  const { error: eventErr } = await sb.from("lab_events").insert({
    session_id: sessionId,
    event_type: eventType,
    section_id: body.sectionId ?? null,
    dwell_ms: body.dwellMs ?? null,
    scroll_depth_pct: body.scrollDepthPct ?? null,
    at_ms: body.dwellMs ?? null,
  });

  if (eventErr) throw new Error(eventErr.message);
}

function fitnessFromRates(
  conversionRate: number,
  avgScrollDepth: number,
  bounceRate: number,
  meanSentiment = 0
): number {
  return (
    100 *
    (FITNESS_WEIGHTS.conversion *
      Math.min(1, conversionRate / FITNESS_WEIGHTS.conversionCeiling) +
      FITNESS_WEIGHTS.scroll * avgScrollDepth +
      FITNESS_WEIGHTS.bounce * (1 - bounceRate) +
      FITNESS_WEIGHTS.sentiment * ((meanSentiment + 2) / 4))
  );
}

function buildPerSectionMetrics(
  variantId: string,
  sectionIds: string[],
  sessions: LabSessionRow[],
  events: LabEventRow[]
): VariantMetrics["perSection"] {
  const sessionIds = new Set(
    sessions.filter((s) => s.variant_id === variantId).map((s) => s.id)
  );
  const variantEvents = events.filter((e) => sessionIds.has(e.session_id));

  return sectionIds.map((sectionId) => {
    const views = variantEvents.filter(
      (e) => e.section_id === sectionId && e.event_type === "section_view"
    ).length;
    const ctaClicks = variantEvents.filter(
      (e) => e.section_id === sectionId && e.event_type === "cta_click"
    ).length;
    const reads = views;
    const skims = 0;

    const exitedHere = sessions.filter(
      (s) =>
        s.variant_id === variantId &&
        s.bounced &&
        s.scroll_depth < 0.2 &&
        variantEvents.some(
          (e) =>
            e.session_id === s.id &&
            e.section_id === sectionId &&
            e.event_type === "section_view"
        )
    ).length;

    return {
      sectionId,
      views: Math.max(views, ctaClicks),
      reads,
      skims,
      avgDwellMs: 0,
      avgSentiment: 0,
      exitRate: views > 0 ? exitedHere / views : 0,
    };
  });
}

export type LiveBehaviorSnapshot = {
  source: "live";
  fetchedAt: string;
  windowDays: number;
  totalSessions: number;
  variantIds: string[];
  metrics: VariantMetrics[];
  decisions: VariantDecision[];
  totals: {
    visits: number;
    conversions: number;
    conversionRate: number;
    bounceRate: number;
    avgScroll: number;
    avgDwellMs: number;
  };
};

export async function fetchLiveBehaviorSnapshot(
  windowDays = DEFAULT_WINDOW_DAYS
): Promise<LiveBehaviorSnapshot | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;

  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const { data: sessions, error: sessErr } = await sb
    .from("lab_sessions")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (sessErr) throw new Error(sessErr.message);
  const rows = (sessions ?? []) as LabSessionRow[];
  if (!rows.length) {
    return {
      source: "live",
      fetchedAt: new Date().toISOString(),
      windowDays,
      totalSessions: 0,
      variantIds: allVariants().map((v) => v.id),
      metrics: [],
      decisions: [],
      totals: {
        visits: 0,
        conversions: 0,
        conversionRate: 0,
        bounceRate: 0,
        avgScroll: 0,
        avgDwellMs: 0,
      },
    };
  }

  const sessionIds = rows.map((s) => s.id);
  const { data: events, error: evErr } = await sb
    .from("lab_events")
    .select("*")
    .in("session_id", sessionIds);

  if (evErr) throw new Error(evErr.message);
  const eventRows = (events ?? []) as LabEventRow[];

  const variants = allVariants();
  const variantIds = [...new Set(rows.map((s) => s.variant_id))];
  const baselineId = variantIds.includes("v0-baseline")
    ? "v0-baseline"
    : variantIds[0];

  const metrics: VariantMetrics[] = variantIds.map((variantId) => {
    const vSessions = rows.filter((s) => s.variant_id === variantId);
    const n = vSessions.length || 1;
    const conversions = vSessions.filter((s) => s.converted).length;
    const conversionRate = conversions / n;
    const avgScrollDepth =
      vSessions.reduce((sum, s) => sum + Number(s.scroll_depth), 0) / n;
    const avgDwellMs =
      vSessions.reduce((sum, s) => sum + s.total_dwell_ms, 0) / n;
    const bounces = vSessions.filter((s) => s.bounced).length;
    const bounceRate = bounces / n;

    const variant = variants.find((v) => v.id === variantId);
    const sectionIds = variant?.sections.map((s) => s.id) ?? [];

    const fitness = fitnessFromRates(conversionRate, avgScrollDepth, bounceRate);

    return {
      variantId,
      visits: vSessions.length,
      conversions,
      conversionRate,
      avgScrollDepth,
      avgDwellMs,
      bounceRate,
      fitness,
      perSection: buildPerSectionMetrics(variantId, sectionIds, rows, eventRows),
      byPersona: {},
      objectionFailures: {},
    };
  });

  metrics.sort((a, b) => b.fitness - a.fitness);

  const decisions = analyzeGeneration(
    metrics.map((m) => ({
      id: m.variantId,
      conversions: m.conversions,
      visits: m.visits,
      bounceRate: m.bounceRate,
    })),
    baselineId,
    424242
  );

  const totalVisits = rows.length;
  const totalConversions = rows.filter((s) => s.converted).length;

  return {
    source: "live",
    fetchedAt: new Date().toISOString(),
    windowDays,
    totalSessions: totalVisits,
    variantIds,
    metrics,
    decisions,
    totals: {
      visits: totalVisits,
      conversions: totalConversions,
      conversionRate: totalVisits ? totalConversions / totalVisits : 0,
      bounceRate: totalVisits
        ? rows.filter((s) => s.bounced).length / totalVisits
        : 0,
      avgScroll: totalVisits
        ? rows.reduce((s, r) => s + Number(r.scroll_depth), 0) / totalVisits
        : 0,
      avgDwellMs: totalVisits
        ? rows.reduce((s, r) => s + r.total_dwell_ms, 0) / totalVisits
        : 0,
    },
  };
}
