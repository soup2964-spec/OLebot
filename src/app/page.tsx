import { allVariants, loadRun, visitIndex } from "@/platform/registry";
import { loadDeployState } from "@/domains/deploy/state";
import { ExperimentWorkbench } from "@/features/workbench/ExperimentWorkbench";

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
