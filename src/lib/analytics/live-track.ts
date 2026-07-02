import type { VariantContext } from "./track";

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
  | "section_view"
  | "scroll_depth"
  | "cta_click"
  | "page_exit";

export function pushLiveAnalytics(
  ctx: VariantContext,
  event: LiveEvent,
  extra: {
    sectionId?: string;
    scrollDepth?: number;
    scrollDepthPct?: number;
    dwellMs?: number;
    converted?: boolean;
    bounced?: boolean;
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
      event,
      ...extra,
    }),
    keepalive: true,
  }).catch(() => {});
}
