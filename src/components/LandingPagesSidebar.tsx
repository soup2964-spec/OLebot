import Link from "next/link";
import { allVariants } from "@/lib/registry";
import { staticReplicaPath } from "@/lib/replica/paths";

function PageTile({ variant }: { variant: ReturnType<typeof allVariants>[number] }) {
  const src = staticReplicaPath(variant.id);

  return (
    <Link
      href={`/v/${variant.id}`}
      target="_blank"
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-schole-primary hover:shadow-md"
    >
      {src ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
          <iframe
            src={src}
            title={variant.name}
            className="pointer-events-none h-[640px] w-[400%] origin-top-left scale-[0.2] border-0"
            tabIndex={-1}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-[10px] text-slate-400">
          {variant.id}
        </div>
      )}
      <p className="truncate px-2 py-1.5 text-[10px] font-medium text-slate-800 group-hover:text-schole-primary">
        {variant.id}
      </p>
    </Link>
  );
}

/** Left menu: grid of all landing page runs only. */
export function LandingPagesGrid({ compact }: { compact?: boolean }) {
  const variants = [...allVariants()].sort(
    (a, b) => a.generation - b.generation || a.id.localeCompare(b.id)
  );

  return (
    <div
      className={
        compact
          ? "flex gap-2 overflow-x-auto p-2"
          : "grid h-full grid-cols-2 gap-2 overflow-y-auto p-2 content-start"
      }
    >
      {variants.map((v) => (
        <div key={v.id} className={compact ? "w-32 shrink-0" : undefined}>
          <PageTile variant={v} />
        </div>
      ))}
    </div>
  );
}

/** @deprecated use LandingPagesGrid */
export function LandingPagesSidebar({ compact }: { compact?: boolean }) {
  return <LandingPagesGrid compact={compact} />;
}
