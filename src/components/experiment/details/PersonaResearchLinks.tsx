import { PERSONA_RESEARCH_SOURCES } from "@/config/persona-research";

export function PersonaResearchLinks({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 ${className}`}
      aria-label="Persona research sources"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Research sources
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Persona priors and objection ledgers cite published 2025–26 L&D buyer research — not invented
        profiles.
      </p>
      <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {PERSONA_RESEARCH_SOURCES.map((source) => (
          <li key={source.id} className="min-w-[14rem] flex-1">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-schole-primary/40 hover:shadow-sm"
            >
              <span className="text-xs font-semibold text-slate-900 group-hover:text-schole-primary">
                {source.label}
                <span className="ml-1 text-slate-400" aria-hidden="true">
                  ↗
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                {source.note}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
