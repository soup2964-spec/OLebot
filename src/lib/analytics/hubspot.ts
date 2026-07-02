/**
 * HubSpot behavioral tracking — mirrors schole.ai CRM pipeline signals.
 * Prefer GTM generate_lead routing when HubSpot script isn't loaded (lab iframes).
 * When NEXT_PUBLIC_HUBSPOT_PORTAL_ID is set, pushes directly to _hsq.
 */

declare global {
  interface Window {
    _hsq?: unknown[][];
  }
}

export function trackHubSpotDemoIntent(props: {
  variantId: string;
  sectionId?: string;
  ctaLabel?: string;
  experimentNumber?: number;
}) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID) return;

  window._hsq = window._hsq ?? [];
  window._hsq.push([
    "trackCustomBehavioralEvent",
    {
      name: "book_demo_click",
      properties: {
        variant_id: props.variantId,
        section_id: props.sectionId,
        cta_label: props.ctaLabel,
        experiment_number: props.experimentNumber,
        source: "landing_lab",
      },
    },
  ]);
}
