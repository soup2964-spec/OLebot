import { allVariants, loadRun, visitIndex } from "@/shared/registry";
import { loadDeployState } from "@/lab/deploy/state";
import { ExperimentWorkbench } from "@/ui/workbench/ExperimentWorkbench";

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
