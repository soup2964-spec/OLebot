/**
 * Prepares baseline schole.ai replica for Landing Lab — exact Framer page,
 * analytics stripped, section markers + in-page guard for simulation/replay.
 */
import fs from "fs";
import path from "path";
import { injectLabGuard, prepareLabHtml } from "../src/lib/replica/prepare-lab-html";
import { SECTION_MARKERS } from "../src/lib/replica/section-markers";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "baseline", "index.html");
const SRC = path.join(ROOT, "public", "baseline", "schole-original.html");

function loadHtml(): string {
  if (fs.existsSync(SRC)) {
    let html = fs.readFileSync(SRC, "utf8");
    if (html.includes("ScholÃ©")) {
      html = Buffer.from(html, "latin1").toString("utf8");
    }
    return html;
  }
  throw new Error(`Missing ${SRC}. Re-run extraction from transcript.`);
}

function injectSectionMarker(html: string, anchor: string, sectionId: string): string {
  const idx = html.indexOf(anchor);
  if (idx < 0) {
    console.warn(`  ⚠ anchor not found: "${anchor.slice(0, 50)}..."`);
    return html;
  }

  const windowStart = Math.max(0, idx - 2500);
  const window = html.slice(windowStart, idx);
  const tags = [...window.matchAll(/<(section|div|header)(\s[^>]*)?>/g)];
  if (tags.length === 0) {
    const marker = `<div data-section-id="${sectionId}" id="section-${sectionId}" aria-hidden="true" style="scroll-margin-top:80px"></div>`;
    return html.slice(0, idx) + marker + html.slice(idx);
  }
  const lastTag = tags[tags.length - 1];
  const tagStart = windowStart + (lastTag.index ?? 0);
  const fullTag = lastTag[0];
  if (fullTag.includes("data-section-id")) return html;

  const injected = fullTag.replace(
    /^<(section|div|header)/,
    `<$1 data-section-id="${sectionId}" id="section-${sectionId}"`
  );
  return html.slice(0, tagStart) + injected + html.slice(tagStart + fullTag.length);
}

function main() {
  console.log("Preparing baseline HTML (Framer runtime kept)...");
  let html = loadHtml();

  for (const { anchor, id } of SECTION_MARKERS) {
    html = injectSectionMarker(html, anchor, id);
  }

  html = prepareLabHtml(html);
  // No text patches on baseline, but the guard re-marks sections after
  // Framer hydration rebuilds the DOM (replay/highlight need the markers).
  html = injectLabGuard(html, []);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");

  const sourceCopy = path.join(ROOT, "public", "baseline", "lab-source.html");
  fs.writeFileSync(sourceCopy, html, "utf8");
  console.log(`  lab-source: ${sourceCopy} (pristine baseline for variant patching)`);

  const framerScripts = (html.match(/framerusercontent\.com\/sites/gi) ?? []).length;
  const totalScripts = (html.match(/<script/gi) ?? []).length;
  console.log(`Wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
  console.log(`  scripts: ${totalScripts} (${framerScripts} Framer module refs)`);

  for (const { id } of SECTION_MARKERS) {
    console.log(`  ${html.includes(`data-section-id="${id}"`) ? "✓" : "✗"} ${id}`);
  }
}

main();
