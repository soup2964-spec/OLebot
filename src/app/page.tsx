import { SimulationDashboardShell } from "@/components/Nav";
import { LandingPagesSidebar } from "@/components/LandingPagesSidebar";
import { ChallengeDashboard } from "@/components/challenge/ChallengeDashboard";

export default function Home() {
  return (
    <SimulationDashboardShell
      sidebar={<LandingPagesSidebar />}
      mobileSidebar={<LandingPagesSidebar compact />}
    >
      <ChallengeDashboard />
    </SimulationDashboardShell>
  );
}
