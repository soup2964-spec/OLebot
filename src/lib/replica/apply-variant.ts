import type { PageVariant, Section } from "@/lib/schema/page";
import {
  BASELINE_HTML_COPY,
  REPLICA_SECTION_IDS,
  type ReplicaSectionId,
} from "./baseline-copy";
import { normalizeVariantForReplica } from "@/lib/deploy/normalize-variant";

export interface HtmlReplacement {
  sectionId: ReplicaSectionId;
  /** Unique substring of the text to replace (first ~24 chars is enough). */
  anchor: string;
  to: string;
}

export function getSectionBounds(
  html: string,
  sectionId: ReplicaSectionId
): { start: number; end: number } | null {
  const marker = `data-section-id="${sectionId}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const others = REPLICA_SECTION_IDS.filter((id) => id !== sectionId)
    .map((id) => html.indexOf(`data-section-id="${id}"`, start + marker.length))
    .filter((i) => i > start);

  const end = others.length ? Math.min(...others) : html.length;
  return { start, end };
}

function isInsideScriptOrStyle(html: string, idx: number): boolean {
  const before = html.slice(0, idx);
  const lastOpen = Math.max(before.lastIndexOf("<script"), before.lastIndexOf("<style"));
  const lastClose = Math.max(before.lastIndexOf("</script>"), before.lastIndexOf("</style>"));
  return lastOpen > lastClose;
}

/** Replace every matching text node in the page (Framer duplicates copy per breakpoint). */
export function replaceAllTextAnchors(html: string, anchor: string, to: string): string {
  if (!anchor || anchor === to) return html;
  const needle = anchor.slice(0, Math.min(anchor.length, 28));
  let out = html;
  let pos = 0;
  let wrotePrimary = false;
  let applied = false;

  while (pos < out.length) {
    const idx = out.indexOf(needle, pos);
    if (idx < 0) break;
    if (isInsideScriptOrStyle(out, idx)) {
      pos = idx + needle.length;
      continue;
    }

    const textStart = out.lastIndexOf(">", idx) + 1;
    const textEnd = out.indexOf("<", idx);
    if (textStart <= 0 || textEnd < 0) break;

    let replacement = to;
    if (to && wrotePrimary) replacement = "";
    else if (to) wrotePrimary = true;

    out = out.slice(0, textStart) + replacement + out.slice(textEnd);
    applied = true;
    pos = textStart + Math.max(replacement.length, 1);
  }

  return applied ? out : html;
}

/** Replace every matching text node in a section (Framer duplicates copy per breakpoint). */
export function replaceTextNodeInSection(
  html: string,
  sectionId: ReplicaSectionId,
  anchor: string,
  to: string
): string {
  if (!anchor || anchor === to) return html;
  const bounds = getSectionBounds(html, sectionId);
  if (!bounds) return html;

  const needle = anchor.slice(0, Math.min(anchor.length, 28));
  let chunk = html.slice(bounds.start, bounds.end);
  let pos = 0;
  let applied = false;
  let wrotePrimary = false;

  while (pos < chunk.length) {
    const idx = chunk.indexOf(needle, pos);
    if (idx < 0) break;

    const textStart = chunk.lastIndexOf(">", idx) + 1;
    const textEnd = chunk.indexOf("<", idx);
    if (textStart <= 0 || textEnd < 0) break;

    let replacement = to;
    if (to && wrotePrimary) replacement = "";
    else if (to) wrotePrimary = true;

    chunk = chunk.slice(0, textStart) + replacement + chunk.slice(textEnd);
    applied = true;
    pos = textStart + Math.max(replacement.length, 1);
  }

  if (!applied) return html;
  return html.slice(0, bounds.start) + chunk + html.slice(bounds.end);
}

export function applyReplacements(html: string, replacements: HtmlReplacement[]): string {
  let out = html;
  for (const r of replacements) {
    out = replaceTextNodeInSection(out, r.sectionId, r.anchor, r.to);
    const needle = r.anchor.slice(0, Math.min(r.anchor.length, 28));
    if (needle && out.includes(needle)) {
      out = replaceAllTextAnchors(out, r.anchor, r.to);
    }
  }
  return out;
}

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
  to: string | undefined
) {
  if (!anchor || to === undefined || anchor === to) return;
  out.push({ sectionId, anchor, to });
}

export function buildReplacementsForSection(
  sectionId: ReplicaSectionId,
  baseline: Section,
  variant: Section
): HtmlReplacement[] {
  const out: HtmlReplacement[] = [];

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

  if (variant.body !== baseline.body) {
    const htmlBodies = BASELINE_HTML_COPY[sectionId]?.body;
    if (htmlBodies?.length) {
      const primary = htmlBodies[0];
      pushIfChanged(
        out,
        sectionId,
        primary.slice(0, Math.min(primary.length, 40)),
        variant.body
      );
    } else {
      pushIfChanged(out, sectionId, baseline.body.slice(0, 40), variant.body);
    }
  }

  const htmlBodies = BASELINE_HTML_COPY[sectionId]?.body;
  if (htmlBodies?.length) {
    for (let i = 1; i < htmlBodies.length; i++) {
      const extra = htmlBodies[i];
      if (!extra) continue;
      if (variant.body.includes(extra.slice(0, Math.min(extra.length, 20)))) continue;
      pushIfChanged(
        out,
        sectionId,
        extra.slice(0, Math.min(extra.length, 40)),
        ""
      );
    }
  }

  if (variant.ctaLabel && variant.ctaLabel !== baseline.ctaLabel) {
    pushIfChanged(out, sectionId, baseline.ctaLabel ?? "Book a demo", variant.ctaLabel);
  }

  return out;
}

export function extraReplacementsForVariant(_variant: PageVariant): HtmlReplacement[] {
  return [];
}

export function buildVariantHtmlReplacements(
  baselineVariant: PageVariant,
  variant: PageVariant
): HtmlReplacement[] {
  if (variant.id === baselineVariant.id) return [];

  const normalized = normalizeVariantForReplica(variant);
  const baselineById = new Map(baselineVariant.sections.map((s) => [s.id, s]));
  const replacements: HtmlReplacement[] = [...extraReplacementsForVariant(normalized)];

  for (const section of normalized.sections) {
    if (!REPLICA_SECTION_IDS.includes(section.id as ReplicaSectionId)) continue;
    const base = baselineById.get(section.id);
    if (!base) continue;
    replacements.push(
      ...buildReplacementsForSection(section.id as ReplicaSectionId, base, section)
    );
  }

  const seen = new Set<string>();
  return replacements.filter((r) => {
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
    buildVariantHtmlReplacements(baselineVariant, variant)
  );
}
