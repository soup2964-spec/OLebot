export const CRITERIA = [
  {
    id: "0",
    short: "Control center",
    title: "Experiment control center",
    question: "Run simulations manually or let live traffic drive the loop.",
  },
  {
    id: "1",
    short: "Page comparison",
    title: "The initial landing page versions",
    question: "What pages did we start with?",
  },
  {
    id: "2",
    short: "Comparison method",
    title: "How we compare page performance",
    question:
      "What criteria determine how each page is scored, compared, and selected as the winner?",
  },
  {
    id: "3",
    short: "User personas",
    title: "The simulated buyer personas",
    question:
      "Who visits each page, what do they care about, and which objections must be resolved to book a demo?",
  },
  {
    id: "4",
    short: "User behavior",
    title: "The simulated user behavior",
    question:
      "What did each buyer persona do on each page — scroll, sections read, objections, and conversions?",
  },
  {
    id: "5",
    short: "Winners",
    title: "Which versions performed better",
    question: "Who won and by how much?",
  },
  {
    id: "6",
    short: "New variants",
    title: "The new generated variation or variations",
    question: "What did the optimizer breed?",
  },
  {
    id: "7",
    short: "Changelog",
    title: "A short explanation of what changed and why",
    question: "What changed, and what evidence drove it?",
  },
] as const;
