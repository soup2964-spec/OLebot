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
    question: "How does each page get scored, and how do we pick winners?",
  },
  {
    id: "3",
    short: "User behavior",
    title: "The simulated user behavior",
    question: "What did personas do on each page?",
  },
  {
    id: "4",
    short: "Winners",
    title: "Which versions performed better",
    question: "Who won and by how much?",
  },
  {
    id: "5",
    short: "New variants",
    title: "The new generated variation or variations",
    question: "What did the optimizer breed?",
  },
  {
    id: "6",
    short: "Changelog",
    title: "A short explanation of what changed and why",
    question: "What changed, and what evidence drove it?",
  },
] as const;
