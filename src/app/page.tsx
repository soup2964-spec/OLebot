import { AppShell } from "@/components/Nav";
import { LandingPagesGrid } from "@/components/LandingPagesSidebar";
import { ChallengeDashboard } from "@/components/challenge/ChallengeDashboard";

export default function Home() {
  return (
    <AppShell
      menu={<LandingPagesGrid />}
      mobileMenu={<LandingPagesGrid compact />}
    >
      <ChallengeDashboard />
    </AppShell>
  );
}
