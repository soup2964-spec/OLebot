/** Independent research cited in persona objections and behavioral priors. */
export interface PersonaResearchSource {
  id: string;
  /** Short citation key used in personas.ts (e.g. McKinsey25). */
  citeKey: string;
  label: string;
  publisher: string;
  year: number;
  url: string;
  /** One-line takeaway tied to how the lab uses this source. */
  note: string;
  /** Persona first names this source primarily supports. */
  personas: string[];
}

export const PERSONA_RESEARCH_SOURCES: PersonaResearchSource[] = [
  {
    id: "mckinsey-superagency-2025",
    citeKey: "McKinsey25",
    label: "Superagency in the Workplace: Unlocking AI's Full Potential",
    publisher: "McKinsey & Company",
    year: 2025,
    url: "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work",
    note:
      "Global employer + employee survey: employees are ready for AI and want formal training, but >20% report minimal support; leadership pace is the scaling bottleneck.",
    personas: ["Dana", "Marcus", "Priya", "Sofia"],
  },
  {
    id: "oecd-ai-skills-gap-2025",
    citeKey: "OECD25",
    label: "Bridging the AI Skills Gap: Is Training Keeping Up?",
    publisher: "OECD",
    year: 2025,
    url: "https://www.oecd.org/en/publications/bridging-the-ai-skills-gap_66d0702e-en.html",
    note:
      "Policy review across 21 countries plus training-catalog analysis: supply of general AI literacy lags demand; most programmes still target specialists, not everyday workers.",
    personas: ["Dana", "Priya", "Tomas", "Anneke"],
  },
  {
    id: "wef-future-of-jobs-2025",
    citeKey: "WEF25",
    label: "Future of Jobs Report 2025",
    publisher: "World Economic Forum",
    year: 2025,
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/4-workforce-strategies/",
    note:
      "1,000+ employers: 85% plan upskilling/reskilling; 63% name skill gaps the top barrier to transformation; 39% of core skills expected to change by 2030.",
    personas: ["Dana", "Marcus", "Sofia"],
  },
  {
    id: "gallup-ai-at-work-2025",
    citeKey: "Gallup25",
    label: "AI Use at Work (Workforce Panel)",
    publisher: "Gallup",
    year: 2025,
    url: "https://www.gallup.com/workplace/699689/ai-use-at-work-rises.aspx",
    note:
      "Nationally representative panel (n≈23k): adoption is rising but uneven; 23% of employees don't know whether their organization has an AI strategy.",
    personas: ["Marcus", "Priya"],
  },
  {
    id: "gallup-manager-support-ai",
    citeKey: "Gallup25",
    label: "Manager Support Drives Employee AI Adoption",
    publisher: "Gallup",
    year: 2025,
    url: "https://www.gallup.com/workplace/694682/manager-support-drives-employee-adoption.aspx",
    note:
      "Manager encouragement is the strongest lever for employee AI use; access alone does not produce adoption or ROI.",
    personas: ["Marcus"],
  },
  {
    id: "linkedin-wlr-2025",
    citeKey: "LinkedIn25",
    label: "2025 Workplace Learning Report",
    publisher: "LinkedIn Learning",
    year: 2025,
    url: "https://learning.linkedin.com/resources/workplace-learning-report",
    note:
      "937 L&D/HR leaders with budget influence + 679 learners across 20+ countries; maps how L&D proves impact and wins executive buy-in.",
    personas: ["Dana", "Sofia"],
  },
  {
    id: "training-magazine-2025",
    citeKey: "TrainingMag25",
    label: "2025 Training Industry Report",
    publisher: "Training Magazine",
    year: 2025,
    url: "https://trainingmag.com/2025-training-industry-report/",
    note:
      "44th annual benchmark of U.S. corporate training budgets, staffing, and purchasing authority — who sets budget vs. who recommends tools.",
    personas: ["Dana", "Tomas"],
  },
  {
    id: "fosway-digital-learning-2025",
    citeKey: "Fosway25",
    label: "Digital Learning Realities Research 2025",
    publisher: "Fosway Group (independent analyst)",
    year: 2025,
    url: "https://www.fosway.com/research/next-gen-learning/digital-learning-realities-research-2025/",
    note:
      "European enterprise L&D practitioner survey: static budgets, stretched teams, and fewer than 4 in 10 say their learning platform is fit for the modern workforce.",
    personas: ["Tomas", "Sofia", "Anneke"],
  },
  {
    id: "eu-ai-act-art4",
    citeKey: "EUAIAct",
    label: "EU AI Act — Regulation (EU) 2024/1689, Article 4",
    publisher: "EUR-Lex (Official Journal of the EU)",
    year: 2024,
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689",
    note:
      "Binding obligation for providers and deployers to ensure staff have sufficient AI literacy; enforceable from February 2025.",
    personas: ["Anneke"],
  },
  {
    id: "nng-scrolling-attention",
    citeKey: "NNG",
    label: "Scrolling and Attention",
    publisher: "Nielsen Norman Group",
    year: 2018,
    url: "https://www.nngroup.com/articles/scrolling-and-attention/",
    note:
      "Eyetracking study (n=120): ~57% of viewing time stays above the fold; attention drops sharply after the first screenful.",
    personas: ["Priya"],
  },
];
