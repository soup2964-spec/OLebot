import type {
  CalibrationRecord,
  PersonaCalibrationAdjustments,
  RealMetricsSnapshot,
  SimulatedMetricsSnapshot,
} from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Below this many real visitors, aggregate conversion/bounce/scroll rates are
 * too noisy to trust — a single conversion can swing an observed rate by
 * double digits. Confidence floors at 0 (no adjustment) below this, rather
 * than the old soft floor of 0.2 that let a handful of visits nudge every
 * persona's parameters on every auto-sync.
 */
export const MIN_VISITORS_FOR_CALIBRATION = 100;

/** Minimum real visitors on a specific variant before trusting its own bias. */
export const MIN_VISITORS_PER_VARIANT = 30;

/**
 * Compare real PostHog/GTM-instrumented traffic against simulation aggregates
 * and derive persona parameter adjustments for the next prediction run.
 */
export function computeCalibration(
  real: RealMetricsSnapshot,
  simulated: SimulatedMetricsSnapshot,
  version: number
): CalibrationRecord {
  const realConv = real.aggregate.conversionRate;
  const simConv = Math.max(simulated.conversionRate, 0.001);

  const belowMinimumSample = real.aggregate.visitors < MIN_VISITORS_FOR_CALIBRATION;
  // Confidence ramps 0 → 1 from 0 to 200 visitors. No soft floor: below the
  // minimum sample, confidence is exactly 0 and every adjustment is a no-op.
  const confidence = belowMinimumSample ? 0 : clamp(real.aggregate.visitors / 200, 0, 1);

  const rawRatio = realConv / simConv;
  const ctaMultiplier = clamp(1 + (rawRatio - 1) * confidence, 0.75, 1.35);

  const scrollDelta = (real.aggregate.avgScrollDepth - simulated.avgScrollDepth) * confidence;
  const patienceSecondsDelta = Math.round(scrollDelta * 120); // ~2 min max shift

  const bounceDelta = real.aggregate.bounceRate - simulated.bounceRate;
  const skimPropensityDelta = clamp(bounceDelta * 0.4 * confidence, -0.15, 0.15);

  const variantConversionBias: Record<string, number> = {};
  for (const rv of real.byVariant) {
    if (rv.visitors < MIN_VISITORS_PER_VARIANT) continue;
    const simRate = simulated.conversionRate; // global sim prior — per-variant sim not tracked yet
    // Use each variant's own sample size for its confidence, not the
    // aggregate — a variant with 200 visitors shouldn't be capped by a
    // low-traffic sibling dragging down the global confidence.
    const variantConfidence = clamp(rv.visitors / 200, 0, 1);
    variantConversionBias[rv.variantId] = clamp(
      1 + (rv.conversionRate / Math.max(simRate, 0.001) - 1) * variantConfidence,
      0.6,
      1.5
    );
  }

  const adjustments: PersonaCalibrationAdjustments = {
    ctaPropensityMultiplier: ctaMultiplier,
    patienceSecondsDelta,
    skimPropensityDelta,
    variantConversionBias,
  };

  return {
    version,
    createdAt: new Date().toISOString(),
    changelog: belowMinimumSample
      ? `Skipped: only ${real.aggregate.visitors} real visitors (need ${MIN_VISITORS_FOR_CALIBRATION}+) — priors left unchanged rather than fit to noise.`
      : `Calibrated from ${real.source} (${real.aggregate.visitors} visitors, ${real.windowDays}d window, confidence ${(confidence * 100).toFixed(0)}%). CTA propensity ×${ctaMultiplier.toFixed(2)}, patience ${patienceSecondsDelta >= 0 ? "+" : ""}${patienceSecondsDelta}s, skim ${skimPropensityDelta >= 0 ? "+" : ""}${skimPropensityDelta.toFixed(2)}.`,
    confidence,
    belowMinimumSample,
    real,
    simulated,
    adjustments,
  };
}
