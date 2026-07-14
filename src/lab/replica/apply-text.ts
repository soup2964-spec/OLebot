import {
  BASELINE_HTML_COPY,
  FROZEN_BASELINE_COPY,
  REPLICA_SECTION_IDS,
  type ReplicaSectionId,
} from "./baseline-copy";
import { SECTION_MARKERS } from "./section-markers";

export interface HtmlReplacement {
  sectionId: ReplicaSectionId;
  /** Unique substring of the text to replace (first ~24 chars is enough). */
  anchor: string;
  to: string;
  /**
   * Replace from the anchor to the END of the containing text node, not just
   * the anchor substring. Required for body/item swaps whose anchors are
   * 40-char prefixes (the snapshot HTML has mojibake characters that prevent
   * full-string matches); without it the rest of the baseline paragraph leaks
   * in after the new copy.
   */
  fullText?: boolean;
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isFrozenAnchor(anchor: string): boolean {
  return FROZEN_BASELINE_COPY.some((frozen) => anchor.includes(frozen) || frozen.includes(anchor));
}

/**
 * Section boundaries derived from baseline copy anchor positions.
 *
 * lab-source.html has no data-section-id markers, and the page copy lives in
 * static framer-text elements (h1/h2/p/span), NOT in Framer's hydration JSON
 * (which is only route/breakpoint metadata) or RichTextContainer nodes (only
 * two exist). Each section is located by the first appearing baseline
 * headline/body/item string; ranges run to the next section's start in DOM order.
 */
export function computeSectionBoundaries(
  html: string
): Map<ReplicaSectionId, { start: number; end: number }> {
  const positions: { id: ReplicaSectionId; start: number }[] = [];
  // SECTION_MARKERS anchors are contiguous substrings that reliably locate a
  // section even when the full baseline headline is split across styled spans.
  const markerAnchors = new Map<string, string>(
    SECTION_MARKERS.map((m) => [m.id as string, m.anchor])
  );
  for (const id of REPLICA_SECTION_IDS) {
    const c = BASELINE_HTML_COPY[id];
    const probes = [
      markerAnchors.get(id) ?? "",
      ...(c.headline ?? []),
      ...(c.body ?? []),
      ...(c.items ?? []),
      ...(c.cta ? [c.cta] : []),
    ];
    let earliest = -1;
    for (const p of probes) {
      if (!p) continue;
      const idx = html.indexOf(p);
      if (idx >= 0 && (earliest < 0 || idx < earliest)) earliest = idx;
    }
    if (earliest >= 0) positions.push({ id, start: earliest });
  }
  positions.sort((a, b) => a.start - b.start);
  const bounds = new Map<ReplicaSectionId, { start: number; end: number }>();
  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : html.length;
    bounds.set(positions[i].id, { start: positions[i].start, end });
  }
  return bounds;
}

export function getSectionBounds(
  html: string,
  sectionId: ReplicaSectionId
): { start: number; end: number } | null {
  return computeSectionBoundaries(html).get(sectionId) ?? null;
}

/** Both the literal and HTML-escaped forms of an anchor (the DOM may use either). */
function anchorForms(anchor: string): string[] {
  const escaped = escapeHtmlText(anchor);
  return escaped !== anchor ? [anchor, escaped] : [anchor];
}

function replaceAllInRange(
  html: string,
  start: number,
  end: number,
  anchor: string,
  replacement: string,
  fullText = false
): string {
  if (!anchor) return html;
  const occ: { idx: number; len: number }[] = [];
  for (const f of anchorForms(anchor)) {
    let k = start;
    while (k < end) {
      const idx = html.indexOf(f, k);
      if (idx < 0 || idx + f.length > end) break;
      let len = f.length;
      if (fullText) {
        // Swallow the rest of the text node (up to the next tag) so the tail
        // of the baseline paragraph can't leak in after the new copy.
        const tagIdx = html.indexOf("<", idx + f.length);
        if (tagIdx > 0 && tagIdx <= end) len = tagIdx - idx;
      }
      occ.push({ idx, len });
      k = idx + len;
    }
  }
  occ.sort((a, b) => a.idx - b.idx);
  // Drop overlapping matches (literal and escaped forms shouldn't overlap, but be safe).
  const dedup: typeof occ = [];
  for (const o of occ) {
    const prev = dedup[dedup.length - 1];
    if (prev && o.idx < prev.idx + prev.len) continue;
    dedup.push(o);
  }
  let out = html;
  for (let i = dedup.length - 1; i >= 0; i--) {
    out = out.slice(0, dedup[i].idx) + replacement + out.slice(dedup[i].idx + dedup[i].len);
  }
  return out;
}

/**
 * Some Framer headlines are split across a styled `<span>` prefix + a trailing
 * text node, e.g. `<span ...>Learning that </span>adapts to each person</p>`.
 * The full anchor isn't a contiguous string, so literal replace misses it.
 * Detect the `</span>` split point: replace the trailing suffix with the variant
 * text and clear the styled prefix (leaving an empty span, layout intact).
 */
function findSpanSplit(
  html: string,
  start: number,
  end: number,
  anchor: string
): { prefix: string; suffix: string } | null {
  for (let cut = anchor.length - 1; cut >= 1; cut--) {
    const prefix = anchor.slice(0, cut);
    const suffix = anchor.slice(cut);
    if (suffix.length < 4) continue;
    const probe = prefix + "</span>";
    // The styled prefix may sit just before the section start when bounds are
    // derived from a suffix-only SECTION_MARKER anchor.
    const searchFrom = Math.max(0, start - prefix.length - 48);
    let idx = html.indexOf(probe, searchFrom);
    while (idx >= 0 && idx < end) {
      const suffixIdx = html.indexOf(suffix, idx + probe.length);
      if (suffixIdx >= 0 && suffixIdx + suffix.length <= end) {
        return { prefix, suffix };
      }
      idx = html.indexOf(probe, idx + 1);
    }
  }
  return null;
}

function patchAnchorIndex(
  html: string,
  start: number,
  end: number,
  anchor: string
): number {
  for (const f of anchorForms(anchor)) {
    const i = html.indexOf(f, start);
    if (i >= 0 && i + f.length <= end) return i;
  }
  const split = findSpanSplit(html, start, end, anchor);
  if (split) {
    const i = html.indexOf(split.suffix, start);
    if (i >= 0 && i < end) return i;
  }
  return -1;
}

function applyPatchInSection(
  html: string,
  start: number,
  end: number,
  anchor: string,
  to: string,
  fullText = false
): string {
  const escaped = escapeHtmlText(to);
  if (anchorPresentInRange(html, start, end, anchor)) {
    return replaceAllInRange(html, start, end, anchor, escaped, fullText);
  }
  const split = findSpanSplit(html, start, end, anchor);
  if (split) {
    let out = replaceAllInRange(html, start, end, split.suffix, escaped, fullText);
    out = replaceAllInRange(out, start, end, split.prefix, "");
    return out;
  }
  return html;
}

function anchorPresentInRange(html: string, start: number, end: number, anchor: string): boolean {
  for (const f of anchorForms(anchor)) {
    const idx = html.indexOf(f, start);
    if (idx >= 0 && idx + f.length <= end) return true;
  }
  return false;
}

/**
 * Apply copy replacements to the static framer-text DOM, scoped per section.
 *
 * Replaces the baseline anchor text (inside h1/h2/p/span.framer-text) with the
 * variant's HTML-escaped text, preserving wrapper elements, classes, and styles.
 * Responsive duplicates within the same section all receive the new text. Patches
 * never touch other sections (e.g. hero "Book a demo" won't bleed into the CTA).
 */
export function applyReplacements(html: string, replacements: HtmlReplacement[]): string {
  const bounds = computeSectionBoundaries(html);
  const bySection = new Map<ReplicaSectionId, HtmlReplacement[]>();
  for (const r of replacements) {
    if (isFrozenAnchor(r.anchor)) continue;
    if (!bySection.has(r.sectionId)) bySection.set(r.sectionId, []);
    bySection.get(r.sectionId)!.push(r);
  }
  // Process sections right-to-left so earlier section offsets stay valid.
  const sections = [...bounds.entries()].sort((a, b) => b[1].start - a[1].start);
  let out = html;
  for (const [id, b] of sections) {
    const patches = bySection.get(id);
    if (!patches?.length) continue;
    // Within a section, apply rightmost-first so earlier occurrence offsets stay valid.
    const ordered = [...patches].sort(
      (a, b2) => patchAnchorIndex(out, b.start, b.end, b2.anchor) - patchAnchorIndex(out, b.start, b.end, a.anchor)
    );
    for (const r of ordered) {
      out = applyPatchInSection(out, b.start, b.end, r.anchor, r.to, r.fullText);
    }
  }
  return out;
}

/** @deprecated kept for scripts that import by name — use applyReplacements. */
export function replaceRichTextGlobally(
  html: string,
  anchor: string,
  to: string
): string {
  if (!anchor || isFrozenAnchor(anchor)) return html;
  return replaceAllInRange(html, 0, html.length, anchor, escapeHtmlText(to));
}

/** @deprecated kept for scripts that import by name. */
export function replaceTextNodeInSection(
  html: string,
  _sectionId: ReplicaSectionId,
  anchor: string,
  to: string
): string {
  return replaceRichTextGlobally(html, anchor, to);
}

