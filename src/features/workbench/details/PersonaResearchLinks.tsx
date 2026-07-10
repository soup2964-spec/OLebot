import { PERSONA_RESEARCH_SOURCES } from "@/content/persona-research";

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
        Persona priors cite independent research — McKinsey, OECD, World Economic Forum, Gallup,
        LinkedIn Learning, Training Magazine, Fosway, EUR-Lex, and Nielsen Norman Group.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {PERSONA_RESEARCH_SOURCES.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-schole-primary/40 hover:shadow-sm"
            >
              <span className="text-xs font-semibold text-slate-900 group-hover:text-schole-primary">
                {source.label}
                <span className="ml-1 text-slate-400" aria-hidden="true">
                  ↗
                </span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium text-slate-500">
                {source.publisher} · {source.year} · [{source.citeKey}]
              </span>
              <span className="mt-1.5 flex-1 text-[11px] leading-snug text-slate-600">
                {source.note}
              </span>
              <span className="mt-2 text-[10px] text-slate-400">
                Supports: {source.personas.join(", ")}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
