/**
 * PostHog tracking plan — single source of truth for behavior measurement.
 * Scholé AI GTM Challenge: simulation, live instrumentation, fitness scoring, and UI
 * all reference this file.
 *
 * Aligned to schole.ai production stack:
 * - PostHog (defaults 2026-01-30, autocapture, session replay, $pageview / $pageleave)
 * - Google Tag Manager → GA4 (G-TG4MNT7SQ0) + Ads
 * - HubSpot (portal 147956950) via GTM generate_lead routing
 */

/** GTM Challenge context stamped on every event for PostHog / GTM segmentation. */
export const GTM_CHALLENGE = {
  slug: "schole_gtm_2026",
  name: "Scholé AI GTM Challenge",
  product: "Scholé AI",
} as const;

/** Production analytics IDs on schole.ai (reference — lab uses its own env keys). */
export const SCHOLE_PRODUCTION_STACK = {
  posthog: {
    host: "https://eu.i.posthog.com",
    defaults: "2026-01-30",
    personProfiles: "identified_only",
    /** Native events PostHog fires without custom instrumentation. */
    nativeEvents: ["$pageview", "$pageleave", "$autocapture", "$web_vitals"],
  },
  gtm: { containerId: "GTM-KMB4RW7C" },
  ga4: { measurementId: "G-TG4MNT7SQ0" },
  hubspot: { portalId: "147956950", hublet: "eu1" },
} as const;

/**
 * GA4 / GTM dataLayer event names — what Schole's GTM container expects.
 * Lab pushes these so live variant traffic routes the same as production.
 */
export const GTM_EVENTS = {
  PAGE_VIEW: "page_view",
  GENERATE_LEAD: "generate_lead",
  SCROLL: "scroll",
  SECTION_VIEW: "section_view",
  SELECT_CONTENT: "select_content",
  SESSION_END: "session_end",
} as const;

export const POSTHOG_EVENTS = {
  /** Session start — PostHog native (also fired explicitly on variant pages). */
  PAGEVIEW: "$pageview",
  /** Session end — PostHog native; enriched with scroll / dwell on variant pages. */
  PAGE_LEAVE: "$pageleave",
  /** Section entered viewport (IntersectionObserver ≥35%). Lab A/B exposure metric. */
  SECTION_VIEWED: "section_viewed",
  /** CTA block entered viewport — funnel diagnostic (not weighted). */
  CTA_VIEWED: "cta_viewed",
  /** Scroll milestone fired once per session at 25 / 50 / 75 / 100%. */
  SCROLL_DEPTH: "scroll_depth",
  /** Primary conversion — demo booking intent (cal.com CTA). GA4: generate_lead. */
  BOOK_DEMO_CLICK: "book_demo_click",
  /** Simulation-only enriched exit (bounce, objections). Live uses $pageleave. */
  PAGE_EXIT: "page_exit",
  /** Simulation-only: read vs skim dwell on a section (not sent to PostHog live). */
  SECTION_ENGAGED: "section_engaged",
} as const;

/** @deprecated Use POSTHOG_EVENTS.BOOK_DEMO_CLICK — kept for backward-compatible imports. */
export const CTA_CLICK_EVENT = POSTHOG_EVENTS.BOOK_DEMO_CLICK;

/** Legacy event name still accepted in HogQL / Supabase ingest. */
export const LEGACY_CTA_CLICK_EVENT = "cta_click";

export type PostHogEventName = (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];

/** Shared super-properties on every event (GTM Challenge + variant experiment). */
export const POSTHOG_SUPER_PROPERTIES = [
  "source",
  "challenge",
  "experiment_number",
  "variant_id",
  "generation",
  "strategy",
] as const;

export interface PostHogEventDefinition {
  id: string;
  event: string;
  label: string;
  role: string;
  weight: number;
  why: string;
  hogqlMeasure: string;
  properties: string[];
  /** Where this event lands in the Schole production stack. */
  stack: string;
  /** GTM dataLayer event name when forwarded to GA4 / HubSpot. */
  gtmEvent?: string;
}

export interface PostHogDiagnosticEventDefinition {
  id: string;
  event: string;
  label: string;
  role: string;
  why: string;
  hogqlMeasure: string;
  properties: string[];
  stack: string;
  gtmEvent?: string;
}

/**
 * Fitness score weights — conversion-first for a demo-booking landing page.
 * Sum to 1.0. Engagement metrics are bounded tiebreakers / leading indicators,
 * deliberately unable to override a real conversion gap. Phase 2 diagnostics
 * do NOT add weight.
 */
export const POSTHOG_BEHAVIOR_WEIGHTS = {
  /** Weight key — maps to book_demo_click event */
  cta_click: 0.8,
  scroll_depth: 0.1,
  page_exit: 0.05,
  section_viewed: 0.05,
  /** Demo-rate ceiling (B2B benchmark). Conversion term saturates here. */
  conversionCeiling: 0.05,
} as const;

export const POSTHOG_BEHAVIOR_EVENTS: PostHogEventDefinition[] = [
  {
    id: "cta_click",
    event: POSTHOG_EVENTS.BOOK_DEMO_CLICK,
    label: "Book demo click",
    role: "Primary conversion",
    weight: POSTHOG_BEHAVIOR_WEIGHTS.cta_click,
    why: "North-star for B2B landing pages. Maps to GA4 generate_lead and HubSpot pipeline intent.",
    hogqlMeasure:
      "countIf(event IN ('book_demo_click', 'cta_click')) / count(DISTINCT person_id) — demo booking rate",
    properties: [
      "challenge",
      "experiment_number",
      "variant_id",
      "section_id",
      "cta_label",
      "lead_type",
    ],
    stack: "PostHog custom · GTM generate_lead · HubSpot via GTM",
    gtmEvent: GTM_EVENTS.GENERATE_LEAD,
  },
  {
    id: "scroll_depth",
    event: POSTHOG_EVENTS.SCROLL_DEPTH,
    label: "Scroll depth",
    role: "Engagement (leading indicator)",
    weight: POSTHOG_BEHAVIOR_WEIGHTS.scroll_depth,
    why: "Leading indicator — sessions that scroll past the fold are paying attention. Bounded tiebreaker, cannot override a conversion gap.",
    hogqlMeasure:
      "max(properties.percent_scrolled) per session, averaged — or max_scroll_depth on $pageleave",
    properties: [
      "challenge",
      "experiment_number",
      "variant_id",
      "percent_scrolled",
      "scroll_depth_pct",
    ],
    stack: "PostHog custom · GTM scroll (GA4 recommended event)",
    gtmEvent: GTM_EVENTS.SCROLL,
  },
  {
    id: "page_exit",
    event: POSTHOG_EVENTS.PAGE_LEAVE,
    label: "Page leave (non-bounce)",
    role: "Retention (guardrail signal)",
    weight: POSTHOG_BEHAVIOR_WEIGHTS.page_exit,
    why: "Inverse bounce on PostHog $pageleave: left after engaging (scroll ≥15%). Low weight — bounce is enforced separately as a hard guardrail.",
    hogqlMeasure:
      "1 − countIf(event = '$pageleave' AND properties.bounced = true) / countIf(event = '$pageleave')",
    properties: [
      "challenge",
      "experiment_number",
      "variant_id",
      "max_scroll_depth",
      "dwell_ms",
      "bounced",
      "converted",
      "sections_viewed_count",
    ],
    stack: "PostHog $pageleave (native) · GTM session_end",
    gtmEvent: GTM_EVENTS.SESSION_END,
  },
  {
    id: "section_viewed",
    event: POSTHOG_EVENTS.SECTION_VIEWED,
    label: "Section reach",
    role: "Content exposure (leading indicator)",
    weight: POSTHOG_BEHAVIOR_WEIGHTS.section_viewed,
    why: "Leading indicator — how much of the page story visitors saw. Bounded tiebreaker for copy A/B tests, not a co-equal outcome.",
    hogqlMeasure:
      "count(DISTINCT properties.section_id) per session ÷ total sections on variant",
    properties: ["challenge", "experiment_number", "variant_id", "section_id"],
    stack: "PostHog custom · GTM section_view",
    gtmEvent: GTM_EVENTS.SECTION_VIEW,
  },
];

/**
 * Phase 2 — funnel diagnostics for the GTM Challenge.
 * Explain losses; never mixed into the fitness score.
 */
export const POSTHOG_DIAGNOSTIC_EVENTS: PostHogDiagnosticEventDefinition[] = [
  {
    id: "cta_viewed",
    event: POSTHOG_EVENTS.CTA_VIEWED,
    label: "CTA viewed",
    role: "Funnel diagnostic",
    why: "Separates “never saw the ask” from “saw it and didn’t click” — critical for landing page copy tests.",
    hogqlMeasure:
      "countIf(event = 'cta_viewed') / countIf(event = '$pageview') — CTA exposure rate",
    properties: [
      "challenge",
      "experiment_number",
      "variant_id",
      "section_id",
      "cta_label",
    ],
    stack: "PostHog custom · GTM select_content",
    gtmEvent: GTM_EVENTS.SELECT_CONTENT,
  },
  {
    id: "page_exit_enriched",
    event: POSTHOG_EVENTS.PAGE_EXIT,
    label: "Page exit (simulation)",
    role: "Loss analysis",
    why: "Simulation-only enriched exit with unresolved buyer objections. Live traffic uses $pageleave.",
    hogqlMeasure:
      "Break down page_exit by properties.unresolved_objections and properties.bounced (simulation)",
    properties: [
      "max_scroll_depth",
      "dwell_ms",
      "bounced",
      "converted",
      "sections_viewed_count",
      "unresolved_objections",
    ],
    stack: "Simulation only — not sent to production PostHog",
  },
];

export const POSTHOG_BEHAVIOR_WEIGHT_TOTAL = POSTHOG_BEHAVIOR_EVENTS.reduce(
  (s, e) => s + e.weight,
  0
);

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

/** Section ids treated as CTA exposure on Scholé landing variants. */
export const CTA_SECTION_IDS = new Set(["cta", "hero"]);

export function isCtaSection(sectionId: string): boolean {
  return CTA_SECTION_IDS.has(sectionId);
}

export function scrollDepthMilestones(depthFraction: number): number[] {
  const pct = Math.round(Math.min(1, Math.max(0, depthFraction)) * 100);
  return SCROLL_MILESTONES.filter((m) => pct >= m);
}

/** Primary conversion events for HogQL / calibration (includes legacy name). */
export const CONVERSION_EVENT_NAMES = [
  POSTHOG_EVENTS.BOOK_DEMO_CLICK,
  LEGACY_CTA_CLICK_EVENT,
] as const;

export function computeFitnessFromPostHogRates(rates: {
  ctaClickRate: number;
  avgScrollDepth: number;
  bounceRate: number;
  avgSectionReach: number;
}): number {
  const { conversionCeiling } = POSTHOG_BEHAVIOR_WEIGHTS;
  return (
    100 *
    (POSTHOG_BEHAVIOR_WEIGHTS.cta_click *
      Math.min(1, rates.ctaClickRate / conversionCeiling) +
      POSTHOG_BEHAVIOR_WEIGHTS.scroll_depth * rates.avgScrollDepth +
      POSTHOG_BEHAVIOR_WEIGHTS.page_exit * (1 - rates.bounceRate) +
      POSTHOG_BEHAVIOR_WEIGHTS.section_viewed * rates.avgSectionReach)
  );
}

export const BOUNCE_SCROLL_THRESHOLD = 0.15;

export function isBounceExit(scrollDepth: number): boolean {
  return scrollDepth < BOUNCE_SCROLL_THRESHOLD;
}

export interface PageExitProperties {
  maxScrollDepth: number;
  dwellMs: number;
  bounced: boolean;
  converted: boolean;
  sectionsViewedCount: number;
  unresolvedObjections?: string[];
}
