import { AppShell } from "@/components/Nav";
import { LandingPagesGrid } from "@/components/LandingPagesSidebar";
import { LiveDashboard } from "@/components/live/LiveDashboard";
import { loadRun } from "@/lib/registry";

export default function LivePage() {
  const run = loadRun();
  const lastGen = run?.generations[run.generations.length - 1];

  const simulated = lastGen
    ? {
        conversionRate:
          lastGen.visits.filter((v) => v.converted).length / lastGen.visits.length,
        bounceRate:
          lastGen.visits.filter((v) => v.events.some((e) => e.type === "bounce")).length /
          lastGen.visits.length,
        avgScrollDepth:
          lastGen.visits.reduce((s, v) => s + v.scrollDepth, 0) / lastGen.visits.length,
      }
    : undefined;

  return (
    <AppShell menu={<LandingPagesGrid />} mobileMenu={<LandingPagesGrid compact />}>
      <LiveDashboard simulated={simulated} />
    </AppShell>
  );
}
