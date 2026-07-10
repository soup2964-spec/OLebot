import type { PageVariant, Section } from "@/platform/schema/page";
import {
  BASELINE_HTML_COPY,
  patchableSectionIds,
  REPLICA_SECTION_IDS,
  STRAY_BASELINE_FRAGMENTS,
  type ReplicaSectionId,
} from "./baseline-copy";
import { normalizeVariantForReplica } from "@/domains/deploy/normalize-variant";
import {
  applyReplacements,
  isFrozenAnchor,
  type HtmlReplacement,
} from "./apply-text";

function splitHeadline(headline: string): [string, string] {
  const dotSpace = headline.indexOf(". ");
  if (dotSpace > 0 && dotSpace < headline.length - 2) {
    return [headline.slice(0, dotSpace + 1), headline.slice(dotSpace + 2)];
  }
  return [headline, ""];
}

function pushHeadlineChange(
  out: HtmlReplacement[],
  sectionId: ReplicaSectionId,
  baselineHeadline: string,
  variantHeadline: string
) {
  if (baselineHeadline === variantHeadline) return;

  const [b1, b2] = splitHeadline(baselineHeadline);
  const [v1, v2] = splitHeadline(variantHeadline);

  pushIfChanged(out, sectionId, b1, v1);
  if (b2 && v2) pushIfChanged(out, sectionId, b2, v2);
  else if (b2 && !v2) pushIfChanged(out, sectionId, b2, "");
}

function pushIfChanged(
  out: HtmlReplacement[],
  sectionId: ReplicaSectionId,
  anchor: string | undefined,
  to: string | undefined,
  fullText = false
) {
  if (!anchor || to === undefined || anchor === to) return;
  out.push({ sectionId, anchor, to, ...(fullText ? { fullText } : {}) });
}

function pushBodyChanges(
  out: HtmlReplacement[],
  sectionId: ReplicaSectionId,
  baseline: Section,
  variant: Section,
  html: string
) {
  if (variant.body === baseline.body) return;

  const htmlBodies = BASELINE_HTML_COPY[sectionId]?.body ?? [];
  const variantChunks = splitBodyForSlots(variant.body, htmlBodies.length || 1);

  if (htmlBodies.length > 0) {
    for (let i = 0; i < htmlBodies.length; i++) {
      // Anchor on a prefix, but replace the WHOLE text node: the snapshot HTML
      // contains mojibake (U+FFFD) where curly quotes were, so full-string
      // anchors never match and a prefix-only replace leaks the baseline tail.
      const anchor = htmlBodies[i]!.slice(0, Math.min(htmlBodies[i]!.length, 40));
      pushIfChanged(out, sectionId, anchor, variantChunks[i] ?? "", true);
    }
    return;
  }

  const fallback = baseline.body.slice(0, Math.min(baseline.body.length, 40));
  if (html.includes(fallback)) {
    pushIfChanged(out, sectionId, fallback, variant.body, true);
  }
}

function splitBodyForSlots(body: string, slotCount: number): string[] {
  if (slotCount <= 1) return [body];
  // Framer often splits baseline copy across multiple blocks; variant body is one LLM paragraph.
  return [body, ...Array(Math.max(0, slotCount - 1)).fill("")];
}

function itemAnchor(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/^["']+|["']+$/g, "").trim();
  return cleaned.slice(0, Math.min(cleaned.length, 40));
}

function pushItemChanges(
  out: HtmlReplacement[],
  sectionId: ReplicaSectionId,
  baseline: Section,
  variant: Section
) {
  const baseItems = baseline.items ?? [];
  const varItems = variant.items ?? [];
  const htmlAnchors = BASELINE_HTML_COPY[sectionId]?.items ?? [];
  if (!baseItems.length && !varItems.length) return;

  // HTML anchors are (title, detail) pairs when even-index entries match
  // baseline item titles (e.g. features); otherwise they are detail-only
  // fragments (e.g. proof quotes).
  const paired =
    htmlAnchors.length >= 2 &&
    baseItems.some((b) =>
      htmlAnchors.some((a, i) => i % 2 === 0 && a === b.title)
    );

  if (paired) {
    // Anchor on the REAL HTML strings — the config item text can drift from
    // the snapshot (punctuation, extra sentences), so config anchors miss.
    const slotCount = Math.floor(htmlAnchors.length / 2);
    for (let slot = 0; slot < slotCount; slot++) {
      const titleText = htmlAnchors[slot * 2]!;
      const detailText = htmlAnchors[slot * 2 + 1]!;
      const baseIdx = baseItems.findIndex((b) => b.title === titleText);
      const bi = baseIdx >= 0 ? baseItems[baseIdx] : baseItems[slot];
      const vi = baseIdx >= 0 ? varItems[baseIdx] : varItems[slot];
      const titleAnchor = itemAnchor(titleText);
      const detailAnchor = itemAnchor(detailText);

      if (!vi) {
        pushIfChanged(out, sectionId, titleAnchor, "", true);
        pushIfChanged(out, sectionId, detailAnchor, "", true);
        continue;
      }
      if (vi.title !== (bi?.title ?? titleText)) {
        pushIfChanged(out, sectionId, titleAnchor, vi.title, true);
      }
      if (vi.detail !== (bi?.detail ?? detailText)) {
        pushIfChanged(out, sectionId, detailAnchor, vi.detail, true);
      }
    }
    return;
  }

  const count = Math.max(baseItems.length, varItems.length, htmlAnchors.length);
  for (let i = 0; i < count; i++) {
    const bi = baseItems[i];
    const vi = varItems[i];
    const titleAnchor = itemAnchor(bi?.title);
    const detailAnchor =
      itemAnchor(bi?.detail) ??
      (htmlAnchors.length ? itemAnchor(htmlAnchors[i]) : undefined);

    if (!vi) {
      pushIfChanged(out, sectionId, titleAnchor, "", true);
      pushIfChanged(out, sectionId, detailAnchor, "", true);
      continue;
    }

    if (bi?.title !== vi.title) pushIfChanged(out, sectionId, titleAnchor, vi.title, true);
    if (bi?.detail !== vi.detail) pushIfChanged(out, sectionId, detailAnchor, vi.detail, true);
  }
}

export function buildReplacementsForSection(
  sectionId: ReplicaSectionId,
  baseline: Section,
  variant: Section,
  html: string,
  opts?: { patchCta?: boolean }
): HtmlReplacement[] {
  const out: HtmlReplacement[] = [];
  const patchCta = opts?.patchCta ?? true;

  if (variant.headline !== baseline.headline) {
    const htmlHeadlines = BASELINE_HTML_COPY[sectionId]?.headline;
    if (htmlHeadlines && htmlHeadlines.length >= 2) {
      const [v1, v2] = splitHeadline(variant.headline);
      if (v2) {
        pushIfChanged(out, sectionId, htmlHeadlines[0], v1);
        pushIfChanged(out, sectionId, htmlHeadlines[1], v2);
      } else {
        pushIfChanged(out, sectionId, htmlHeadlines[0], variant.headline);
        pushIfChanged(out, sectionId, htmlHeadlines[1], "");
      }
    } else if (htmlHeadlines?.[0]) {
      pushIfChanged(out, sectionId, htmlHeadlines[0], variant.headline);
    } else {
      pushHeadlineChange(out, sectionId, baseline.headline, variant.headline);
    }
  }

  pushBodyChanges(out, sectionId, baseline, variant, html);
  pushItemChanges(out, sectionId, baseline, variant);

  if (patchCta && variant.ctaLabel && variant.ctaLabel !== baseline.ctaLabel) {
    const ctaAnchor =
      BASELINE_HTML_COPY[sectionId]?.cta ?? baseline.ctaLabel ?? "Book a demo";
    pushIfChanged(out, sectionId, ctaAnchor, variant.ctaLabel);
  }

  return out;
}

export function extraReplacementsForVariant(variant: PageVariant): HtmlReplacement[] {
  const out: HtmlReplacement[] = [];
  if (variant.generation === 0) return out;

  for (const stray of STRAY_BASELINE_FRAGMENTS) {
    if (!patchableSectionIds(variant).includes(stray.sectionId)) continue;
    out.push({ sectionId: stray.sectionId, anchor: stray.anchor, to: "", fullText: true });
  }
  return out;
}

export function buildVariantHtmlReplacements(
  baselineVariant: PageVariant,
  variant: PageVariant,
  html = ""
): HtmlReplacement[] {
  if (variant.id === baselineVariant.id) return [];

  const normalized = normalizeVariantForReplica(variant);
  const baselineById = new Map(baselineVariant.sections.map((s) => [s.id, s]));
  const replacements: HtmlReplacement[] = [...extraReplacementsForVariant(normalized)];
  const allowed = new Set(patchableSectionIds(normalized));
  const patchCta = normalized.generation === 0;

  for (const section of normalized.sections) {
    const replicaId = section.id as ReplicaSectionId;
    if (!REPLICA_SECTION_IDS.includes(replicaId) || !allowed.has(replicaId)) continue;
    const base = baselineById.get(section.id);
    if (!base) continue;
    replacements.push(
      ...buildReplacementsForSection(
        section.id as ReplicaSectionId,
        base,
        section,
        html,
        { patchCta }
      )
    );
  }

  const seen = new Set<string>();
  return replacements.filter((r) => {
    if (isFrozenAnchor(r.anchor)) return false;
    const key = `${r.sectionId}:${r.anchor}:${r.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return r.anchor !== r.to;
  });
}

export function applyVariantToBaselineHtml(
  baselineHtml: string,
  baselineVariant: PageVariant,
  variant: PageVariant
): string {
  return applyReplacements(
    baselineHtml,
    buildVariantHtmlReplacements(baselineVariant, variant, baselineHtml)
  );
}

