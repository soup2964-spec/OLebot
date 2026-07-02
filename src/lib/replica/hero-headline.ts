import { BASELINE_HTML_COPY } from "./baseline-copy";

/** Framer hero uses two fixed text nodes — bred copy must fill both at ~baseline length. */
export const BASELINE_HERO_HEADLINE_LINES = BASELINE_HTML_COPY.hero.headline ?? [
  "Faster competency. Higher engagement.",
  "Agentic Learning with Scholé.",
];

export const HERO_LINE1_TARGET = BASELINE_HERO_HEADLINE_LINES[0].length;
export const HERO_LINE2_TARGET = BASELINE_HERO_HEADLINE_LINES[1].length;

/** Single subheading block under the hero headline in Framer. */
export const BASELINE_HERO_BODY =
  BASELINE_HTML_COPY.hero.body?.[0] ??
  "Scholé uses the best of AI to construct exactly the right lesson for each learner. It's targeted, practical, and built on 10+ years of AI for education research from EPFL and UC Berkeley.";

export const HERO_BODY_TARGET = BASELINE_HERO_BODY.length;

const LINE1_MAX = HERO_LINE1_TARGET + 2;
const LINE2_MAX = HERO_LINE2_TARGET + 2;
const HERO_BODY_MIN = HERO_BODY_TARGET - 28;
const HERO_BODY_MAX = HERO_BODY_TARGET + 2;

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripTrailingPunct(text: string): string {
  return text.replace(/[.!?]+$/, "").trim();
}

function lineLength(words: string[]): number {
  return words.length ? ensurePeriod(words.join(" ")).length : 0;
}

function enforceCaps(w1: string[], w2: string[]): [string[], string[]] {
  let a = [...w1];
  let b = [...w2];

  while (lineLength(a) > LINE1_MAX && a.length > 1) {
    b.unshift(a.pop()!);
  }
  while (lineLength(b) > LINE2_MAX && b.length > 1) {
    b.pop();
  }
  while (lineLength(a) < HERO_LINE1_TARGET - 12 && b.length > 1 && lineLength(b) > 10) {
    a.push(b.shift()!);
  }
  if (!b.length && a.length > 1) {
    b = [a.pop()!];
  }

  return [a, b];
}

function rebalanceLines(w1: string[], w2: string[]): [string[], string[]] {
  return enforceCaps(w1, w2);
}

function splitWordsByBudget(words: string[], budget1: number, budget2: number): [string[], string[]] {
  if (!words.length) return [[], []];
  if (words.length === 1) return [[words[0]], []];

  let bestI = 1;
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i++) {
    const w1 = words.slice(0, i);
    const w2 = words.slice(i);
    const l1 = lineLength(w1);
    const l2 = lineLength(w2);
    const score =
      Math.abs(l1 - budget1) +
      Math.abs(l2 - budget2) +
      Math.max(0, l1 - LINE1_MAX) * 4 +
      Math.max(0, l2 - LINE2_MAX) * 4;
    if (score < bestScore) {
      bestScore = score;
      bestI = i;
    }
  }

  return rebalanceLines(words.slice(0, bestI), words.slice(bestI));
}

/**
 * Split hero copy into two lines sized for the baseline Framer slots.
 */
export function splitHeroHeadlineForBaseline(headline: string): { line1: string; line2: string } {
  const cleaned = headline.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      line1: BASELINE_HERO_HEADLINE_LINES[0],
      line2: BASELINE_HERO_HEADLINE_LINES[1],
    };
  }

  const allWords = stripTrailingPunct(cleaned).split(" ").filter(Boolean);
  const sentences = cleaned.split(/(?<=\.)\s+/).filter(Boolean);

  let w1: string[];
  let w2: string[];

  if (sentences.length >= 2) {
    w1 = stripTrailingPunct(sentences[0]).split(" ").filter(Boolean);
    w2 = stripTrailingPunct(sentences.slice(1).join(" "))
      .split(" ")
      .filter(Boolean);
    const l1 = lineLength(w1);
    const l2 = lineLength(w2);
    const fits =
      l1 <= LINE1_MAX &&
      l2 >= 8 &&
      l2 <= LINE2_MAX &&
      l1 >= HERO_LINE1_TARGET - 14;

    if (!fits) {
      [w1, w2] = splitWordsByBudget(allWords, HERO_LINE1_TARGET, HERO_LINE2_TARGET);
    } else {
      [w1, w2] = rebalanceLines(w1, w2);
    }
  } else {
    [w1, w2] = splitWordsByBudget(allWords, HERO_LINE1_TARGET, HERO_LINE2_TARGET);
  }

  if (!w2.length && w1.length > 1) {
    [w1, w2] = rebalanceLines(w1.slice(0, -1), [w1[w1.length - 1]]);
  }

  let line1 = ensurePeriod(w1.join(" "));
  let line2 = ensurePeriod(w2.join(" "));

  if (!stripTrailingPunct(line2)) {
    line2 = BASELINE_HERO_HEADLINE_LINES[1];
  }

  return { line1, line2 };
}

/** Canonical stored hero headline: "Line one. Line two." */
export function formatHeroHeadline(headline: string): string {
  const { line1, line2 } = splitHeroHeadlineForBaseline(headline);
  return `${line1} ${line2}`.trim();
}

function truncateWords(text: string, maxLength: number): string {
  const words = stripTrailingPunct(text).split(" ").filter(Boolean);
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    const withPeriod = ensurePeriod(next);
    if (withPeriod.length <= maxLength) out = next;
    else break;
  }
  return ensurePeriod(out || words[0]?.slice(0, Math.max(1, maxLength - 1)) || "");
}

/**
 * Fit hero subheading copy to the baseline paragraph slot (~same character count).
 */
export function fitHeroBodyToBaseline(body: string): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return BASELINE_HERO_BODY;
  if (cleaned.length >= HERO_BODY_MIN && cleaned.length <= HERO_BODY_MAX) return cleaned;

  if (cleaned.length > HERO_BODY_MAX) {
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    let packed = "";

    for (const sentence of sentences) {
      const next = packed ? `${packed} ${sentence}` : sentence;
      if (next.length <= HERO_BODY_MAX) {
        packed = next;
        continue;
      }
      if (packed) break;
      packed = truncateWords(sentence, HERO_BODY_MAX);
      break;
    }

    if (packed.length >= HERO_BODY_MIN) return packed;
    return truncateWords(cleaned, HERO_BODY_MAX);
  }

  return cleaned;
}
