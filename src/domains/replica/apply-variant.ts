/** HTML replica apply pipeline — text patches + section replacement builders. */
export type { HtmlReplacement } from "./apply-text";
export {
  computeSectionBoundaries,
  getSectionBounds,
  applyReplacements,
  replaceRichTextGlobally,
  replaceTextNodeInSection,
} from "./apply-text";
export {
  buildReplacementsForSection,
  extraReplacementsForVariant,
  buildVariantHtmlReplacements,
  applyVariantToBaselineHtml,
} from "./apply-sections";
