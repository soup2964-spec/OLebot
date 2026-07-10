/** Central façade for runs, variants, and visit indexes. */
export {
  loadRun,
  loadRunSync,
  saveRun,
  invalidateRunCache,
} from "@/platform/run-store";
export {
  getGen0Variants,
  getProductionVariant,
  allVariants,
  allVariantsSync,
  getVariant,
  findVariant,
  getVisit,
} from "@/platform/variant-catalog";
export {
  visitIndex,
  type VisitSummary,
  type VisitIndex,
} from "@/platform/visit-index";
