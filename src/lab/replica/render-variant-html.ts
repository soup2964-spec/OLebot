import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/shared/schema/page";
import { loadSourceBaselineHtml } from "@/lab/deploy/write-html";
import { normalizeVariantForReplica } from "@/lab/deploy/normalize-variant";
import { replicaHtmlWithGuard } from "@/lab/replica/paths";

/** Build replica HTML for a variant (server-only — reads baseline from disk). */
export function renderVariantHtml(variant: PageVariant): string {
  const baselineHtml = loadSourceBaselineHtml();
  const baselineVariant = GENERATION_0[0];
  if (variant.id === baselineVariant.id) return baselineHtml;
  const normalized = normalizeVariantForReplica(variant);
  return replicaHtmlWithGuard(baselineHtml, normalized);
}
