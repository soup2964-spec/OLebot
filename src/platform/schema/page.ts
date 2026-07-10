/**
 * Landing pages are structured data, not freeform HTML.
 * This is the load-bearing design decision: agents can "read" pages cheaply,
 * the optimizer can only emit valid pages, and diffs between generations are precise.
 */

export type SectionType =
  | "hero"
  | "problem"
  | "how_it_works"
  | "features"
  | "outcomes" // measurable results / ROI proof
  | "social_proof" // testimonials, logos
  | "credibility" // research pedigree, press
  | "compliance" // EU AI Act etc.
  | "product_tour" // screenshots / learner experience
  | "integration" // works with your stack
  | "pricing"
  | "faq"
  | "cta";

/** Objection IDs that a section can resolve. Must match persona objection ledgers. */
export type ObjectionId =
  | "roi_proof" // "Can I prove business impact to my CFO?"
  | "employee_adoption" // "Will my employees actually use this?"
  | "integration_friction" // "Will this integrate with our LMS/HRIS/stack?"
  | "content_quality" // "Is AI-generated content reliable/accurate?"
  | "implementation_burden" // "Do I need AI specialists / months of setup?"
  | "time_cost" // "My people have no time for training"
  | "automation_anxiety" // "Is this AI training a step toward automating me?"
  | "relevance_to_role" // "Is this actually tied to my daily work?"
  | "compliance_coverage" // "Does this satisfy EU AI Act Article 4?"
  | "credibility" // "Is this vendor legit or another AI wrapper?"
  | "price_clarity"; // "What does this actually cost?"

export interface Section {
  id: string;
  type: SectionType;
  headline: string;
  body: string;
  /** Bullet points, feature items, testimonial quotes, FAQ items, etc. */
  items?: { title: string; detail: string }[];
  ctaLabel?: string;
  /** Which persona objections this section's content addresses. Drives the objection ledger. */
  addresses: ObjectionId[];
  /**
   * Estimated reading effort in seconds for a careful read.
   * Used to derive dwell times and attention cost.
   */
  readSeconds: number;
}

export type Strategy =
  | "baseline" // recreation of schole.ai's actual current page
  | "roi"
  | "compliance"
  | "problem_first"
  | "credibility"
  | "learner_first"
  | "generated"; // bred by the optimizer

export interface ChangelogEntry {
  what: string; // what changed
  why: string; // reasoning
  evidence: string; // the specific simulated-behavior evidence that motivated it
  sourceVariantId?: string; // for crossover: where the section came from
}

export interface PageVariant {
  id: string;
  name: string;
  strategy: Strategy;
  generation: number;
  parentIds: string[]; // lineage; empty for gen 0
  ctaGoal: string; // e.g. "Book a demo"
  sections: Section[];
  /** Only present on generated variants. */
  changelog?: ChangelogEntry[];
  /** One-paragraph description of the strategic bet this page makes. */
  thesis: string;
}
