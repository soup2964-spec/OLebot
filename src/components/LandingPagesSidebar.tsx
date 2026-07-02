import Link from "next/link";
import { allVariants } from "@/lib/registry";
import { staticReplicaPath } from "@/lib/replica/paths";
import { LandingPagePreview } from "@/components/LandingPagePreview";

function PageTile({ variant }: { variant: ReturnType<typeof allVariants>[number] }) {
  const src = staticReplicaPath(variant.id);
  const pageHref = `/v/${variant.id}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {src ? (
        <LandingPagePreview src={src} title={variant.name} />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-xs text-slate-400">
          {variant.id}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 border-t border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold leading-snug text-slate-900">{variant.name}</h2>
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">
            {variant.thesis}
          </p>
        </div>
        <Link
          href={pageHref}
          target="_blank"
          className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-schole-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-schole-primary-hover"
        >
          View page
        </Link>
      </div>
    </article>
  );
}

/** Full-page grid of Generation-0 landing page runs only. */
export function LandingPagesGrid() {
  const variants = [...allVariants()]
    .filter((v) => v.generation === 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-4">
        {variants.map((v) => (
          <PageTile key={v.id} variant={v} />
        ))}
      </div>
    </div>
  );
}

/** @deprecated */
export function LandingPagesSidebar({ compact }: { compact?: boolean }) {
  return <LandingPagesGrid />;
}
