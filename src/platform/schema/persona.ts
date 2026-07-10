import type { ObjectionId } from "./page";

/**
 * Personas are versioned, evidence-grounded behavioral configs.
 * Every attribute that shapes behavior is a number here (calibratable from
 * real analytics), and every claim carries a citation in `groundedIn`.
 */

export interface Objection {
  id: ObjectionId;
  text: string; // the objection in the persona's own words
  critical: boolean; // must be resolved before this persona will convert
  groundedIn: string; // citation for why this persona holds this objection
}

export interface Persona {
  id: string;
  version: number;
  name: string;
  role: string;
  /** Short narrative used in the visitor agent's system prompt. */
  profile: string;
  goals: string[];
  objections: Objection[];
  /**
   * Attention budget in seconds: total careful-reading time before fatigue
   * makes skimming/bouncing increasingly likely. Sampled around this mean.
   */
  patienceSeconds: { mean: number; stdDev: number };
  /** 0-1. Higher = harder to convince, discounts marketing claims. */
  skepticism: number;
  /** 0-1. Base probability of skimming (vs. careful read) a section. */
  skimPropensity: number;
  /** 0-1. Probability multiplier applied at the CTA decision even when objections are resolved. */
  ctaPropensity: number;
  /** Relative share of simulated traffic (weights normalized across personas). */
  trafficWeight: number;
  /** Citations backing this persona's attributes. */
  groundedIn: string[];
}

export interface PersonaSet {
  version: number;
  createdAt: string;
  /** Why this version exists (v1 = sourced priors, v2+ = calibration updates). */
  changelog: string;
  personas: Persona[];
}
