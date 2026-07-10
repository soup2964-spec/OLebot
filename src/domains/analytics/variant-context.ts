"use client";

import { useEffect, useState } from "react";
import type { PageVariant } from "@/platform/schema/page";
import type { VariantContext } from "@/domains/analytics/track";
import { GTM_CHALLENGE } from "@/domains/analytics/posthog-events";

const DEFAULT_EXPERIMENT = 1;

/**
 * Builds PostHog/GTM context for a variant page, including the active
 * GTM Challenge experiment number from the lab API.
 */
export function buildVariantContext(
  variant: Pick<PageVariant, "id" | "generation" | "strategy">,
  experimentNumber = DEFAULT_EXPERIMENT
): VariantContext {
  return {
    variantId: variant.id,
    generation: variant.generation,
    strategy: variant.strategy,
    experimentNumber,
    challenge: GTM_CHALLENGE.slug,
  };
}

export function useVariantTrackingContext(
  variant: Pick<PageVariant, "id" | "generation" | "strategy">
): VariantContext {
  const [experimentNumber, setExperimentNumber] = useState(DEFAULT_EXPERIMENT);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.experimentNumber) return;
        setExperimentNumber(Number(data.experimentNumber) || DEFAULT_EXPERIMENT);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return buildVariantContext(variant, experimentNumber);
}
