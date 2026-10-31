/**
 * 整组方案的奖级中奖概率与回报分布（Portfolio Payout Distribution）
 *
 * 核心数学逻辑：
 * 1. 无条件概率分布：针对用户方案（N注），精确计数或分组枚举所有可能开奖结果下的中奖注数与总奖金分布。
 * 2. 随机基准对照：计算相同注数独立纯随机选号的分布，证明 E[组合] ≡ E[随机]（期望回报相同，但方差与分布不同）。
 * 3. 条件概率区分：显式区分“若开奖号落在号码池内”的条件保证与无条件真实概率。
 */
import type { LotteryType } from './combinations.ts';
import { getPrizeRules, matchPrizeTier, type PrizeTier } from './prize-rules.ts';

export interface PayoutDistributionOptions {
  type: LotteryType;
  tickets: { reds: number[]; blues: number[] }[];
  addOn?: boolean;
  pool?: number[];
  floatingEstimates?: {
    tier1?: number;
    tier2?: number;
  };
  sampleLimit?: number;
}

export interface TierDistribution {
  id: number;
  name: string;
  probabilityAtLeastOne: number;
  expectedCount: number;
  singleTicketProbability: number;
  randomProbabilityAtLeastOne: number;
}

export interface PortfolioPayoutSummary {
  expectedPayout: number;
  stdDevPayout: number;
  cost: number;
  lossProbability: number;
  breakEvenProbability: number;
}

export interface RandomBaselineComparison {
  expectedPayout: number;
  stdDevPayout: number;
  lossProbability: number;
  breakEvenProbability: number;
}

export interface ConditionalPoolAnalysis {
  poolSize: number;
  poolHitProbability: number;
  guaranteedMinHitTier?: string;
  conditionalDistribution: {
    tierId: number;
    tierName: string;
    probabilityAtLeastOne: number;
    expectedCount: number;
  }[];
}

export interface PortfolioPayoutResult {
  type: LotteryType;
  ticketCount: number;
  cost: number;
  tiers: TierDistribution[];
  portfolio: PortfolioPayoutSummary;
  randomBaseline: RandomBaselineComparison;
  conditional?: ConditionalPoolAnalysis;
  explanation: {
    evNote: string;
    conditionNote?: string;
  };
  method: 'exact' | 'monte-carlo';
  marginOfError?: number;
}

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - k + i)) / i;
  }
  return Math.round(c);
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function validateTickets(type: LotteryType, tickets: { reds: number[]; blues: number[] }[]) {
  if (!tickets || tickets.length === 0) {
    throw new Error('方案至少需要包含一注号码');
  }
  const redCount = type === 'SSQ' ? 6 : 5;
  const blueCount = type === 'SSQ' ? 1 : 2;
  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;

  for (const t of tickets) {
    if (!t.reds || t.reds.length !== redCount || !t.blues || t.blues.length !== blueCount) {
      throw new Error(`号码数量不正确：${type} 需要 ${redCount} 红球和 ${blueCount} 蓝球`);
    }
    for (const r of t.reds) {
      if (!Number.isInteger(r) || r < 1 || r > maxRed) {
        throw new Error(`红球号码超出范围 (1-${maxRed})`);
      }
    }
    for (const b of t.blues) {
      if (!Number.isInteger(b) || b < 1 || b > maxBlue) {
        throw new Error(`蓝球号码超出范围 (1-${maxBlue})`);
      }
    }
    if (new Set(t.reds).size !== redCount) {
      throw new Error('同一注内红球号码不能重复');
    }
    if (new Set(t.blues).size !== blueCount) {
      throw new Error('同一注内蓝球号码不能重复');
    }
  }
}

function getTierPrize(
  tier: PrizeTier,
  addOn: boolean,
  floatingEstimates?: { tier1?: number; tier2?: number }
): number {
  let basePrize = 0;
  if (!tier.floating) {
    basePrize = tier.fixedPrize ?? 0;
  } else {
    if (tier.id === 1) {
      basePrize = floatingEstimates?.tier1 ?? (tier.cap ?? 5_000_000);
    } else if (tier.id === 2) {
      basePrize = floatingEstimates?.tier2 ?? 200_000;
    } else {
      basePrize = 100_000;
    }
  }
  if (addOn && tier.addOnRatio > 0) {
    return basePrize * (1 + tier.addOnRatio);
  }
  return basePrize;
}

/**
 * 计算同注数纯随机独立选号的基准对比
 */
export function calculateRandomBaseline(
  type: LotteryType,
  ticketCount: number,
  cost: number,
  addOn: boolean,
  floatingEstimates?: { tier1?: number; tier2?: number }
): RandomBaselineComparison {
  const rules = getPrizeRules(type);
  const tierPrizes = rules.tiers.map(t => ({
    tier: t,
    prob: t.probability,
    prize: getTierPrize(t, addOn, floatingEstimates),
  }));

  // 单注期望回报与方差
  let e1 = 0;
  let m2_1 = 0;
  for (const { prob, prize } of tierPrizes) {
    e1 += prob * prize;
    m2_1 += prob * (prize * prize);
  }
  const var1 = m2_1 - e1 * e1;

  const expectedPayout = ticketCount * e1;
  const stdDevPayout = Math.sqrt(Math.max(0, ticketCount * var1));

  // 亏损概率：利用 DP 计算 N 注独立彩票总奖金 < cost 的概率
  // 单注可能奖金分布（截断到 < cost）
  const winProbTotal = tierPrizes.reduce((s, x) => s + x.prob, 0);
  const p0 = Math.max(0, 1 - winProbTotal);

  // 找出所有奖金 < cost 的奖级
  const cheapPrizes = tierPrizes.filter(t => t.prize < cost);

  let dp = new Map<number, number>();
  dp.set(0, 1);

  for (let step = 0; step < ticketCount; step++) {
    const nextDp = new Map<number, number>();
    for (const [amt, prob] of dp.entries()) {
      // 没中奖（奖金 0）
      const pZero = (nextDp.get(amt) || 0) + prob * p0;
      nextDp.set(amt, pZero);

      // 中了小于 cost 的奖级
      for (const cp of cheapPrizes) {
        const nextAmt = amt + cp.prize;
        if (nextAmt < cost) {
          nextDp.set(nextAmt, (nextDp.get(nextAmt) || 0) + prob * cp.prob);
        }
      }
    }
    dp = nextDp;
  }

  let lossProbability = 0;
  for (const prob of dp.values()) {
    lossProbability += prob;
  }
  lossProbability = Math.min(1, Math.max(0, lossProbability));
  const breakEvenProbability = Math.min(1, Math.max(0, 1 - lossProbability));

  return {
    expectedPayout,
    stdDevPayout,
    lossProbability,
    breakEvenProbability,
  };
}

/**
 * 计算整组方案的奖级中奖概率与回报分布
 */
export function getPortfolioPayoutDistribution(
  options: PayoutDistributionOptions
): PortfolioPayoutResult {
  const { type, tickets, addOn = false, pool, floatingEstimates, sampleLimit = 300_000 } = options;

  validateTickets(type, tickets);

  const rules = getPrizeRules(type);
  const costPerTicket = addOn && rules.addOnCost !== null ? rules.ticketCost + rules.addOnCost : rules.ticketCost;
  const cost = tickets.length * costPerTicket;

  const redCount = type === 'SSQ' ? 6 : 5;
  const blueCount = type === 'SSQ' ? 1 : 2;
  const totalReds = type === 'SSQ' ? 33 : 35;
  const totalBlues = type === 'SSQ' ? 16 : 12;

  // 1. 统计方案中出现的所有红球集合 U_red
  const redSet = new Set<number>();
  for (const t of tickets) {
    for (const r of t.reds) redSet.add(r);
  }
  const uReds = Array.from(redSet).sort((a, b) => a - b);
  const mReds = uReds.length;

  // 2. 生成所有蓝球可能开奖组合
  const allBlues = Array.from({ length: totalBlues }, (_, i) => i + 1);
  const allBlueDraws: number[][] = getCombinations(allBlues, blueCount);
  const totalBlueDraws = allBlueDraws.length;

  // 3. 估算全量精确枚举所需的子集状态数
  let totalSubsets = 0;
  for (let k = 0; k <= Math.min(redCount, mReds); k++) {
    totalSubsets += comb(mReds, k);
  }
  const totalStates = totalSubsets * totalBlueDraws;

  const totalPossibleRedDraws = comb(totalReds, redCount);
  const totalSampleSpace = totalPossibleRedDraws * totalBlueDraws;

  // 奖级奖金映射
  const prizeMap = new Map<number, number>();
  for (const tier of rules.tiers) {
    prizeMap.set(tier.id, getTierPrize(tier, addOn, floatingEstimates));
  }

  // 准备统计结构
  const tierWonCount = new Map<number, number>();
  const tierTotalHits = new Map<number, number>();
  for (const tier of rules.tiers) {
    tierWonCount.set(tier.id, 0);
    tierTotalHits.set(tier.id, 0);
  }

  let expectedPayout = 0;
  let expectedPayoutSq = 0;
  let lossWeight = 0;
  let breakEvenWeight = 0;
  let method: 'exact' | 'monte-carlo' = 'exact';
  let marginOfError: number | undefined = undefined;

  if (totalStates <= sampleLimit) {
    // 方案 A: 基于 Vandermonde 子集分组的精确数学枚举
    for (let k = 0; k <= Math.min(redCount, mReds); k++) {
      const outsideWays = comb(totalReds - mReds, redCount - k);
      if (outsideWays === 0) continue;

      const redSubsets = getCombinations(uReds, k);
      for (const s of redSubsets) {
        const sSet = new Set(s);
        // 计算每个 ticket 的红球命中数
        const ticketRedHits = tickets.map(t => {
          let hits = 0;
          for (const r of t.reds) {
            if (sSet.has(r)) hits++;
          }
          return hits;
        });

        // 遍历所有蓝球开奖
        for (const bDraw of allBlueDraws) {
          const bSet = new Set(bDraw);
          let drawPayout = 0;
          const wonTierInDraw = new Set<number>();

          for (let i = 0; i < tickets.length; i++) {
            const rHits = ticketRedHits[i];
            let bHits = 0;
            for (const b of tickets[i].blues) {
              if (bSet.has(b)) bHits++;
            }
            const tier = matchPrizeTier(type, rHits, bHits);
            if (tier) {
              wonTierInDraw.add(tier.id);
              tierTotalHits.set(tier.id, tierTotalHits.get(tier.id)! + outsideWays);
              drawPayout += prizeMap.get(tier.id)!;
            }
          }

          for (const tId of wonTierInDraw) {
            tierWonCount.set(tId, tierWonCount.get(tId)! + outsideWays);
          }

          expectedPayout += outsideWays * drawPayout;
          expectedPayoutSq += outsideWays * (drawPayout * drawPayout);
          if (drawPayout < cost) {
            lossWeight += outsideWays;
          } else {
            breakEvenWeight += outsideWays;
          }
        }
      }
    }

    expectedPayout /= totalSampleSpace;
    expectedPayoutSq /= totalSampleSpace;
  } else {
    // 方案 B: 规模过大时采用 100,000 次均匀随机抽样蒙特卡洛估计
    method = 'monte-carlo';
    const sampleSize = 100_000;
    marginOfError = 1.96 * Math.sqrt(0.25 / sampleSize);

    const allReds = Array.from({ length: totalReds }, (_, i) => i + 1);

    for (let s = 0; s < sampleSize; s++) {
      // 随机抽取开奖红球
      const drawReds: number[] = [];
      const used = new Set<number>();
      while (drawReds.length < redCount) {
        const r = allReds[Math.floor(Math.random() * totalReds)];
        if (!used.has(r)) {
          used.add(r);
          drawReds.push(r);
        }
      }
      // 随机抽取开奖蓝球
      const drawBlues: number[] = [];
      const usedB = new Set<number>();
      while (drawBlues.length < blueCount) {
        const b = allBlues[Math.floor(Math.random() * totalBlues)];
        if (!usedB.has(b)) {
          usedB.add(b);
          drawBlues.push(b);
        }
      }

      const rDrawSet = new Set(drawReds);
      const bDrawSet = new Set(drawBlues);
      let drawPayout = 0;
      const wonTierInDraw = new Set<number>();

      for (const t of tickets) {
        let rHits = 0;
        for (const r of t.reds) if (rDrawSet.has(r)) rHits++;
        let bHits = 0;
        for (const b of t.blues) if (bDrawSet.has(b)) bHits++;

        const tier = matchPrizeTier(type, rHits, bHits);
        if (tier) {
          wonTierInDraw.add(tier.id);
          tierTotalHits.set(tier.id, tierTotalHits.get(tier.id)! + 1);
          drawPayout += prizeMap.get(tier.id)!;
        }
      }

      for (const tId of wonTierInDraw) {
        tierWonCount.set(tId, tierWonCount.get(tId)! + 1);
      }

      expectedPayout += drawPayout;
      expectedPayoutSq += drawPayout * drawPayout;
      if (drawPayout < cost) {
        lossWeight += 1;
      } else {
        breakEvenWeight += 1;
      }
    }

    const divisor = sampleSize;
    expectedPayout /= divisor;
    expectedPayoutSq /= divisor;
    for (const tier of rules.tiers) {
      tierWonCount.set(tier.id, (tierWonCount.get(tier.id)! / divisor) * totalSampleSpace);
      tierTotalHits.set(tier.id, (tierTotalHits.get(tier.id)! / divisor) * totalSampleSpace);
    }
    lossWeight = (lossWeight / divisor) * totalSampleSpace;
    breakEvenWeight = (breakEvenWeight / divisor) * totalSampleSpace;
  }

  const varPayout = Math.max(0, expectedPayoutSq - expectedPayout * expectedPayout);
  const stdDevPayout = Math.sqrt(varPayout);

  const lossProbability = lossWeight / totalSampleSpace;
  const breakEvenProbability = breakEvenWeight / totalSampleSpace;

  // 4. 计算各奖级概率与纯随机基准比较
  const tierResults: TierDistribution[] = rules.tiers.map(tier => {
    const probAtLeastOne = tierWonCount.get(tier.id)! / totalSampleSpace;
    const expCount = tierTotalHits.get(tier.id)! / totalSampleSpace;
    const randomAtLeastOne = 1 - Math.pow(1 - tier.probability, tickets.length);

    return {
      id: tier.id,
      name: tier.name,
      probabilityAtLeastOne: probAtLeastOne,
      expectedCount: expCount,
      singleTicketProbability: tier.probability,
      randomProbabilityAtLeastOne: randomAtLeastOne,
    };
  });

  // 5. 计算同注数纯随机独立选号的统计基准
  const randomBaseline = calculateRandomBaseline(type, tickets.length, cost, addOn, floatingEstimates);

  // 6. 如果用户指定了号码池 pool，计算条件概率
  let conditional: ConditionalPoolAnalysis | undefined = undefined;
  if (pool && pool.length >= redCount) {
    const poolClean = Array.from(new Set(pool)).filter(n => n >= 1 && n <= totalReds);
    if (poolClean.length >= redCount) {
      const poolSize = poolClean.length;
      const condRedDraws = getCombinations(poolClean, redCount);
      const totalCondDraws = condRedDraws.length * totalBlueDraws;
      const poolHitProbability = condRedDraws.length / totalPossibleRedDraws;

      const condWonCount = new Map<number, number>();
      const condTotalHits = new Map<number, number>();
      for (const tier of rules.tiers) {
        condWonCount.set(tier.id, 0);
        condTotalHits.set(tier.id, 0);
      }

      let minGuaranteedTierId: number | null = null;

      for (const rDraw of condRedDraws) {
        const rSet = new Set(rDraw);
        for (const bDraw of allBlueDraws) {
          const bSet = new Set(bDraw);
          const wonTierInDraw = new Set<number>();
          let bestTierIdInDraw = 999;

          for (const t of tickets) {
            let rHits = 0;
            for (const r of t.reds) if (rSet.has(r)) rHits++;
            let bHits = 0;
            for (const b of t.blues) if (bSet.has(b)) bHits++;

            const tier = matchPrizeTier(type, rHits, bHits);
            if (tier) {
              wonTierInDraw.add(tier.id);
              condTotalHits.set(tier.id, condTotalHits.get(tier.id)! + 1);
              if (tier.id < bestTierIdInDraw) {
                bestTierIdInDraw = tier.id;
              }
            }
          }

          for (const tId of wonTierInDraw) {
            condWonCount.set(tId, condWonCount.get(tId)! + 1);
          }

          if (bestTierIdInDraw !== 999) {
            if (minGuaranteedTierId === null || bestTierIdInDraw > minGuaranteedTierId) {
              minGuaranteedTierId = bestTierIdInDraw;
            }
          }
        }
      }

      const conditionalDistribution = rules.tiers.map(tier => ({
        tierId: tier.id,
        tierName: tier.name,
        probabilityAtLeastOne: condWonCount.get(tier.id)! / totalCondDraws,
        expectedCount: condTotalHits.get(tier.id)! / totalCondDraws,
      }));

      const guaranteedTier = minGuaranteedTierId !== null ? rules.tiers.find(t => t.id === minGuaranteedTierId)?.name : undefined;

      conditional = {
        poolSize,
        poolHitProbability,
        guaranteedMinHitTier: guaranteedTier ? `条件保证至少命中 ${guaranteedTier}` : undefined,
        conditionalDistribution,
      };
    }
  }

  const conditionNote = conditional
    ? `缩水矩阵的保奖保证仅在开奖红球全部落在所选号码池（共 ${conditional.poolSize} 个号）内时生效；此前提开出的真实概率约为 ${(conditional.poolHitProbability * 100).toFixed(4)}%（约 1 / ${Math.round(1 / conditional.poolHitProbability)}）。`
    : undefined;

  return {
    type,
    ticketCount: tickets.length,
    cost,
    tiers: tierResults,
    portfolio: {
      expectedPayout,
      stdDevPayout,
      cost,
      lossProbability,
      breakEvenProbability,
    },
    randomBaseline,
    conditional,
    explanation: {
      evNote: '选号策略与缩水矩阵不改变总体理论期望回报（EV），但会改变中奖与亏损的概率分布形状（方差与集中度）。',
      conditionNote,
    },
    method,
    marginOfError,
  };
}
