import type { ExperimentRun } from "@/platform/schema/experiment";
import type { PageVariant } from "@/platform/schema/page";
import { buildJudgmentsFromMetrics } from "@/domains/judgment/criteria";
import { PERSONA_SET_V1 } from "@/content/personas";

export type SectionEvidence = {
  sectionId: string;
  headline: string;
  readRate: number;
  exitRate: number;
  avgSentiment: number;
  avgDwellSec: number;
};

export type VariantEvidence = {
  id: string;
  name: string;
  conversionRate: number;
  liftPp: number | null;
  pBest: number | null;
  status: string | null;
  bounceRate: number;
  fitness: number;
  topObjectionFailures: { id: string; count: number }[];
  bestPersona: { name: string; conversionRate: number } | null;
  sections: SectionEvidence[];
  sampleVerdicts: string[];
};

export type ExperimentEvidencePack = {
  experimentNumber: number;
  runId: string;
  baselineId: string;
  winnerVariantId: string | null;
  variants: VariantEvidence[];
  evaluatorPromptBlock: string;
};

const personaNames = new Map(
  PERSONA_SET_V1.personas.map((p) => [p.id, p.name] as const)
);

export function buildEvidencePack(
  run: ExperimentRun,
  experimentNumber?: number
): ExperimentEvidencePack {
  const lastGen = run.generations[run.generations.length - 1];
  if (!lastGen) {
    return {
      experimentNumber: experimentNumber ?? 1,
      runId: run.id,
      baselineId: "v0-baseline",
      winnerVariantId: null,
      variants: [],
      evaluatorPromptBlock: "No generation data.",
    };
  }

  const judgments = buildJudgmentsFromMetrics(lastGen.metrics, lastGen.decisions);
  const baselineId = lastGen.variantIds.includes("v0-baseline")
    ? "v0-baseline"
    : lastGen.metrics[lastGen.metrics.length - 1]?.variantId ?? "v0-baseline";

  const winnerMetric = lastGen.metrics[0];
  const variants: VariantEvidence[] = lastGen.metrics.map((m) => {
    const variant = run.variants.find((v) => v.id === m.variantId);
    const judgment = judgments[m.variantId];
    const visits = lastGen.visits.filter((v) => v.variantId === m.variantId);

    const sections: SectionEvidence[] = (variant?.sections ?? []).map((s) => {
      const ps = m.perSection.find((x) => x.sectionId === s.id);
      return {
        sectionId: s.id,
        headline: s.headline,
        readRate: ps ? ps.reads / Math.max(1, ps.views) : 0,
        exitRate: ps?.exitRate ?? 0,
        avgSentiment: ps?.avgSentiment ?? 0,
        avgDwellSec: ps ? ps.avgDwellMs / 1000 : 0,
      };
    });

    const converted = visits.filter((v) => v.converted).slice(0, 2);
    const lost = visits.filter((v) => !v.converted).slice(0, 2);
    const sampleVerdicts = [...converted, ...lost].map((v) => v.verdict.slice(0, 200));

    let bestPersona: VariantEvidence["bestPersona"] = null;
    for (const [pid, row] of Object.entries(m.byPersona)) {
      if (row.visits === 0) continue;
      const rate = row.conversions / row.visits;
      if (!bestPersona || rate > bestPersona.conversionRate) {
        bestPersona = {
          name: personaNames.get(pid) ?? pid,
          conversionRate: rate,
        };
      }
    }

    return {
      id: m.variantId,
      name: variant?.name ?? m.variantId,
      conversionRate: m.conversionRate,
      liftPp: judgment?.liftPp ?? null,
      pBest: judgment?.pBest ?? null,
      status: judgment?.status ?? null,
      bounceRate: m.bounceRate,
      fitness: m.fitness,
      topObjectionFailures: Object.entries(m.objectionFailures)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ id, count })),
      bestPersona,
      sections,
      sampleVerdicts,
    };
  });

  const pack: ExperimentEvidencePack = {
    experimentNumber: experimentNumber ?? run.generations.length,
    runId: run.id,
    baselineId,
    winnerVariantId: winnerMetric?.variantId ?? null,
    variants,
    evaluatorPromptBlock: "",
  };

  pack.evaluatorPromptBlock = formatEvidenceForPrompt(pack);
  return pack;
}

export function formatEvidenceForPrompt(pack: ExperimentEvidencePack): string {
  const lines = [
    `EXPERIMENT ${pack.experimentNumber} (run ${pack.runId})`,
    `Baseline: ${pack.baselineId}`,
    `Top variant: ${pack.winnerVariantId ?? "none"}`,
    "",
  ];

  for (const v of pack.variants) {
    lines.push(
      `VARIANT ${v.id} "${v.name}"`,
      `  conversion=${(v.conversionRate * 100).toFixed(1)}% lift=${v.liftPp !== null ? `${v.liftPp >= 0 ? "+" : ""}${v.liftPp.toFixed(1)}pp` : "n/a"} pBest=${v.pBest !== null ? `${(v.pBest * 100).toFixed(0)}%` : "n/a"} status=${v.status ?? "n/a"}`,
      `  bounce=${(v.bounceRate * 100).toFixed(0)}% fitness=${v.fitness.toFixed(1)}`,
      `  objections lost: ${v.topObjectionFailures.map((o) => `${o.id}(${o.count})`).join(", ") || "none"}`,
      `  best persona: ${v.bestPersona ? `${v.bestPersona.name} ${(v.bestPersona.conversionRate * 100).toFixed(0)}%` : "n/a"}`
    );
    for (const s of v.sections) {
      lines.push(
        `    [${s.sectionId}] "${s.headline.slice(0, 60)}..." read=${(s.readRate * 100).toFixed(0)}% exit=${(s.exitRate * 100).toFixed(0)}% sentiment=${s.avgSentiment.toFixed(2)}`
      );
    }
    for (const verdict of v.sampleVerdicts.slice(0, 3)) {
      lines.push(`    verdict: "${verdict}"`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
