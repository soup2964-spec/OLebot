/** Aggregate seed-robustness snapshot (committed as src/config/robustness.json). */
export interface RobustnessVariantStats {
  variantId: string;
  meanFitness: number;
  stdFitness: number;
  meanRank: number;
  timesRankedFirst: number;
  minConv: number;
  maxConv: number;
}

export interface RobustnessSnapshot {
  version: 1;
  nSeeds: number;
  visitsPerSeed: number;
  modalWinnerId: string;
  winnerStabilityPct: number;
  generatedAt: string;
  variants: RobustnessVariantStats[];
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
