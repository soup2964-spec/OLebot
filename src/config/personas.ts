import type { PersonaSet } from "@/lib/schema/persona";

/**
 * Persona set v1 - priors sourced from published buyer research, not invented.
 * Sources cited per-attribute in `groundedIn`. This file is the swappable
 * calibration seam: v2+ versions are produced by the calibrator from real
 * PostHog / GTM traffic (see lib/calibration).
 *
 * Source key:
 *  [McKinsey25]   McKinsey Superagency in the Workplace (2025)
 *  [OECD25]       OECD Bridging the AI Skills Gap (2025)
 *  [WEF25]        World Economic Forum Future of Jobs Report (2025)
 *  [Gallup25]     Gallup Workforce Panel — AI use & manager support (2025)
 *  [LinkedIn25]   LinkedIn 2025 Workplace Learning Report
 *  [TrainingMag25] Training Magazine 2025 Training Industry Report
 *  [Fosway25]     Fosway Digital Learning Realities (2025, independent analyst)
 *  [EUAIAct]      EU AI Act, Article 4 (AI literacy obligation, in force Feb 2025)
 *  [NNG]          Nielsen Norman Group scroll-behavior research
 */
export const PERSONA_SET_V1: PersonaSet = {
  version: 1,
  createdAt: "2026-07-01",
  changelog:
    "v1: priors grounded in McKinsey, OECD, WEF, Gallup, LinkedIn, Training Magazine, Fosway, and EUR-Lex. Awaiting calibration from live traffic.",
  personas: [
    {
      id: "ld_director",
      version: 1,
      name: "Dana",
      role: "L&D Director, 2,000-person retail company",
      profile:
        "Runs learning programs but is excluded from budget conversations. Needs hard business-outcome evidence to defend her function to the CFO. Feature lists bore her; adoption and ROI numbers stop her scroll.",
      goals: [
        "Prove learning drives measurable business outcomes",
        "Get back in the room where budget decisions happen",
        "Move beyond completion-rate vanity metrics",
      ],
      objections: [
        {
          id: "roi_proof",
          text: "Can I put a number in front of my CFO, or is this another 'engagement' story?",
          critical: true,
          groundedIn:
            "[McKinsey25] 46% of leaders cite workforce skill gaps as a major AI barrier; [WEF25] 63% of employers name skill gaps the top barrier to business transformation.",
        },
        {
          id: "employee_adoption",
          text: "Our current LMS has a 30% completion rate. Why would this be different?",
          critical: true,
          groundedIn:
            "[OECD25] Training supply focuses on specialists while most workers need role-relevant AI literacy; [WEF25] employers still lean on completion over capability metrics.",
        },
      ],
      patienceSeconds: { mean: 75, stdDev: 20 },
      skepticism: 0.65,
      skimPropensity: 0.45,
      ctaPropensity: 0.55,
      trafficWeight: 0.22,
      groundedIn: [
        "[TrainingMag25] Only 25% of training respondents set the budget; 64% influence purchasing decisions",
        "[LinkedIn25] L&D must prove business impact to win executive sponsorship",
      ],
    },
    {
      id: "hr_manager",
      version: 1,
      name: "Marcus",
      role: "HR Manager, 800-person logistics company",
      profile:
        "Believes his AI training program is working - his employees quietly disagree. Generic 'improve your training' pitches bounce off him; evidence of a hidden adoption gap lands hard because it names his blind spot.",
      goals: [
        "Show leadership the AI rollout is succeeding",
        "Close the gap between training delivered and skills applied",
      ],
      objections: [
        {
          id: "employee_adoption",
          text: "We already run AI training. My dashboards say it's fine.",
          critical: true,
          groundedIn:
            "[Gallup25] 23% of employees don't know whether their organization has an AI strategy; [McKinsey25] employees use gen AI more than leaders expect.",
        },
        {
          id: "roi_proof",
          text: "How do I see who's actually applying this, not just completing it?",
          critical: true,
          groundedIn:
            "[WEF25] 39% of core worker skills expected to change by 2030; shift from completion rates to time-to-skill outcomes.",
        },
        {
          id: "implementation_burden",
          text: "I don't have headcount for another platform rollout.",
          critical: false,
          groundedIn:
            "[WEF25] 85% of employers prioritize upskilling but teams lack capacity to implement at pace.",
        },
      ],
      patienceSeconds: { mean: 60, stdDev: 15 },
      skepticism: 0.55,
      skimPropensity: 0.5,
      ctaPropensity: 0.5,
      trafficWeight: 0.2,
      groundedIn: [
        "[Gallup25] Manager support is the strongest predictor of employee AI adoption",
      ],
    },
    {
      id: "employee_ic",
      version: 1,
      name: "Priya",
      role: "Marketing specialist, individual contributor",
      profile:
        "Overloaded, skeptical of corporate training, and quietly worried that 'AI upskilling' is a euphemism for automating her role. Only converts on learning that visibly fits her workday and her actual tools.",
      goals: [
        "Get better at AI tools without losing hours of work time",
        "Stay employable as AI reshapes her role",
      ],
      objections: [
        {
          id: "time_cost",
          text: "I don't have 45 minutes for a course. I barely have 5.",
          critical: true,
          groundedIn:
            "[McKinsey25] More than a fifth of employees report minimal to no employer AI training support.",
        },
        {
          id: "automation_anxiety",
          text: "Is this training me, or training my replacement?",
          critical: true,
          groundedIn:
            "[WEF25] 41% of employers expect to reduce headcount as AI automates tasks; [OECD25] workers need literacy on risks and responsible use, not just tool access.",
        },
        {
          id: "relevance_to_role",
          text: "Generic AI courses have nothing to do with my daily work.",
          critical: true,
          groundedIn:
            "[OECD25] Most workers need general AI literacy tied to their role, not generic tool training; [McKinsey25] upskilling must be role-specific to stick.",
        },
      ],
      patienceSeconds: { mean: 35, stdDev: 12 },
      skepticism: 0.7,
      skimPropensity: 0.65,
      ctaPropensity: 0.45,
      trafficWeight: 0.18,
      groundedIn: [
        "[McKinsey25] employees want training but often don't receive it",
        "[NNG] Short attention: ~57% of viewing time above the fold",
      ],
    },
    {
      id: "ops_it_buyer",
      version: 1,
      name: "Tomas",
      role: "Head of IT/Operations, evaluates all new tooling",
      profile:
        "Integration-scarred from two painful LMS rollouts. Scans pages for stack compatibility, data handling, and content-quality guarantees. A page that never mentions integration is a page he leaves.",
      goals: [
        "Avoid another integration nightmare",
        "Verify vendor content quality and security posture before anyone books a call",
      ],
      objections: [
        {
          id: "integration_friction",
          text: "Does this plug into our LMS, HRIS, and SSO, or is it another silo?",
          critical: true,
          groundedIn:
            "[Fosway25] Integration friction and platform sprawl remain top enterprise learning pain points; [TrainingMag25] buyers expect rapid implementation cycles.",
        },
        {
          id: "content_quality",
          text: "AI-generated lessons? Who checks them for accuracy?",
          critical: true,
          groundedIn:
            "[OECD25] AI literacy includes evaluating outputs, risks, and ethics — not just accepting generated content.",
        },
        {
          id: "implementation_burden",
          text: "What's the real go-live time - weeks or quarters?",
          critical: false,
          groundedIn:
            "[Fosway25] Enterprise buyers expect platforms live in weeks, not quarters, amid static L&D budgets.",
        },
      ],
      patienceSeconds: { mean: 55, stdDev: 15 },
      skepticism: 0.75,
      skimPropensity: 0.55,
      ctaPropensity: 0.4,
      trafficWeight: 0.15,
      groundedIn: [
        "[Fosway25] integration friction + admin burden dominate practitioner complaints",
      ],
    },
    {
      id: "ld_team_lead",
      version: 1,
      name: "Sofia",
      role: "L&D Team Lead, 4-person team, no AI specialists",
      profile:
        "Wants AI-driven learning but her team is small, stretched, and non-technical. Complexity is her enemy; 'no specialists needed, live in weeks' is her love language. Fears buying something her team can't run.",
      goals: [
        "Modernize learning without hiring AI engineers",
        "Reduce admin/reporting time, not add to it",
      ],
      objections: [
        {
          id: "implementation_burden",
          text: "We can't implement AI-driven learning - we don't have the people.",
          critical: true,
          groundedIn:
            "[OECD25] Training supply insufficient for general AI literacy; [WEF25] reskilling capacity is the binding constraint for most employers.",
        },
        {
          id: "roi_proof",
          text: "Reporting on our current platform eats my week. Will this make that worse?",
          critical: true,
          groundedIn:
            "[Fosway25] Reporting and admin overhead cited among the top reasons platforms fail practitioner fit tests.",
        },
        {
          id: "credibility",
          text: "Every vendor slapped 'AI' on their homepage this year. Why trust this one?",
          critical: false,
          groundedIn:
            "[McKinsey25] Only 1% of companies believe they have reached AI maturity despite near-universal investment.",
        },
      ],
      patienceSeconds: { mean: 70, stdDev: 18 },
      skepticism: 0.6,
      skimPropensity: 0.4,
      ctaPropensity: 0.6,
      trafficWeight: 0.15,
      groundedIn: [
        "[OECD25] Governments expanding AI literacy programmes as supply lags demand",
      ],
    },
    {
      id: "compliance_lead",
      version: 1,
      name: "Anneke",
      role: "Head of People, EU-headquartered fintech",
      profile:
        "Has a dated regulatory obligation: EU AI Act Article 4 requires demonstrable AI literacy across her workforce. She needs coverage, auditability, and speed - and she's comparing three vendors this week.",
      goals: [
        "Satisfy EU AI Act Article 4 with auditable evidence",
        "Roll out AI literacy to 1,200 employees this quarter",
      ],
      objections: [
        {
          id: "compliance_coverage",
          text: "Does this actually map to Article 4 requirements, or is 'compliance' a marketing word here?",
          critical: true,
          groundedIn:
            "[EUAIAct] Article 4 AI-literacy obligation applies to providers and deployers from Feb 2025.",
        },
        {
          id: "roi_proof",
          text: "I need audit-ready reporting per employee, not a completion certificate.",
          critical: true,
          groundedIn:
            "[Fosway25] Compliance reporting exists but advanced, audit-grade analytics remain a common platform gap.",
        },
        {
          id: "implementation_burden",
          text: "This quarter. Can it be live this quarter?",
          critical: false,
          groundedIn: "[TrainingMag25] U.S. corporate training buyers expect compressed implementation timelines.",
        },
      ],
      patienceSeconds: { mean: 50, stdDev: 12 },
      skepticism: 0.5,
      skimPropensity: 0.5,
      ctaPropensity: 0.7,
      trafficWeight: 0.1,
      groundedIn: ["[EUAIAct] Article 4 creates dated, non-optional demand"],
    },
  ],
};
