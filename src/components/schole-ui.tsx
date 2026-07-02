import Link from "next/link";

/** Shared Scholé landing-page design primitives for the lab dashboard. */

export const schole = {
  card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
  cardMuted: "rounded-2xl border border-slate-200 bg-schole-surface p-5",
  cardHighlight: "rounded-2xl border border-schole-primary/30 bg-schole-primary/5 p-5",
  btnPrimary:
    "inline-flex items-center justify-center rounded-full bg-schole-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-schole-primary-hover",
  btnSecondary:
    "inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50",
  code: "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700",
  sectionLabel: "text-xs font-semibold uppercase tracking-widest text-schole-primary",
  h2: "text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl",
  body: "text-sm leading-relaxed text-slate-600 md:text-base",
  muted: "text-sm text-slate-500",
} as const;

export function ScholeLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`${schole.btnPrimary} px-5 py-2 text-sm`}
    >
      {children}
    </Link>
  );
}

export function ChallengeSection({
  n,
  title,
  subtitle,
  href,
  children,
}: {
  n: string;
  title: string;
  subtitle: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${n}`} className="scroll-mt-24 border-b border-slate-100 py-14 last:border-b-0">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-5">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-schole-primary text-sm font-bold text-white">
            {n}
          </div>
          <div>
            <p className={schole.sectionLabel}>Challenge criterion {n}</p>
            <h2 className={`mt-1 ${schole.h2}`}>{title}</h2>
            <p className={`mt-2 max-w-2xl ${schole.body}`}>{subtitle}</p>
          </div>
        </div>
        {href && (
          <Link href={href} className={schole.btnSecondary}>
            View full →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? schole.cardHighlight : schole.card}>
      <div className="text-xs font-medium uppercase tracking-wide text-schole-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
