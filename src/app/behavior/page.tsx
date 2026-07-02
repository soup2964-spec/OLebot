import { PageShell, EmptyRun } from "@/components/Nav";
import { BehaviorExplorer } from "@/components/BehaviorExplorer";
import { loadRun, allVariants } from "@/lib/registry";

export default function BehaviorPage() {
  const run = loadRun();
  const variants = allVariants();

  return (
    <PageShell
      active="/behavior"
      title="Simulated user behavior"
      subtitle="Aggregate heatmaps show where personas read, skim, and bounce. The replay theater lets you watch any single visit play back on the real page, with the agent's reasoning alongside."
    >
      {run ? <BehaviorExplorer run={run} variants={variants} /> : <EmptyRun />}
    </PageShell>
  );
}
