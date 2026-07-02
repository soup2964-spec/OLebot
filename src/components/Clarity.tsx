"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/** Injects the Microsoft Clarity snippet once per app load. */
export function ClarityScript() {
  useEffect(() => {
    if (!CLARITY_ID || window.clarity) return;
    const script = document.createElement("script");
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");
    `;
    document.head.appendChild(script);
  }, []);
  return null;
}

/** Tags the current Clarity session with variant metadata so every heatmap,
 *  recording, and exported metric can be filtered per variant. */
export function ClarityVariantTag({
  variantId,
  generation,
  strategy,
}: {
  variantId: string;
  generation: number;
  strategy: string;
}) {
  useEffect(() => {
    window.clarity?.("set", "variant_id", variantId);
    window.clarity?.("set", "generation", String(generation));
    window.clarity?.("set", "strategy", strategy);
  }, [variantId, generation, strategy]);
  return null;
}

export function trackCtaClick(variantId: string, sectionId: string) {
  window.clarity?.("set", "cta_variant", variantId);
  window.clarity?.("set", "cta_section", sectionId);
  window.clarity?.("event", "cta_click");
}
