"use client";

import { useEffect, useRef, useState } from "react";
import type { PageVariant } from "@/lib/schema/page";
import { replicaHtmlWithGuard, staticReplicaPath } from "@/lib/replica/paths";
import { ClarityVariantTag, trackCtaClick } from "./Clarity";
import { useVariantAnalytics } from "./useVariantAnalytics";

/**
 * Exact schole.ai Framer replica. Framer runtime handles layout; variant copy is
 * swapped in HTML plus an in-page guard so text survives hydration.
 */
export function ScholeBaselineReplica({
  variant,
  highlightSectionId,
  iframeClassName = "h-screen w-full border-0",
  showLabChrome = true,
}: {
  variant: PageVariant;
  highlightSectionId?: string;
  iframeClassName?: string;
  showLabChrome?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const staticSrc = staticReplicaPath(variant.id);
  const [srcdoc, setSrcdoc] = useState<string | undefined>(undefined);
  const ctx = {
    variantId: variant.id,
    generation: variant.generation,
    strategy: variant.strategy,
  };

  useVariantAnalytics(ctx, scrollRoot);

  useEffect(() => {
    if (staticSrc) {
      setSrcdoc(undefined);
      return;
    }
    let cancelled = false;
    fetch("/baseline/index.html")
      .then((r) => r.text())
      .then((html) => {
        if (cancelled) return;
        setSrcdoc(replicaHtmlWithGuard(html, variant));
      });
    return () => {
      cancelled = true;
    };
  }, [staticSrc, variant.id, variant.generation]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const wireDoc = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      setScrollRoot(doc.documentElement);

      if (doc.documentElement.dataset.llWired) return;
      doc.documentElement.dataset.llWired = "1";

      doc.querySelectorAll('a[href*="cal.com"], a[href*="demo"]').forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const v = variantRef.current;
          trackCtaClick(
            {
              variantId: v.id,
              generation: v.generation,
              strategy: v.strategy,
            },
            "cta"
          );
        });
      });
    };

    const onLoad = () => wireDoc();
    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") wireDoc();

    return () => iframe.removeEventListener("load", onLoad);
  }, [staticSrc, srcdoc]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    doc.querySelectorAll("[data-section-id].ll-highlight").forEach((el) => {
      el.classList.remove("ll-highlight");
    });

    if (!highlightSectionId) return;

    const target = doc.querySelector(`[data-section-id="${highlightSectionId}"]`);
    if (target) {
      target.classList.add("ll-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSectionId, variant.id, staticSrc, srcdoc]);

  const chromeLabel =
    variant.id === "v0-baseline" ? "Baseline replica" : variant.name;

  return (
    <div className="relative min-h-screen bg-white">
      <ClarityVariantTag
        variantId={variant.id}
        generation={variant.generation}
        strategy={variant.strategy}
      />
      {showLabChrome && (
        <div className="pointer-events-none absolute left-4 top-4 z-50 flex items-center gap-2">
          <span className="pointer-events-auto rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            Landing Lab · {chromeLabel}
          </span>
          <a
            href="/variants"
            className="pointer-events-auto rounded-full bg-schole-primary px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-schole-primary-hover"
          >
            All variants
          </a>
        </div>
      )}
      <iframe
        key={staticSrc ?? srcdoc?.slice(0, 80) ?? variant.id}
        ref={iframeRef}
        src={staticSrc ?? undefined}
        srcDoc={srcdoc}
        title={`Scholé AI — ${variant.name}`}
        className={iframeClassName}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
