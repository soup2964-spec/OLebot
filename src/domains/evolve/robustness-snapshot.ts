import fs from "fs";
import path from "path";
import { GENERATION_0 } from "@/content/variants";
import { getCalibratedPersonaSet } from "@/domains/calibration/store";
import type { Visit } from "@/platform/schema/events";
import type { ExperimentRun } from "@/platform/schema/experiment";
import { heuristicReadPage } from "@/domains/sim/heuristic-reading";
import { sampleVisit } from "@/domains/sim/visit";
import { ThompsonBandit } from "@/domains/sim/bandit";
import { computeMetrics } from "@/domains/sim/metrics";
import { makeRng, pickWeighted } from "@/domains/sim/rng";
import { analyzeGeneration } from "@/platform/stats/bayes";
import type { RobustnessSnapshot } from "./robustness";
import { mean, stdDev } from "./robustness";

export const ROBUSTNESS_JSON_PATH = path.join(process.cwd(), "src", "config", "robustness.json");

interface SeedResult {
  seed: number;
  winnerId: string;
  byVariant: Map<string, { fitness: number; conversionRate: number; rank: number }>;
}

function runGen0Eval(
  seed: number,
  visitsPerSeed: number,
  personas: Awaited<ReturnType<typeof getCalibratedPersonaSet>>["personas"]
): SeedResult {
  const rng = makeRng(seed);
  const pool = [...GENERATION_0];
  const gen = 0;

  const readings = new Map<string, ReturnType<typeof heuristicReadPage>[]>();
  for (const variant of pool) {
    for (const persona of personas) {
      const key = `${variant.id}|${persona.id}`;
      readings.set(key, [
        heuristicReadPage(persona, variant, seed + gen * 100 + persona.id.length),
      ]);
    }
  }

  const bandit = new ThompsonBandit(pool.map((v) => v.id));
  const visits: Visit[] = [];

  for (let i = 0; i < visitsPerSeed; i++) {
    const variantId = bandit.pick(rng);
    const variant = pool.find((v) => v.id === variantId)!;
    const persona = pickWeighted(rng, personas, (p) => p.trafficWeight);
    const rs = readings.get(`${variant.id}|${persona.id}`)!;
    const reading = rs[Math.floor(rng() * rs.length)];
    const visit = sampleVisit(rng, persona, variant, reading, gen, i);
    visits.push(visit);
    bandit.record(variantId, visit.converted);
  }

  const metrics = pool.map((v) => computeMetrics(v, visits));
  const ranked = [...metrics].sort((a, b) => b.fitness - a.fitness);
  const baselineId = pool.some((v) => v.id === "v0-baseline")
    ? "v0-baseline"
    : ranked[ranked.length - 1]!.variantId;

  analyzeGeneration(
    metrics.map((m) => ({
      id: m.variantId,
      conversions: m.conversions,
      visits: m.visits,
      bounceRate: m.bounceRate,
      independentReadings: personas.length,
    })),
    baselineId,
    seed + gen * 7919
  );

  const byVariant = new Map<string, { fitness: number; conversionRate: number; rank: number }>();
  ranked.forEach((m, index) => {
    byVariant.set(m.variantId, {
      fitness: m.fitness,
      conversionRate: m.conversionRate,
      rank: index + 1,
    });
  });

  return { seed, winnerId: ranked[0]!.variantId, byVariant };
}

export function referenceFromRun(run: ExperimentRun | null): {
  referenceSeed: number;
  referenceWinnerId: string;
} | null {
  if (!run) return null;
  const seedMatch = /^run-(\d+)$/.exec(run.id ?? "");
  const gen0 = run.generations?.find((g) => g.generation === 0) ?? run.generations?.[0];
  if (!gen0?.metrics?.length) return null;
  const ranked = [...gen0.metrics].sort((a, b) => b.fitness - a.fitness);
  const referenceSeed = seedMatch ? Number(seedMatch[1]) : null;
  if (referenceSeed == null || !Number.isFinite(referenceSeed)) return null;
  return { referenceSeed, referenceWinnerId: ranked[0]!.variantId };
}

function buildSeeds(n: number, referenceSeed: number): number[] {
  const seeds: number[] = [referenceSeed];
  let candidate = 20260710;
  while (seeds.length < n) {
    if (candidate !== referenceSeed) seeds.push(candidate);
    candidate += 7919;
  }
  return seeds;
}

export async function prepareRobustnessSnapshot(
  run?: ExperimentRun | null
): Promise<RobustnessSnapshot> {
  const visitsPerSeed = Number(process.env.LLM_VISITS_PER_GEN ?? 4800);
  const nSeeds = Number(process.env.ROBUSTNESS_SEEDS ?? 12);
  const personaSet = await getCalibratedPersonaSet();
  const personas = personaSet.personas;

  const fromRun = referenceFromRun(run ?? null);
  const referenceSeed =
    fromRun?.referenceSeed ?? Number(process.env.ROBUSTNESS_REFERENCE_SEED ?? 20260701);
  const referenceWinnerId =
    fromRun?.referenceWinnerId ?? runGen0Eval(referenceSeed, visitsPerSeed, personas).winnerId;

  const seeds = buildSeeds(nSeeds, referenceSeed);
  const results: SeedResult[] = [];
  for (const seed of seeds) {
    results.push(runGen0Eval(seed, visitsPerSeed, personas));
  }

  const variantIds = GENERATION_0.map((v) => v.id);
  const winnerCounts = new Map<string, number>();
  for (const r of results) {
    winnerCounts.set(r.winnerId, (winnerCounts.get(r.winnerId) ?? 0) + 1);
  }

  let modalWinnerId = variantIds[0]!;
  let modalCount = 0;
  for (const [id, count] of winnerCounts) {
    if (count > modalCount) {
      modalCount = count;
      modalWinnerId = id;
    }
  }

  const winnerStabilityPct = (modalCount / results.length) * 100;
  const variants = variantIds.map((variantId) => {
    const fitnessVals: number[] = [];
    const rankVals: number[] = [];
    const convVals: number[] = [];
    let timesRankedFirst = 0;

    for (const r of results) {
      const row = r.byVariant.get(variantId)!;
      fitnessVals.push(row.fitness);
      rankVals.push(row.rank);
      convVals.push(row.conversionRate);
      if (row.rank === 1) timesRankedFirst++;
    }

    return {
      variantId,
      meanFitness: mean(fitnessVals),
      stdFitness: stdDev(fitnessVals),
      meanRank: mean(rankVals),
      timesRankedFirst,
      minConv: Math.min(...convVals),
      maxConv: Math.max(...convVals),
    };
  });

  variants.sort((a, b) => a.meanRank - b.meanRank);

  return {
    version: 1,
    nSeeds: results.length,
    visitsPerSeed,
    referenceSeed,
    referenceWinnerId,
    modalWinnerId,
    winnerStabilityPct,
    generatedAt: new Date().toISOString(),
    variants,
  };
}

export function writeRobustnessSnapshot(snapshot: RobustnessSnapshot): void {
  fs.mkdirSync(path.dirname(ROBUSTNESS_JSON_PATH), { recursive: true });
  fs.writeFileSync(ROBUSTNESS_JSON_PATH, JSON.stringify(snapshot, null, 2), "utf8");
}

export function readRobustnessSnapshot(): RobustnessSnapshot | null {
  try {
    if (!fs.existsSync(ROBUSTNESS_JSON_PATH)) return null;
    return JSON.parse(fs.readFileSync(ROBUSTNESS_JSON_PATH, "utf8")) as RobustnessSnapshot;
  } catch {
    return null;
  }
}

export async function refreshRobustnessSnapshot(
  run?: ExperimentRun | null
): Promise<RobustnessSnapshot> {
  const snapshot = await prepareRobustnessSnapshot(run);
  writeRobustnessSnapshot(snapshot);
  return snapshot;
}
