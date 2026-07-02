import type { PageVariant } from "@/lib/schema/page";

export function VersionsDetail({ variants }: { variants: PageVariant[] }) {
  const gen0 = variants.filter((v) => v.generation === 0);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Six Generation-0 pages on the exact schole.ai Framer layout. Each challenger swaps
        targeted copy for a different ICP while keeping the design pixel-identical.
      </p>
      <ul className="space-y-2">
        {gen0.map((v) => (
          <li
            key={v.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="font-semibold text-slate-900">{v.name}</span>
            <span className="ml-2 font-mono text-xs text-slate-500">{v.id}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Use the preview cards to open any page. Arrow buttons paginate through all six variants.
      </p>
    </div>
  );
}
