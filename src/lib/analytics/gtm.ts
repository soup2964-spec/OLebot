import { GTM_EVENTS } from "./posthog-events";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Push a custom event to Google Tag Manager's dataLayer (forwards to GA4, Ads, HubSpot). */
export function pushDataLayer(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...payload });
}

export function pushPageContext(payload: Record<string, unknown>) {
  pushDataLayer(GTM_EVENTS.PAGE_VIEW, payload);
}

/** GA4 recommended event — demo booking / lead intent (routes to HubSpot via GTM). */
export function pushGenerateLead(payload: Record<string, unknown>) {
  pushDataLayer(GTM_EVENTS.GENERATE_LEAD, {
    lead_type: "demo_booking",
    currency: "USD",
    value: 0,
    ...payload,
  });
}

/** GA4 recommended event — scroll milestone. */
export function pushScrollMilestone(percentScrolled: number, payload: Record<string, unknown> = {}) {
  pushDataLayer(GTM_EVENTS.SCROLL, {
    percent_scrolled: percentScrolled,
    ...payload,
  });
}

/** Session end with engagement context for GA4 / HubSpot attribution. */
export function pushSessionEnd(payload: Record<string, unknown>) {
  pushDataLayer(GTM_EVENTS.SESSION_END, payload);
}
