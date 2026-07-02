import posthog from "posthog-js";
import {
  GTM_CHALLENGE,
  GTM_EVENTS,
  isBounceExit,
  POSTHOG_EVENTS,
  type PageExitProperties,
} from "./posthog-events";
import {
  pushDataLayer,
  pushGenerateLead,
  pushPageContext,
  pushScrollMilestone,
  pushSessionEnd,
} from "./gtm";
import { trackHubSpotDemoIntent } from "./hubspot";
import { pushLiveAnalytics } from "./live-track";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export const ANALYTICS_SOURCE = "landing_lab";

export interface VariantContext {
  variantId: string;
  generation: number;
  strategy: string;
  /** Active lab experiment (GTM Challenge run number). */
  experimentNumber?: number;
  /** PostHog challenge slug for segmentation. */
  challenge?: string;
}

const basePayload = (ctx: VariantContext) => ({
  source: ANALYTICS_SOURCE,
  challenge: ctx.challenge ?? GTM_CHALLENGE.slug,
  experiment_number: ctx.experimentNumber ?? 1,
  variant_id: ctx.variantId,
  generation: ctx.generation,
  strategy: ctx.strategy,
});

/** Tag the session with variant metadata across PostHog, GTM, and Clarity. */
export function identifyVariant(ctx: VariantContext) {
  const payload = basePayload(ctx);

  posthog.register(payload);
  posthog.capture(POSTHOG_EVENTS.PAGEVIEW, payload);

  pushPageContext(payload);

  window.clarity?.("set", "variant_id", ctx.variantId);
  window.clarity?.("set", "generation", String(ctx.generation));
  window.clarity?.("set", "strategy", ctx.strategy);
  window.clarity?.("set", "experiment_number", String(payload.experiment_number));
  window.clarity?.("set", "challenge", payload.challenge);

  if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem("ll_heartbeat")) {
    sessionStorage.setItem("ll_heartbeat", "1");
    fetch("/api/loop/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  pushLiveAnalytics(ctx, "session_start", {
    experimentNumber: payload.experiment_number,
  });
}

export function trackSectionViewed(ctx: VariantContext, sectionId: string) {
  const payload = { ...basePayload(ctx), section_id: sectionId };

  posthog.capture(POSTHOG_EVENTS.SECTION_VIEWED, payload);
  pushDataLayer(GTM_EVENTS.SECTION_VIEW, payload);

  pushLiveAnalytics(ctx, POSTHOG_EVENTS.SECTION_VIEWED, { sectionId });
}

/** Funnel diagnostic — CTA block entered viewport (not weighted in fitness). */
export function trackCtaViewed(
  ctx: VariantContext,
  sectionId: string,
  ctaLabel?: string
) {
  const payload = {
    ...basePayload(ctx),
    section_id: sectionId,
    content_type: "cta",
    ...(ctaLabel ? { cta_label: ctaLabel } : {}),
  };

  posthog.capture(POSTHOG_EVENTS.CTA_VIEWED, payload);
  pushDataLayer(GTM_EVENTS.SELECT_CONTENT, payload);

  pushLiveAnalytics(ctx, POSTHOG_EVENTS.CTA_VIEWED, {
    sectionId,
    ctaLabel,
  });
}

/** Primary conversion — book demo / cal.com CTA (PostHog + GA4 generate_lead + HubSpot). */
export function trackBookDemoClick(
  ctx: VariantContext,
  sectionId: string,
  ctaLabel?: string
) {
  const payload = {
    ...basePayload(ctx),
    section_id: sectionId,
    lead_type: "demo_booking",
    ...(ctaLabel ? { cta_label: ctaLabel } : {}),
  };

  posthog.capture(POSTHOG_EVENTS.BOOK_DEMO_CLICK, payload);
  pushGenerateLead(payload);

  window.clarity?.("set", "cta_variant", ctx.variantId);
  window.clarity?.("set", "cta_section", sectionId);
  window.clarity?.("event", POSTHOG_EVENTS.BOOK_DEMO_CLICK);

  trackHubSpotDemoIntent({
    variantId: ctx.variantId,
    sectionId,
    ctaLabel,
    experimentNumber: ctx.experimentNumber,
  });

  pushLiveAnalytics(ctx, POSTHOG_EVENTS.BOOK_DEMO_CLICK, {
    sectionId,
    ctaLabel,
    converted: true,
  });

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("ll_converted", "1");
  }
}

/** @deprecated Use trackBookDemoClick */
export const trackCtaClick = trackBookDemoClick;

export function trackScrollDepth(ctx: VariantContext, depthPct: number) {
  const payload = {
    ...basePayload(ctx),
    percent_scrolled: depthPct,
    scroll_depth_pct: depthPct,
  };

  posthog.capture(POSTHOG_EVENTS.SCROLL_DEPTH, payload);
  pushScrollMilestone(depthPct, payload);

  pushLiveAnalytics(ctx, POSTHOG_EVENTS.SCROLL_DEPTH, {
    scrollDepth: depthPct / 100,
    scrollDepthPct: depthPct,
  });
}

export function trackPageExit(
  ctx: VariantContext,
  scrollDepth: number,
  dwellMs: number,
  extras?: Partial<
    Pick<
      PageExitProperties,
      "converted" | "sectionsViewedCount" | "unresolvedObjections"
    >
  >
) {
  const bounced = isBounceExit(scrollDepth);
  const payload = {
    ...basePayload(ctx),
    max_scroll_depth: scrollDepth,
    scroll_depth: scrollDepth,
    dwell_ms: dwellMs,
    bounced,
    converted: extras?.converted ?? false,
    sections_viewed_count: extras?.sectionsViewedCount ?? 0,
    ...(extras?.unresolvedObjections?.length
      ? { unresolved_objections: extras.unresolvedObjections }
      : {}),
  };

  // PostHog native exit — matches schole.ai production $pageleave
  posthog.capture(POSTHOG_EVENTS.PAGE_LEAVE, payload);
  pushSessionEnd(payload);

  pushLiveAnalytics(ctx, POSTHOG_EVENTS.PAGE_LEAVE, {
    scrollDepth,
    dwellMs,
    bounced,
    converted: extras?.converted ?? false,
    sectionsViewedCount: extras?.sectionsViewedCount,
    unresolvedObjections: extras?.unresolvedObjections,
    experimentNumber: ctx.experimentNumber,
  });
}

/** @deprecated Use trackPageExit */
export const trackBounce = trackPageExit;
