import { allVariants, loadRun, visitIndex } from "@/lib/registry";
import { loadDeployState } from "@/lib/deploy/state";
import { ExperimentWorkbench } from "@/components/experiment/ExperimentWorkbench";

export default async function Home() {
  const run = await loadRun();
  const variants = await allVariants();
  const { deployVersion } = await loadDeployState();
  const index = run ? visitIndex(run) : null;

  return (
    <ExperimentWorkbench
      initialRun={run}
      initialVariants={variants}
      initialDeployVersion={deployVersion}
      initialIndex={index}
    />
  );
}
