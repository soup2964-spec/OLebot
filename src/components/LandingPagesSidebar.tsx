import Link from "next/link";
import { allVariants } from "@/lib/registry";
import { staticReplicaPath } from "@/lib/replica/paths";

export function LandingPagesSidebar({ compact }: { compact?: boolean }) {
  const variants = allVariants();
  const byGen = new Map<number, typeof variants>();
  for (const v of variants) {
    byGen.set(v.generation, [...(byGen.get(v.generation) ?? []), v]);
  }

  if (compact) {
    return (
      <div className="flex gap-3">
        {variants.map((v) => {
          const src = staticReplicaPath(v.id);
          return (
            <Link
              key={v.id}
              href={`/v/${v.id}`}
              target="_blank"
              className="w-36 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              {src ? (
                <div className="relative h-20 overflow-hidden">
                  <iframe
                    src={src}
                    title={v.name}
                    className="pointer-events-none h-[400px] w-[400%] origin-top-left scale-[0.2] border-0"
                    tabIndex={-1}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-[9px] text-slate-400">
                  {v.id}
                </div>
              )}
              <p className="truncate px-2 py-1.5 text-[10px] font-medium text-slate-800">{v.id}</p>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-schole-primary">
          Landing pages
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{variants.length} variants · click to open</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {[...byGen.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([gen, vs]) => (
            <div key={gen} className="mb-4">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Generation {gen}
              </p>
              <ul className="space-y-2">
                {vs.map((v) => {
                  const src = staticReplicaPath(v.id);
                  return (
                    <li key={v.id}>
                      <Link
                        href={`/v/${v.id}`}
                        target="_blank"
                        className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-schole-primary hover:shadow-md"
                      >
                        {src ? (
                          <div className="relative h-28 overflow-hidden border-b border-slate-200 bg-white">
                            <iframe
                              src={src}
                              title={v.name}
                              className="pointer-events-none h-[640px] w-[400%] origin-top-left scale-[0.2] border-0"
                              tabIndex={-1}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex h-28 items-center justify-center border-b border-slate-200 bg-white text-[10px] text-slate-400">
                            Bred variant
                          </div>
                        )}
                        <div className="px-2.5 py-2">
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 group-hover:text-schole-primary">
                            {v.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] text-slate-500">{v.id}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </nav>
    </aside>
  );
}
