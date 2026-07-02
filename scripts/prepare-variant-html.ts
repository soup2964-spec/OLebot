/**
 * Builds variant HTML: exact Framer layout + baked-in text swaps + in-page guard
 * so copy survives Framer hydration.
 */
import fs from "fs";
import path from "path";
import { GENERATION_0 } from "../src/config/variants";
import {
  applyVariantToBaselineHtml,
  buildVariantHtmlReplacements,
} from "../src/lib/replica/apply-variant";
import { injectLabGuard, stripLabGuard } from "../src/lib/replica/prepare-lab-html";

const ROOT = path.join(__dirname, "..");
const BASELINE_HTML = path.join(ROOT, "public", "baseline", "index.html");
const OUT_DIR = path.join(ROOT, "public", "baseline", "variants");

function main() {
  if (!fs.existsSync(BASELINE_HTML)) {
    throw new Error(`Missing ${BASELINE_HTML}. Run npm run prepare:baseline first.`);
  }

  const baselineHtml = fs.readFileSync(BASELINE_HTML, "utf8");
  const baselineVariant = GENERATION_0[0];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const variant of GENERATION_0) {
    if (variant.id === "v0-baseline") {
      console.log(`  v0-baseline: control (baseline/index.html)`);
      continue;
    }

    const patches = buildVariantHtmlReplacements(baselineVariant, variant);
    let html = applyVariantToBaselineHtml(baselineHtml, baselineVariant, variant);
    html = injectLabGuard(stripLabGuard(html), patches);

    const outPath = path.join(OUT_DIR, `${variant.id}.html`);
    fs.writeFileSync(outPath, html, "utf8");

    const framerScripts = (html.match(/framerusercontent\.com\/sites/gi) ?? []).length;
    console.log(
      `  ${variant.id}: ${patches.length} swaps, guard injected, ${framerScripts} Framer refs → ${path.relative(ROOT, outPath)}`
    );
  }

  console.log(`\nWrote ${GENERATION_0.length - 1} variant replicas to ${OUT_DIR}`);
}

main();
