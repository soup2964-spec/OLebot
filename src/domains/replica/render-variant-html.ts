import { GENERATION_0 } from "@/content/variants";
import type { PageVariant } from "@/platform/schema/page";
import { loadSourceBaselineHtml } from "@/domains/deploy/write-html";
import { normalizeVariantForReplica } from "@/domains/deploy/normalize-variant";
import { replicaHtmlWithGuard } from "@/domains/replica/paths";

/** Build replica HTML for a variant (server-only — reads baseline from disk). */
export function renderVariantHtml(variant: PageVariant): string {
  const baselineHtml = loadSourceBaselineHtml();
  const baselineVariant = GENERATION_0[0];
  if (variant.id === baselineVariant.id) return baselineHtml;
  const normalized = normalizeVariantForReplica(variant);
  return replicaHtmlWithGuard(baselineHtml, normalized);
}
