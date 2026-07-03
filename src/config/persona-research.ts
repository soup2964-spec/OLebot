/** Published sources cited in persona objections and behavioral priors. */
export interface PersonaResearchSource {
  id: string;
  /** Short citation key used in personas.ts (e.g. TalentLMS26). */
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
    id: "talentlms-2026",
    citeKey: "TalentLMS26",
    label: "2026 Annual L&D Benchmark Report",
    publisher: "TalentLMS",
    year: 2026,
    url: "https://www.talentlms.com/research/learning-development-report-2026",
    note:
      "Learner–leader perception gaps on AI training, workload blocking learning time, and automation anxiety among employees.",
    personas: ["Marcus", "Priya"],
  },
  {
    id: "docebo-ai-readiness-2026",
    citeKey: "Docebo26",
    label: "The AI Readiness Gap: 2026 Enterprise Learning Wake-Up Call",
    publisher: "Docebo",
    year: 2026,
    url: "https://www.docebo.com/research/ai-readiness-gap-report-2026/",
    note:
      "2,000-enterprise survey: 85% of employees say training doesn't help them use AI in-role; fewer than half of L&D leaders feel confident tying learning to business results.",
    personas: ["Dana", "Sofia"],
  },
  {
    id: "g2-corporate-lms-2025",
    citeKey: "G2-LMS25",
    label: "Corporate LMS in 2025: Buyer & Review Analysis",
    publisher: "G2 Research",
    year: 2025,
    url: "https://research.g2.com/insights/corporate-lms-2025",
    note:
      "Qualitative review themes: ease of use, integration friction, reporting burden, relevance to daily work, and ~2.8-month go-live expectations.",
    personas: ["Dana", "Marcus", "Priya", "Tomas", "Sofia", "Anneke"],
  },
  {
    id: "riseup-state-of-learning-2025",
    citeKey: "RiseUp",
    label: "State of Learning 2025",
    publisher: "Rise Up × People Management Insight",
    year: 2025,
    url: "https://www.riseup.ai/en/content/state-of-learning-2025",
    note:
      "300 UK L&D leaders: 62% cite lack of AI knowledge, 55% lack skilled people; completion-rate KPIs lag behind time-to-skill outcomes.",
    personas: ["Marcus", "Sofia"],
  },
  {
    id: "training-industry-2025",
    citeKey: "ELI25",
    label: "2025 Training Industry Report",
    publisher: "Training Magazine",
    year: 2025,
    url: "https://trainingmag.com/2025-training-industry-report/",
    note:
      "44th annual industry benchmark: who sets budgets, who approves purchases, and how L&D spend shifted in 2025.",
    personas: ["Dana"],
  },
  {
    id: "fosway-digital-learning-2025",
    citeKey: "Fosway25",
    label: "Digital Learning Realities Research 2025",
    publisher: "Fosway Group",
    year: 2025,
    url: "https://www.fosway.com/research/next-gen-learning/digital-learning-realities-research-2025/",
    note:
      "European enterprise L&D: static budgets, platform dissatisfaction, and AI moving from content authoring into core LMS/LXP workflows.",
    personas: ["Tomas", "Anneke"],
  },
  {
    id: "thirst-state-of-ld-2025",
    citeKey: "Thirst25",
    label: "State of L&D for SMEs 2025",
    publisher: "Thirst",
    year: 2025,
    url: "https://thirst.io/state-of-ld-for-smes-2025/",
    note:
      "Survey of 2,101 L&D professionals on budget constraints, AI priorities, and pressure to prove ROI before the next planning cycle.",
    personas: ["Dana", "Sofia"],
  },
  {
    id: "eu-ai-act-art4",
    citeKey: "EUAIAct",
    label: "EU AI Act — Article 4 (AI literacy)",
    publisher: "EUR-Lex (Official Journal)",
    year: 2024,
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689",
    note:
      "Providers and deployers must ensure staff have sufficient AI literacy, with obligations applying from February 2025.",
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
      "Eyetracking: ~57% of viewing time stays above the fold; attention drops sharply after the first screenful.",
    personas: ["Priya"],
  },
];
