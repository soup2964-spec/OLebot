import posthog from "posthog-js";
import { pushDataLayer } from "./gtm";
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
}

const basePayload = (ctx: VariantContext) => ({
  source: ANALYTICS_SOURCE,
  variant_id: ctx.variantId,
  generation: ctx.generation,
  strategy: ctx.strategy,
});

/** Tag the session with variant metadata across PostHog, GTM, and Clarity. */
export function identifyVariant(ctx: VariantContext) {
  const payload = basePayload(ctx);

  posthog.register(payload);
  posthog.capture("$pageview", payload);

  pushDataLayer("variant_page_view", payload);

  window.clarity?.("set", "variant_id", ctx.variantId);
  window.clarity?.("set", "generation", String(ctx.generation));
  window.clarity?.("set", "strategy", ctx.strategy);

  // Count this session toward the live calibration loop (once per tab).
  if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem("ll_heartbeat")) {
    sessionStorage.setItem("ll_heartbeat", "1");
    fetch("/api/loop/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  pushLiveAnalytics(ctx, "session_start");
}

export function trackCtaClick(ctx: VariantContext, sectionId: string) {
  const payload = { ...basePayload(ctx), section_id: sectionId };

  posthog.capture("cta_click", payload);
  pushDataLayer("cta_click", payload);

  window.clarity?.("set", "cta_variant", ctx.variantId);
  window.clarity?.("set", "cta_section", sectionId);
  window.clarity?.("event", "cta_click");

  pushLiveAnalytics(ctx, "cta_click", {
    sectionId,
    converted: true,
  });
}

export function trackScrollDepth(ctx: VariantContext, depthPct: number) {
  const payload = { ...basePayload(ctx), scroll_depth_pct: depthPct };

  posthog.capture("scroll_depth", payload);
  pushDataLayer("scroll_depth", payload);

  pushLiveAnalytics(ctx, "scroll_depth", {
    scrollDepth: depthPct / 100,
    scrollDepthPct: depthPct,
  });
}

export function trackBounce(ctx: VariantContext, scrollDepth: number, dwellMs: number) {
  const payload = {
    ...basePayload(ctx),
    scroll_depth: scrollDepth,
    dwell_ms: dwellMs,
  };

  posthog.capture("page_exit", payload);
  pushDataLayer("page_exit", payload);

  pushLiveAnalytics(ctx, "page_exit", {
    scrollDepth,
    dwellMs,
    bounced: scrollDepth < 0.15,
  });
}
