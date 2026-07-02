import { GENERATION_0 } from "@/config/variants";
import type { PageVariant } from "@/lib/schema/page";
import {
  buildVariantHtmlReplacements,
  type HtmlReplacement,
} from "./apply-variant";

/** Apply one text swap inside a live DOM section (post-Framer-hydration). */
export function replaceTextInSectionElement(
  section: Element,
  anchor: string,
  to: string
): boolean {
  if (!anchor) return false;
  const needle = anchor.slice(0, Math.min(anchor.length, 28));
  if (!section.textContent?.includes(needle)) return false;

  // Prefer leaf text elements (single text node — matches our HTML swap model).
  const leaves = section.querySelectorAll("h1,h2,h3,h4,p,span,a,button");
  for (const el of leaves) {
    if (el.children.length > 0) continue;
    const text = el.textContent ?? "";
    if (text.includes(needle)) {
      el.textContent = to;
      return true;
    }
  }

  // Framer RichTextContainer often splits copy across nested spans.
  for (const el of section.querySelectorAll('[data-framer-component-type="RichTextContainer"]')) {
    if ((el.textContent ?? "").includes(needle)) {
      el.textContent = to;
      return true;
    }
  }

  return false;
}

export function applyReplacementsToDocument(
  doc: Document,
  replacements: HtmlReplacement[]
): number {
  const bridge = (doc.defaultView as Window & {
    __llApplyVariantPatches?: (r: HtmlReplacement[]) => number;
  })?.__llApplyVariantPatches;

  if (bridge) return bridge(replacements);

  let applied = 0;
  for (const r of replacements) {
    const section = doc.querySelector(`[data-section-id="${r.sectionId}"]`);
    if (!section) continue;
    if (replaceTextInSectionElement(section, r.anchor, r.to)) applied++;
  }
  return applied;
}

export function variantDomReplacements(variant: PageVariant): HtmlReplacement[] {
  const baseline = GENERATION_0[0];
  if (variant.id === baseline.id) return [];
  return buildVariantHtmlReplacements(baseline, variant);
}

/** True when any baseline anchor text reappeared after Framer hydration. */
export function needsVariantPatch(doc: Document, variant: PageVariant): boolean {
  if (variant.id === "v0-baseline") return false;
  return variantDomReplacements(variant).some((r) => {
    const section = doc.querySelector(`[data-section-id="${r.sectionId}"]`);
    const needle = r.anchor.slice(0, Math.min(r.anchor.length, 28));
    return section?.textContent?.includes(needle) ?? false;
  });
}

/**
 * Framer hydrates after first paint and restores CMS copy from embedded state,
 * undoing static HTML edits. Re-apply swaps until variant text sticks.
 */
export function scheduleVariantDomPatch(
  doc: Document,
  variant: PageVariant,
  onPatched?: () => void
): () => void {
  const replacements = variantDomReplacements(variant);
  if (!replacements.length) return () => {};

  let stopped = false;
  const run = () => {
    if (stopped) return;
    applyReplacementsToDocument(doc, replacements);
    onPatched?.();
  };

  run();
  const timers = [50, 150, 400, 900, 2000, 4000].map((ms) => setTimeout(run, ms));

  const hero = doc.querySelector('[data-section-id="hero"]');
  const observeRoot = hero ?? doc.body;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (stopped || !needsVariantPatch(doc, variant)) return;
    clearTimeout(debounce);
    debounce = setTimeout(run, 30);
  });

  observer.observe(observeRoot, {
    subtree: true,
    characterData: true,
    childList: true,
  });

  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
    clearTimeout(debounce);
    observer.disconnect();
  };
}
