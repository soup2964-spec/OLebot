import Link from "next/link";

const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/variants", label: "1 · Variants" },
  { href: "/experiment", label: "2 · Method" },
  { href: "/behavior", label: "3 · Behavior" },
  { href: "/results", label: "4 · Results" },
  { href: "/evolution", label: "5 · Evolution" },
];

export function Nav({ active }: { active: string }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3 lg:max-w-7xl">
        <Link href="/" className="mr-4 flex-none text-sm font-semibold tracking-tight text-slate-900">
          Scholé
          <span className="text-schole-primary"> Landing Lab</span>
        </Link>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-none rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active === t.href
                ? "bg-schole-primary text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function PageShell({
  active,
  title,
  subtitle,
  wide,
  hero,
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  wide?: boolean;
  hero?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Nav active={active} />
      {hero ? (
        <header className="border-b border-slate-100 bg-gradient-to-b from-schole-surface to-white">
          <div className={`mx-auto px-4 py-14 lg:px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-schole-primary">
              Autonomous landing page evolution
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{subtitle}</p>
          </div>
        </header>
      ) : (
        <header className="border-b border-slate-100">
          <div className={`mx-auto px-4 py-10 lg:px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 max-w-3xl text-slate-600">{subtitle}</p>
          </div>
        </header>
      )}
      <main className={`mx-auto px-4 py-10 lg:px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-schole-surface px-4 py-10 text-center text-xs text-slate-500">
        Scholé Landing Lab · autonomous landing page experimentation · built for the Scholé AI GTM
        challenge
      </footer>
    </div>
  );
}

export function EmptyRun() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-schole-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">No experiment run yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Set <code className="rounded bg-slate-100 px-1.5 py-0.5">OPENAI_API_KEY</code> in{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.local</code> and run{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run experiment</code> to simulate
        visits, evaluate variants, and breed new generations. Results are written to{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">data/run.json</code>.
      </p>
    </div>
  );
}
