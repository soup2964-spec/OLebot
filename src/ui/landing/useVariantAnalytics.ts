"use client";

import { useEffect, useRef } from "react";
import { isCtaSection } from "@/lab/analytics/posthog-events";
import type { VariantContext } from "@/lab/analytics/track";
import {
  identifyVariant,
  trackCtaViewed,
  trackPageExit,
  trackScrollDepth,
  trackSectionViewed,
} from "@/lab/analytics/track";

const MILESTONES = [25, 50, 75, 100];
const CONVERTED_KEY = "ll_converted";

/**
 * Instruments a variant page (or iframe document) with scroll-depth milestones,
 * CTA exposure, and enriched exit events — aligned to the GTM Challenge PostHog plan.
 */
export function useVariantAnalytics(
  ctx: VariantContext,
  scrollRoot?: HTMLElement | null
) {
  const fired = useRef(new Set<number>());
  const maxScroll = useRef(0);
  const startMs = useRef(Date.now());
  const sectionsSeen = useRef(new Set<string>());
  const ctaViewed = useRef(new Set<string>());

  useEffect(() => {
    fired.current = new Set();
    maxScroll.current = 0;
    startMs.current = Date.now();
    sectionsSeen.current = new Set();
    ctaViewed.current = new Set();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(CONVERTED_KEY);
    }
    identifyVariant(ctx);
  }, [
    ctx.variantId,
    ctx.generation,
    ctx.strategy,
    ctx.experimentNumber,
    ctx.challenge,
  ]);

  useEffect(() => {
    const root = scrollRoot ?? document.documentElement;
    const getScrollable = () => (scrollRoot ? scrollRoot : document.documentElement);
    const getDepth = () => {
      const el = getScrollable();
      const scrollTop = scrollRoot ? el.scrollTop : window.scrollY;
      const scrollHeight = scrollRoot
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return 0;
      return Math.min(1, scrollTop / scrollHeight);
    };

    const onScroll = () => {
      const depth = getDepth();
      maxScroll.current = Math.max(maxScroll.current, depth);
      const pct = Math.round(depth * 100);
      for (const m of MILESTONES) {
        if (pct >= m && !fired.current.has(m)) {
          fired.current.add(m);
          trackScrollDepth(ctx, m);
        }
      }
    };

    const target = scrollRoot ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onExit = () => {
      const converted =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(CONVERTED_KEY) === "1";
      trackPageExit(ctx, maxScroll.current, Date.now() - startMs.current, {
        converted,
        sectionsViewedCount: sectionsSeen.current.size,
      });
    };
    window.addEventListener("pagehide", onExit);

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onExit);
    };
  }, [ctx, scrollRoot]);

  useEffect(() => {
    const rootEl = scrollRoot ?? document;
    const seen = sectionsSeen.current;
    const ctaSeen = ctaViewed.current;
    const nodes = rootEl.querySelectorAll<HTMLElement>("[data-section-id]");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
          const el = entry.target as HTMLElement;
          const sectionId = el.dataset.sectionId;
          if (!sectionId || seen.has(sectionId)) continue;
          seen.add(sectionId);
          trackSectionViewed(ctx, sectionId);

          if (isCtaSection(sectionId) && !ctaSeen.has(sectionId)) {
            ctaSeen.add(sectionId);
            const ctaLabel =
              el.querySelector("button, a[href*='cal.com'], a[href*='demo']")
                ?.textContent?.trim() || undefined;
            trackCtaViewed(ctx, sectionId, ctaLabel);
          }
        }
      },
      { threshold: [0.35, 0.5] }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ctx, scrollRoot]);
}

/** Mark session converted before page_exit fires (called from CTA handlers). */
export function markSessionConverted() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(CONVERTED_KEY, "1");
  }
}
