import { sampleBeta, type Rng } from "./rng";

/**
 * Thompson sampling over variants: Beta(1+conversions, 1+failures) per arm.
 * Traffic shifts toward winners as evidence accumulates, while every arm
 * keeps a nonzero chance of being explored.
 */
export class ThompsonBandit {
  private arms = new Map<string, { conversions: number; failures: number }>();

  constructor(variantIds: string[]) {
    for (const id of variantIds) this.arms.set(id, { conversions: 0, failures: 0 });
  }

  pick(rng: Rng): string {
    let bestId = "";
    let bestSample = -1;
    for (const [id, a] of this.arms) {
      const s = sampleBeta(rng, 1 + a.conversions, 1 + a.failures);
      if (s > bestSample) {
        bestSample = s;
        bestId = id;
      }
    }
    return bestId;
  }

  record(variantId: string, converted: boolean) {
    const a = this.arms.get(variantId);
    if (!a) return;
    if (converted) a.conversions++;
    else a.failures++;
  }

  /** Posterior-mean traffic shares (for allocation snapshots). */
  shares(): Record<string, number> {
    const means = new Map<string, number>();
    for (const [id, a] of this.arms) {
      means.set(id, (1 + a.conversions) / (2 + a.conversions + a.failures));
    }
    // Approximate P(arm is best) via posterior means normalized - cheap and
    // good enough for a display snapshot.
    const total = [...means.values()].reduce((s, v) => s + v, 0);
    const out: Record<string, number> = {};
    for (const [id, m] of means) out[id] = m / total;
    return out;
  }
}
