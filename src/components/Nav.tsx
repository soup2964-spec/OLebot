export function AppShell({
  menu,
  mobileMenu,
  children,
}: {
  menu: React.ReactNode;
  mobileMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden h-screen w-80 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block">
        {menu}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white lg:hidden">{mobileMenu}</div>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function EmptyRun() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">No experiment data</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Run <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run demo</code> to populate the
        dashboard.
      </p>
    </div>
  );
}

/** @deprecated use AppShell */
export const SimulationDashboardShell = AppShell;
export const LiveDashboardShell = AppShell;
export const DashboardShell = AppShell;
