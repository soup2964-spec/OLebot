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
 * In-page guard, injected into every replica page.
 *
 * Framer hydration REBUILDS the DOM after load: it restores original CMS copy
 * and strips any attributes we injected into the static HTML (including
 * data-section-id markers). So the guard must not rely on pre-injected markup.
 * Instead it:
 *   1. re-marks sections by locating unique baseline (or already-patched) text
 *   2. re-applies variant text swaps, scoped to the section when possible
 * and repeats whenever the DOM mutates back to baseline copy.
 */
export function injectLabGuard(html: string, patches: HtmlReplacement[]): string {
  const patchesBySection = new Map<string, string>(
    patches.map((p) => [p.sectionId as string, p.to])
  );
  const markers = SECTION_MARKERS.map((m) => ({
    ...m,
    // After a successful patch the baseline anchor is gone — find the section
    // by the replacement text instead.
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
    while (el && el !== document.body) {
      var type = el.getAttribute && el.getAttribute("data-framer-component-type");
      var name = el.getAttribute && el.getAttribute("data-framer-name");
      if (type === "RichTextContainer") {
        el = el.parentElement;
        continue;
      }
      if (
        name === "Heading" ||
        name === "Left" ||
        name === "Description" ||
        name === "Container" ||
        name === "Content"
      ) {
        return el;
      }
      if (el.tagName === "SECTION" || el.tagName === "HEADER" || el.tagName === "FOOTER") {
        return el;
      }
      el = el.parentElement;
    }
    el = textNode.parentElement;
    for (var hops = 0; el && el !== document.body && hops < 6; hops++) {
      el = el.parentElement;
    }
    return el || textNode.parentElement;
  }

  function patchScopes(p) {
    var scopes = [];
    var seen = {};
    function add(el) {
      if (!el || el === document.body || seen[el]) return;
      seen[el] = true;
      scopes.push(el);
      if (el.querySelectorAll) {
        var rtcs = el.querySelectorAll('[data-framer-component-type="RichTextContainer"]');
        for (var i = 0; i < rtcs.length; i++) add(rtcs[i]);
      }
    }

    var primary = document.querySelector('[data-section-id="' + p.sectionId + '"]');
    if (primary) {
      add(primary);
      var up = primary.parentElement;
      for (var u = 0; up && up !== document.body && u < 4; u++) {
        add(up);
        up = up.parentElement;
      }
    }

    if (!primary) {
      var tn =
        findTextNode(document.body, needle(p.anchor)) ||
        (p.to ? findTextNode(document.body, needle(p.to)) : null);
      if (tn) add(containerFor(tn));
    }
    return scopes;
  }

  function scopeText(scope) {
    return scope && scope.textContent ? scope.textContent : "";
  }

  function targetPresent(p) {
    if (!p.to) return true;
    var scopes = patchScopes(p);
    for (var i = 0; i < scopes.length; i++) {
      var text = scopeText(scopes[i]);
      if (text.indexOf(p.to) >= 0) return true;
      var hint = p.to.slice(0, Math.min(p.to.length, 48));
      if (hint.length >= 12 && text.indexOf(hint) >= 0) return true;
    }
    return false;
  }

  function anchorStillPresent(p) {
    if (!p.anchor) return false;
    var scopes = patchScopes(p);
    for (var i = 0; i < scopes.length; i++) {
      if (scopeText(scopes[i]).indexOf(p.anchor) >= 0) return true;
    }
    return false;
  }

  function tryApplyInScope(scope, p) {
    var n = p.anchor ? needle(p.anchor) : "";
    var applied = false;
    var wrotePrimary = false;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var node;

    while ((node = walker.nextNode())) {
      var hit =
        (p.anchor && node.data.indexOf(p.anchor) >= 0) ||
        (n && node.data.indexOf(n) >= 0);
      if (!hit) continue;

      if (p.anchor && node.data.indexOf(p.anchor) >= 0) {
        if (p.to && !wrotePrimary) {
          node.data = node.data.replace(p.anchor, p.to);
          wrotePrimary = true;
        } else {
          node.data = node.data.split(p.anchor).join("");
        }
      } else if (n && node.data.indexOf(n) >= 0) {
        if (p.to && !wrotePrimary) {
          node.data = node.data.replace(n, p.to);
          wrotePrimary = true;
        } else {
          node.data = node.data.split(n).join("");
        }
      } else if (p.to && !wrotePrimary) {
        node.data = p.to;
        wrotePrimary = true;
      } else {
        node.data = "";
      }
      applied = true;
    }
    return applied;
  }

  function applyPatch(p) {
    if (targetPresent(p) && !anchorStillPresent(p)) return true;

    var scopes = patchScopes(p);
    for (var i = 0; i < scopes.length; i++) {
      if (tryApplyInScope(scopes[i], p)) return true;
    }
    return false;
  }

  function markSections() {
    for (var i = 0; i < MARKERS.length; i++) {
      var m = MARKERS[i];
      if (document.querySelector('[data-section-id="' + m.id + '"]')) continue;
      var tn =
        findTextNode(document.body, needle(m.anchor)) ||
        findTextNode(document.body, needle(m.alt));
      if (!tn) continue;
      var el = containerFor(tn);
      if (el) {
        el.setAttribute("data-section-id", m.id);
        el.id = "section-" + m.id;
      }
    }
  }

  function run() {
    markSections();
    for (var i = 0; i < PATCHES.length; i++) applyPatch(PATCHES[i]);
  }

  function needsWork() {
    if (!document.body) return false;
    for (var i = 0; i < PATCHES.length; i++) {
      if (anchorStillPresent(PATCHES[i]) && !targetPresent(PATCHES[i])) return true;
    }
    for (var j = 0; j < MARKERS.length; j++) {
      if (!document.querySelector('[data-section-id="' + MARKERS[j].id + '"]')) return true;
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

  // Framer hydrates asynchronously; sweep aggressively for the first seconds.
  [50, 150, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000].forEach(function (ms) {
    setTimeout(safeRun, ms);
  });

  // Then keep watching: any mutation that restores baseline copy gets repatched.
  var debounce;
  var observer = new MutationObserver(function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      if (!needsWork()) {
        observer.disconnect();
        return;
      }
      safeRun();
    }, 40);
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
