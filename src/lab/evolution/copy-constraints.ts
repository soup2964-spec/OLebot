import type { Section, SectionType } from "@/shared/schema/page";
import {
  BASELINE_HTML_COPY,
  type ReplicaSectionId,
} from "@/lab/replica/baseline-copy";

const TYPE_TO_REPLICA: Partial<Record<SectionType, ReplicaSectionId>> = {
  hero: "hero",
  how_it_works: "how",
  problem: "problem",
  features: "features",
  outcomes: "features",
};

export interface CopyLineBudget {
  headlineLines: number;
  bodyLines: number;
  itemCount: number;
  itemTitleLines: number;
  itemDetailLines: number;
}

function replicaIdForSection(section: Section): ReplicaSectionId | null {
  if (BASELINE_HTML_COPY[section.id as ReplicaSectionId]) {
    return section.id as ReplicaSectionId;
  }
  return TYPE_TO_REPLICA[section.type] ?? null;
}

/** Count display lines as sentence units separated by ". " */
export function countSentenceLines(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\.\s+/).filter((s) => s.replace(/\./g, "").trim()).length;
}

export function copyLineBudget(reference: Section): CopyLineBudget {
  const replicaId = replicaIdForSection(reference);
  const htmlHeadlines = replicaId ? BASELINE_HTML_COPY[replicaId]?.headline?.length : undefined;
  const htmlBodies = replicaId ? BASELINE_HTML_COPY[replicaId]?.body?.length : undefined;
  const refHeadlineLines = countSentenceLines(reference.headline);
  const refBodyLines = countSentenceLines(reference.body);

  return {
    headlineLines: Math.max(htmlHeadlines ?? 1, refHeadlineLines || 1),
    bodyLines: Math.max(htmlBodies ?? 1, refBodyLines || 1),
    itemCount: reference.items?.length ?? 0,
    itemTitleLines: 1,
    itemDetailLines: 1,
  };
}

/** Ensure text ends as a complete sentence. */
export function ensureFullSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/[.!?]["']?$/.test(t)) return t;
  return `${t.replace(/[,;:\s]+$/, "")}.`;
}

function normalizeSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const stripped = t.replace(/[.!?]+$/, "").trim();
  return stripped ? `${stripped}.` : "";
}

/** Fit copy to exactly `lineCount` sentence lines, joined as one string. */
export function fitToSentenceLines(text: string, lineCount: number): string {
  const target = Math.max(1, lineCount);
  const parts = text
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean)
    .map((s) => normalizeSentence(s));

  if (parts.length > target) return parts.slice(0, target).join(" ");
  if (parts.length === target) return parts.join(" ");
  if (parts.length === 0) return ensureFullSentence(text);
  return parts.join(" ");
}

export function formatSectionCopy(
  section: Section,
  reference: Section
): Section {
  const budget = copyLineBudget(reference);
  return {
    ...section,
    headline: fitToSentenceLines(section.headline, budget.headlineLines),
    body: fitToSentenceLines(section.body, budget.bodyLines),
    items: section.items?.slice(0, budget.itemCount).map((it) => ({
      title: ensureFullSentence(it.title),
      detail: ensureFullSentence(it.detail),
    })),
  };
}

export function copyBudgetPromptBlock(reference: Section): string {
  const budget = copyLineBudget(reference);
  const headlineNote =
    budget.headlineLines === 1
      ? "1 sentence line"
      : `${budget.headlineLines} sentence lines (separate with \". \")`;
  const bodyNote =
    budget.bodyLines === 1
      ? "1 sentence line"
      : `${budget.bodyLines} sentence lines (separate with \". \")`;
  let block = `    COPY LENGTH (match original): headline ${headlineNote}, body ${bodyNote}`;
  if (budget.itemCount > 0) {
    block += `, ${budget.itemCount} items (each title and detail = 1 full sentence)`;
  }
  return block;
}

export function findReferenceSection(
  references: Section[],
  candidate: Section
): Section | undefined {
  const byId = references.find((s) => s.id === candidate.id);
  if (byId) return byId;
  return references.find((s) => s.type === candidate.type);
}
