import type { HtmlReplacement } from "./apply-variant";
import { SECTION_MARKERS } from "./section-markers";

/**
 * Prepare Framer HTML for Landing Lab: keep Framer runtime (layout, responsive,
 * animations) but drop third-party analytics/chat that we don't need in iframes.
 */

function isFramerScript(tag: string): boolean {
  if (/framerusercontent\.com\/sites/i.test(tag)) return true;
  if (/events\.framer\.com/i.test(tag)) return true;
  if (/type=["']framer\/appear["']/i.test(tag)) return true;
  if (
    /__framer__|framer_variant|data-framer-appear|framer\/appearAnimationsContent|framer\/appear/i.test(
      tag
    )
  )
    return true;
  if (/window\.process.*NODE_ENV.*production/i.test(tag)) return true;
  if (/toLocaleString.*toLocaleDateString/i.test(tag)) return true;
  if (/function u\(\).*createElement\("a"\)/i.test(tag)) return true;
  return false;
}

/** Remove GTM/HubSpot/PostHog/etc. Keep Framer JS so the page renders correctly. */
export function stripThirdPartyScripts(html: string): string {
  let out = html.replace(/<script\b[\s\S]*?<\/script>/gi, (tag) =>
    isFramerScript(tag) ? tag : ""
  );

  out = out.replace(/<cs-native-frame-holder[\s\S]*?<\/cs-native-frame-holder>/gi, "");

  return out;
}

export function injectLabStyles(html: string): string {
  const style = `
<style id="landing-lab-overrides">
  [data-section-id].ll-highlight {
    outline: 4px solid rgb(251, 191, 36) !important;
    outline-offset: 4px !important;
  }
</style>`;
  return html.includes("</head>") ? html.replace("</head>", `${style}\n</head>`) : html;
}

export function prepareLabHtml(html: string): string {
  return injectLabStyles(stripThirdPartyScripts(html));
}

/** Remove a previously injected guard (variants are built from the guarded baseline). */
export function stripLabGuard(html: string): string {
  return html.replace(
    /<script id="landing-lab-guard">[\s\S]*?<\/script>/g,
    ""
  );
}

/**
 * In-page safety net, injected into every replica page.
 *
 * The page copy lives in static framer-text elements (h1/h2/p/span) and is
 * patched server-side before this script runs. Framer's hydration JSON carries
 * only route/breakpoint metadata, not copy, so hydration does NOT rebuild text
 * and the static patches persist. This guard is a safety net only: if any
 * baseline anchor text leaks back into a section (e.g. a Framer re-render
 * restores CMS copy from its remote bundle), it re-applies the variant text
 * surgically — replacing just the matching text node, never wiping whole
 * containers and never touching other sections.
 */
export function injectLabGuard(html: string, patches: HtmlReplacement[]): string {
  const patchesBySection = new Map<string, string>(
    patches.map((p) => [p.sectionId as string, p.to])
  );
  const markers = SECTION_MARKERS.map((m) => ({
    ...m,
    // After a successful static patch the baseline anchor is gone — find the
    // section by the replacement text instead.
    alt: patchesBySection.get(m.id) ?? "",
  }));

  const script = `
<script id="landing-lab-guard">
(function () {
  var MARKERS = ${JSON.stringify(markers)};
  var PATCHES = ${JSON.stringify(patches)};

  function needle(s) {
    return s ? s.slice(0, Math.min(s.length, 28)) : "";
  }

  function findTextNode(root, text) {
    if (!text) return null;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.data && node.data.indexOf(text) >= 0) return node;
    }
    return null;
  }

  function containerFor(textNode) {
    var el = textNode.parentElement;
    var best = el;
    var hops = 0;
    while (el && el !== document.body && hops < 6) {
      var tag = el.tagName;
      if (tag === "SECTION" || tag === "HEADER" || tag === "FOOTER") return el;
      if (el.getAttribute && el.getAttribute("data-framer-name")) best = el;
      el = el.parentElement;
      hops++;
    }
    return best;
  }

  function markSections() {
    for (var i = 0; i < MARKERS.length; i++) {
      var m = MARKERS[i];
      if (document.querySelector('[data-section-id="' + m.id + '"]')) continue;
      var tn = findTextNode(document.body, needle(m.anchor)) ||
               findTextNode(document.body, needle(m.alt));
      if (!tn) continue;
      var el = containerFor(tn);
      if (el) {
        el.setAttribute("data-section-id", m.id);
        el.id = "section-" + m.id;
      }
    }
  }

  function patchScope(p) {
    return document.querySelector('[data-section-id="' + p.sectionId + '"]');
  }

  // Replace the baseline anchor substring inside a single text node with the
  // variant text. Surgical: preserves sibling text, nested spans, and styling.
  function replaceInTextNode(node, anchor, to) {
    if (!node || !node.data || !anchor) return false;
    var forms = [anchor];
    var esc = anchor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    if (esc !== anchor) forms.push(esc);
    var changed = false;
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      var idx = node.data.indexOf(f);
      if (idx >= 0) {
        node.data = node.data.slice(0, idx) + to + node.data.slice(idx + f.length);
        changed = true;
        break;
      }
    }
    return changed;
  }

  function replaceSplitHeadline(scope, anchor, to) {
    if (!anchor || anchor.length < 8) return false;
    var changed = false;
    for (var cut = anchor.length - 1; cut >= 4; cut--) {
      var prefix = anchor.slice(0, cut);
      var suffix = anchor.slice(cut);
      if (suffix.length < 4) continue;
      var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) {
        if (!node.data || node.data.indexOf(suffix) < 0) continue;
        var prev = node.previousSibling;
        while (prev && prev.nodeType !== Node.TEXT_NODE && prev.nodeType !== Node.ELEMENT_NODE) {
          prev = prev.previousSibling;
        }
        if (prev && prev.nodeType === Node.ELEMENT_NODE) {
          var inner = prev.querySelector ? prev.querySelector(".framer-text") : null;
          var target = inner && inner.firstChild && inner.firstChild.nodeType === Node.TEXT_NODE
            ? inner.firstChild : (prev.firstChild && prev.firstChild.nodeType === Node.TEXT_NODE ? prev.firstChild : null);
          if (target && target.data && target.data.indexOf(prefix) >= 0) {
            target.data = "";
            node.data = node.data.replace(suffix, to);
            changed = true;
          }
        }
      }
    }
    return changed;
  }

  function applyPatch(p) {
    if (!p.anchor) return;
    var scope = patchScope(p);
    if (!scope) return;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var node;
    var changed = false;
    while ((node = walker.nextNode())) {
      if (replaceInTextNode(node, p.anchor, p.to)) changed = true;
    }
    if (!changed) replaceSplitHeadline(scope, p.anchor, p.to);
  }

  function anchorLeaks(scope, anchor) {
    if (!anchor) return false;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.data && node.data.indexOf(anchor) >= 0) return true;
      var esc = anchor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (esc !== anchor && node.data && node.data.indexOf(esc) >= 0) return true;
    }
    for (var cut = anchor.length - 1; cut >= 4; cut--) {
      var suffix = anchor.slice(cut);
      if (suffix.length < 4) continue;
      walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      while ((node = walker.nextNode())) {
        if (node.data && node.data.indexOf(suffix) >= 0) return true;
      }
    }
    return false;
  }

  function run() {
    markSections();
    for (var i = 0; i < PATCHES.length; i++) applyPatch(PATCHES[i]);
  }

  function needsWork() {
    if (!document.body) return false;
    for (var i = 0; i < PATCHES.length; i++) {
      var p = PATCHES[i];
      var scope = patchScope(p);
      if (!scope) continue;
      if (anchorLeaks(scope, p.anchor)) return true;
    }
    return false;
  }

  function safeRun() {
    try { run(); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeRun);
  } else {
    safeRun();
  }

  // Framer may re-render on resize/route changes; re-check a few times, then stop.
  [50, 300, 1000, 2500, 5000].forEach(function (ms) {
    setTimeout(function () {
      if (needsWork()) safeRun();
    }, ms);
  });

  var debounce;
  var observer = new MutationObserver(function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      if (!needsWork()) {
        observer.disconnect();
        return;
      }
      safeRun();
    }, 80);
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
})();
</script>`;

  return html.includes("</body>")
    ? html.replace("</body>", `${script}\n</body>`)
    : html + script;
}

/** @deprecated kept for compatibility; use injectLabGuard */
export const injectVariantGuard = injectLabGuard;
