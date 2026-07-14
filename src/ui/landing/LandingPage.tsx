"use client";

import type { PageVariant } from "@/shared/schema/page";
import { shouldUseReplica } from "@/lab/replica/paths";
import { ScholeBaselineReplica } from "./ScholeBaselineReplica";
import { trackCtaClick } from "@/ui/shell/Clarity";
import { useVariantTrackingContext } from "@/lab/analytics/variant-context";
import { useVariantAnalytics } from "./useVariantAnalytics";
import type { VariantContext } from "@/lab/analytics/track";

function CtaButton({
  label,
  ctx,
  sectionId,
  big,
}: {
  label: string;
  ctx: VariantContext;
  sectionId: string;
  big?: boolean;
}) {
  return (
    <button
      onClick={() => trackCtaClick(ctx, sectionId, label)}
      className={`inline-block rounded-full bg-schole-primary font-semibold text-white shadow-lg shadow-schole-primary/25 transition hover:bg-schole-primary-hover hover:shadow-schole-primary/30 ${
        big ? "px-8 py-4 text-lg" : "px-6 py-3 text-sm"
      }`}
    >
      {label}
    </button>
  );
}

function SectionBlock({
  section,
  ctx,
  highlight,
}: {
  section: PageVariant["sections"][number];
  ctx: VariantContext;
  highlight?: boolean;
}) {
  const s = section;
  const base = highlight ? "ring-4 ring-amber-400 ring-offset-4" : "";

  switch (s.type) {
    case "hero":
      return (
        <header
          data-section-id={s.id}
          className={`bg-gradient-to-b from-schole-surface via-white to-white px-6 py-24 text-center ${base}`}
        >
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-schole-primary">
              Scholé AI
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {s.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">{s.body}</p>
            {s.ctaLabel && (
              <div className="mt-8">
                <CtaButton label={s.ctaLabel} ctx={ctx} sectionId={s.id} big />
              </div>
            )}
          </div>
        </header>
      );

    case "cta":
      return (
        <section
          data-section-id={s.id}
          className={`bg-schole-primary px-6 py-20 text-center text-white ${base}`}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold">{s.headline}</h2>
            <p className="mt-4 text-white/90">{s.body}</p>
            {s.ctaLabel && (
              <div className="mt-8">
                <button
                  onClick={() => trackCtaClick(ctx, s.id, s.ctaLabel)}
                  className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-schole-primary-hover shadow-lg transition hover:bg-schole-primary/5"
                >
                  {s.ctaLabel}
                </button>
              </div>
            )}
          </div>
        </section>
      );

    default:
      return (
        <section data-section-id={s.id} className={`bg-white px-6 py-20 ${base}`}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900">{s.headline}</h2>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{s.body}</p>
            {s.items && (
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {s.items.map((it) => (
                  <div key={it.title} className="rounded-2xl bg-schole-primary/5 p-6">
                    <h3 className="font-semibold text-slate-900">{it.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.detail}</p>
                  </div>
                ))}
              </div>
            )}
            {s.ctaLabel && (
              <div className="mt-8">
                <CtaButton label={s.ctaLabel} ctx={ctx} sectionId={s.id} />
              </div>
            )}
          </div>
        </section>
      );
  }
}

/** Fallback renderer for bred variants when replica HTML is unavailable. */
function StructuredLandingPage({
  variant,
  highlightSectionId,
}: {
  variant: PageVariant;
  highlightSectionId?: string;
}) {
  const ctx = useVariantTrackingContext(variant);
  useVariantAnalytics(ctx);

  return (
    <div className="min-h-screen bg-white">
      {variant.sections.map((s) => (
        <SectionBlock
          key={s.id}
          section={s}
          ctx={ctx}
          highlight={highlightSectionId === s.id}
        />
      ))}
      <footer className="bg-slate-50 px-6 py-10 text-center text-xs text-slate-500">
        Scholé Inc. · Experiment variant {variant.id} · generation {variant.generation}
      </footer>
    </div>
  );
}

export function LandingPage({
  variant,
  highlightSectionId,
}: {
  variant: PageVariant;
  highlightSectionId?: string;
}) {
  if (shouldUseReplica(variant)) {
    return (
      <ScholeBaselineReplica
        variant={variant}
        highlightSectionId={highlightSectionId}
        iframeClassName={
          highlightSectionId !== undefined
            ? "h-[520px] w-full border-0"
            : "h-screen w-full border-0"
        }
        showLabChrome={highlightSectionId === undefined}
      />
    );
  }

  return <StructuredLandingPage variant={variant} highlightSectionId={highlightSectionId} />;
}
