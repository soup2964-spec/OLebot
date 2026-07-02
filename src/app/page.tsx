import { allVariants, loadRun, visitIndex } from "@/lib/registry";
import { loadDeployState } from "@/lib/deploy/state";
import { ExperimentWorkbench } from "@/components/experiment/ExperimentWorkbench";

export default function Home() {
  const run = loadRun();
  const variants = allVariants();
  const { deployVersion } = loadDeployState();
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
