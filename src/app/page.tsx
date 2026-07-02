import { PageShell } from "@/components/Nav";
import { ChallengeDashboard } from "@/components/challenge/ChallengeDashboard";

export default function Home() {
  return (
    <PageShell
      active="/"
      hero
      title="Landing pages that improve themselves"
      subtitle="An autonomous experimentation loop for Scholé AI: persona agents simulate user behavior, a bandit compares variants, and optimizer agents breed better pages, generation after generation."
    >
      <ChallengeDashboard />
    </PageShell>
  );
}
