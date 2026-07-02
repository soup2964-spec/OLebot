import fs from "fs";
import path from "path";

const root = "src";
const skip = ["Nav.tsx", "schole-ui.tsx", "challenge/"];
const files = [];

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(f)) files.push(p);
  }
}
walk(root);

const reps = [
  [/bg-slate-950\/90/g, "bg-white/95"],
  [/bg-slate-950\/60/g, "bg-slate-100"],
  [/bg-slate-950\/50/g, "bg-slate-100"],
  [/bg-slate-950\/40/g, "bg-slate-50"],
  [/bg-slate-950/g, "bg-slate-50"],
  [/bg-slate-900\/80/g, "bg-white"],
  [/bg-slate-900\/60/g, "bg-white"],
  [/bg-slate-900\/40/g, "bg-schole-surface"],
  [/bg-slate-900/g, "bg-schole-surface"],
  [/border-slate-800/g, "border-slate-200"],
  [/border-slate-700/g, "border-slate-300"],
  [/border-slate-900/g, "border-slate-200"],
  [/text-slate-300/g, "text-slate-700"],
  [/text-slate-200/g, "text-slate-800"],
  [/bg-slate-800/g, "bg-slate-100"],
  [/bg-slate-700\/50/g, "bg-slate-200"],
  [/hover:bg-slate-800/g, "hover:bg-slate-100"],
  [/hover:border-slate-700/g, "hover:border-slate-300"],
  [/hover:border-slate-500/g, "hover:border-slate-400"],
  [/bg-indigo-600/g, "bg-schole-primary"],
  [/hover:bg-indigo-500/g, "hover:bg-schole-primary-hover"],
  [/bg-indigo-500\/10/g, "bg-schole-primary/10"],
  [/bg-indigo-500\/5/g, "bg-schole-primary/5"],
  [/border-indigo-500\/40/g, "border-schole-primary/40"],
  [/border-indigo-500\/30/g, "border-schole-primary/30"],
  [/border-indigo-500\/50/g, "border-schole-primary/50"],
  [/border-indigo-500\/60/g, "border-schole-primary/60"],
  [/hover:border-indigo-500\/50/g, "hover:border-schole-primary/50"],
  [/text-indigo-400\/80/g, "text-schole-primary/80"],
  [/text-indigo-400\/90/g, "text-schole-primary/90"],
  [/text-indigo-400/g, "text-schole-primary"],
  [/text-indigo-300/g, "text-schole-primary"],
  [/bg-indigo-500/g, "bg-schole-primary"],
  [/from-indigo-600/g, "from-schole-primary"],
  [/to-indigo-400/g, "to-schole-primary/70"],
  [/to-indigo-500/g, "to-schole-primary/80"],
  [/bg-indigo-400/g, "bg-schole-primary"],
  [/shadow-indigo-600\/25/g, "shadow-schole-primary/25"],
  [/hover:shadow-indigo-500\/30/g, "hover:shadow-schole-primary/30"],
  [/text-indigo-700/g, "text-schole-primary-hover"],
  [/hover:bg-indigo-50/g, "hover:bg-schole-primary/5"],
  [/bg-indigo-50\/60/g, "bg-schole-primary/5"],
  [/min-h-screen bg-slate-50/g, "min-h-screen bg-white"],
];

for (const f of files) {
  if (skip.some((s) => f.includes(s))) continue;
  let s = fs.readFileSync(f, "utf8");
  const o = s;
  for (const [a, b] of reps) s = s.replace(a, b);

  // Headings: text-white -> text-slate-900 unless on colored buttons
  s = s.replace(/className=\{`([^`]*?)`\}/g, (block) => {
    if (/bg-schole-primary|bg-emerald|bg-rose|rounded-full bg-/.test(block)) return block;
    return block.replace(/\btext-white\b/g, "text-slate-900");
  });
  s = s.replace(/className="([^"]*?)"/g, (block) => {
    if (/bg-schole-primary|bg-emerald-600|bg-rose-|text-white hover|text-white shadow|text-white transition hover|text-white disabled/.test(block))
      return block;
    if (/\btext-white\b/.test(block) && /font-(semibold|bold|medium)|text-(lg|xl|2xl|3xl)|h[1-3]/.test(block))
      return block.replace(/\btext-white\b/g, "text-slate-900");
    return block;
  });

  if (s !== o) {
    fs.writeFileSync(f, s);
    console.log("updated", f);
  }
}
