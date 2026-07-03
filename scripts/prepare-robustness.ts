/**
 * Precompute gen-0 ranking stability across many RNG seeds.
 * Writes src/config/robustness.json (aggregates only, safe for client import).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { GENERATION_0 } from "../src/config/variants";
import { getCalibratedPersonaSet } from "../src/lib/calibration/store";
import { DEMO_PRELOAD_SEED } from "../src/lib/evolve/demo-preload-constants";
import type { RobustnessSnapshot } from "../src/lib/evolve/robustness";
import { mean, stdDev } from "../src/lib/evolve/robustness";
import { heuristicReadPage } from "../src/lib/sim/heuristic-reading";
import { sampleVisit } from "../src/lib/sim/visit";
import { ThompsonBandit } from "../src/lib/sim/bandit";
import { computeMetrics } from "../src/lib/sim/metrics";
import { makeRng, pickWeighted } from "../src/lib/sim/rng";
import { analyzeGeneration } from "../src/lib/stats/bayes";
import type { Visit } from "../src/lib/schema/events";

const VISITS_PER_SEED = Number(process.env.LLM_VISITS_PER_GEN ?? 4800);
const N_SEEDS = Number(process.env.ROBUSTNESS_SEEDS ?? 12);
const OUT = path.join(process.cwd(), "src", "config", "robustness.json");

interface SeedResult {
  seed: number;
  winnerId: string;
  byVariant: Map<
    string,
    { fitness: number; conversionRate: number; rank: number }
  >;
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

  return {
    seed,
    winnerId: ranked[0]!.variantId,
    byVariant,
  };
}

function buildSeeds(n: number, exclude: number): number[] {
  const seeds: number[] = [];
  let candidate = 20260710;
  while (seeds.length < n) {
    if (candidate !== exclude) seeds.push(candidate);
    candidate += 7919;
  }
  return seeds;
}

async function main() {
  const personaSet = await getCalibratedPersonaSet();
  const personas = personaSet.personas;

  const seeds = buildSeeds(N_SEEDS, DEMO_PRELOAD_SEED);
  console.log(`Robustness check: ${seeds.length} seeds × ${VISITS_PER_SEED} visits...`);

  const results: SeedResult[] = [];
  for (const seed of seeds) {
    results.push(runGen0Eval(seed, VISITS_PER_SEED, personas));
    process.stdout.write(`  seed ${seed} → winner ${results[results.length - 1]!.winnerId}\n`);
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

  const snapshot: RobustnessSnapshot = {
    version: 1,
    nSeeds: results.length,
    visitsPerSeed: VISITS_PER_SEED,
    modalWinnerId,
    winnerStabilityPct,
    generatedAt: new Date().toISOString(),
    variants,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`\nWrote ${OUT}`);
  console.log(`  modal winner: ${modalWinnerId} (${winnerStabilityPct.toFixed(0)}% stability)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
