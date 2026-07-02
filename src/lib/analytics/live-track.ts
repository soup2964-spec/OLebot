import type { VariantContext } from "./track";
import { POSTHOG_EVENTS } from "./posthog-events";

const SESSION_KEY = "ll_session";

export function getLiveSessionToken(): string {
  if (typeof sessionStorage === "undefined") return crypto.randomUUID();
  let token = sessionStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

type LiveEvent =
  | "session_start"
  | typeof POSTHOG_EVENTS.SECTION_VIEWED
  | typeof POSTHOG_EVENTS.CTA_VIEWED
  | typeof POSTHOG_EVENTS.SCROLL_DEPTH
  | typeof POSTHOG_EVENTS.BOOK_DEMO_CLICK
  | typeof POSTHOG_EVENTS.PAGE_LEAVE;

export function pushLiveAnalytics(
  ctx: VariantContext,
  event: LiveEvent,
  extra: {
    sectionId?: string;
    ctaLabel?: string;
    scrollDepth?: number;
    scrollDepthPct?: number;
    dwellMs?: number;
    converted?: boolean;
    bounced?: boolean;
    sectionsViewedCount?: number;
    unresolvedObjections?: string[];
    experimentNumber?: number;
    targetToken?: string;
  } = {}
) {
  fetch("/api/analytics/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken: getLiveSessionToken(),
      variantId: ctx.variantId,
      generation: ctx.generation,
      strategy: ctx.strategy,
      experimentNumber: extra.experimentNumber ?? ctx.experimentNumber,
      challenge: ctx.challenge,
      event,
      ...extra,
    }),
    keepalive: true,
  }).catch(() => {});
}
