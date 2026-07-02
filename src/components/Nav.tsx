"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CRITERIA } from "@/config/criteria";
import { DashboardModeNav } from "@/components/DashboardModeNav";

type ShellMode = "simulation" | "live";

function CriteriaMobileNav({ active }: { active: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
      {CRITERIA.map((c) => (
        <a
          key={c.id}
          href={`#section-${c.id}`}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
            active === c.id ? "bg-schole-primary text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {c.id}. {c.short}
        </a>
      ))}
    </div>
  );
}

export function AppDashboardShell({
  mode,
  sidebar,
  mobileSidebar,
  children,
}: {
  mode: ShellMode;
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [activeCriterion, setActiveCriterion] = useState("1");
  const isLive = mode === "live";

  useEffect(() => {
    if (isLive) return;

    const sections = CRITERIA.map((c) => document.getElementById(`section-${c.id}`)).filter(
      Boolean
    ) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveCriterion(visible.target.id.replace("section-", ""));
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isLive]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header
        className={`sticky top-0 z-50 border-b shadow-sm ${
          isLive
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm font-semibold text-slate-900">
                Scholé <span className="text-schole-primary">Landing Lab</span>
              </Link>
              {isLive && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Live version
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isLive
                ? "Real traffic · PostHog · GTM · calibration"
                : "Simulation dashboard · 6 GTM criteria"}
            </p>
          </div>
          <DashboardModeNav />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 shrink-0 lg:sticky lg:top-[57px] lg:block lg:h-[calc(100vh-57px)]">
          {sidebar}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="overflow-x-auto border-b border-slate-200 bg-white p-3 lg:hidden">
            {mobileSidebar}
          </div>
          {!isLive && <CriteriaMobileNav active={activeCriterion} />}
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-8">{children}</main>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        {isLive ? "Live version dashboard" : "Simulation dashboard"}
      </footer>
    </div>
  );
}

export function SimulationDashboardShell({
  sidebar,
  mobileSidebar,
  children,
}: {
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppDashboardShell mode="simulation" sidebar={sidebar} mobileSidebar={mobileSidebar}>
      {children}
    </AppDashboardShell>
  );
}

export function LiveDashboardShell({
  sidebar,
  mobileSidebar,
  children,
}: {
  sidebar: React.ReactNode;
  mobileSidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppDashboardShell mode="live" sidebar={sidebar} mobileSidebar={mobileSidebar}>
      {children}
    </AppDashboardShell>
  );
}

export function EmptyRun() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">No experiment data</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Run <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run demo</code> to populate the
        simulation dashboard.
      </p>
    </div>
  );
}

export const DashboardShell = SimulationDashboardShell;
