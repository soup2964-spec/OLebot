import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/lib/schema/page";
import {
  applyVariantToBaselineHtml,
  buildVariantHtmlReplacements,
} from "./apply-variant";
import { injectLabGuard, stripLabGuard } from "./prepare-lab-html";

const BASELINE_ID = "v0-baseline";

/** Static HTML path when prepare-variant-html has pre-built the replica. */
export function staticReplicaPath(variantId: string): string | null {
  if (variantId === BASELINE_ID) return "/baseline/index.html";
  if (GENERATION_0.some((v) => v.id === variantId)) {
    return `/baseline/variants/${variantId}.html`;
  }
  return null;
}

/** Bred variants: baseline HTML + text swaps + hydration guard. */
export function replicaHtmlWithGuard(
  baselineHtml: string,
  variant: PageVariant
): string {
  const baselineVariant = GENERATION_0[0];
  if (variant.id === baselineVariant.id) return baselineHtml;
  const patches = buildVariantHtmlReplacements(baselineVariant, variant);
  const html = applyVariantToBaselineHtml(baselineHtml, baselineVariant, variant);
  return injectLabGuard(stripLabGuard(html), patches);
}

export function shouldUseReplica(_variant: PageVariant): boolean {
  return true;
}
