import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/lib/schema/page";
import { BREEDING_ANGLES } from "@/lib/evolve/optimizer";

const VERSION_SUFFIX = /\s(?:V\d+|·\sv\d+)$/i;

const GEN0_ID_TO_ANGLE_IDX: Record<string, number> = {
  "v1-roi": 0,
  "v2-compliance": 1,
  "v3-problem": 2,
  "v4-credibility": 3,
  "v5-learner": 4,
};

/** Base angle label without a trailing version suffix. */
export function variantAngleName(variant: PageVariant): string {
  const stripped = variant.name.replace(VERSION_SUFFIX, "");

  if (variant.id === "v0-baseline") {
    return GENERATION_0[0]?.name ?? "Baseline (exact schole.ai replica)";
  }

  const childIdx = childIndexFromVariantId(variant.id);
  if (childIdx !== null) {
    return BREEDING_ANGLES[childIdx % BREEDING_ANGLES.length]?.name ?? stripped;
  }

  const gen0Idx = GEN0_ID_TO_ANGLE_IDX[variant.id];
  if (gen0Idx !== undefined) {
    return BREEDING_ANGLES[gen0Idx]?.name ?? stripped;
  }

  const byStrategy = BREEDING_ANGLES.find((a) => a.strategy === variant.strategy);
  return byStrategy?.name ?? stripped;
}

/** Per-angle version: gen 0 → V1, gen 1 bred → V2, etc. */
export function variantAngleVersion(variant: PageVariant): number {
  return Math.max(1, variant.generation + 1);
}

/** Page title: "HR & L&D buyer (dashboard-led) V2" */
export function variantPageTitle(variant: PageVariant): string {
  return `${variantAngleName(variant)} V${variantAngleVersion(variant)}`;
}

export function childIndexFromVariantId(id: string): number | null {
  const match = /^g\d+-(?:mut|x|demo)(\d+)/.exec(id);
  return match ? Number(match[1]) : null;
}

/** Name persisted on newly bred variants (parent generation → offspring version). */
export function variantNameForBreeding(
  angle: { name: string },
  parentGeneration: number,
  _childIndex: number
): string {
  return `${angle.name} V${parentGeneration + 2}`;
}
