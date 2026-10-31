import { CALIBRATION_DATA } from './calibrated-weights.ts';

export function combine<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  if (k === arr.length) return [arr];
  if (k > arr.length) return [];

  const first = arr[0];
  const rest = arr.slice(1);
  const withFirst = combine(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combine(rest, k);

  return [...withFirst, ...withoutFirst];
}

// SSQ: 6 Red, 1 Blue
// DLT: 5 Front, 2 Back

export type LotteryType = 'SSQ' | 'DLT';
export type WheelingMode = 'FULL' | 'M6G5' | 'M6G4' | 'M5G5' | 'M5G4';

export function getWheelingModes(type: LotteryType): { id: WheelingMode; name: string; desc: string }[] {
  return type === 'SSQ' ? [
    { id: 'FULL', name: '全复式', desc: '生成所有组合' },
    { id: 'M6G5', name: '中6保5', desc: '号码池中6个红球时，至少1注中5个' },
    { id: 'M6G4', name: '中6保4', desc: '号码池中6个红球时，至少1注中4个' },
    { id: 'M5G5', name: '中5保5', desc: '号码池中5个红球时，至少1注中5个' },
  ] : [
    { id: 'FULL', name: '全复式', desc: '生成所有组合' },
    { id: 'M5G5', name: '中5保5', desc: '号码池中5个前区号码时，至少1注中5个' },
    { id: 'M5G4', name: '中5保4', desc: '号码池中5个前区号码时，至少1注中4个' },
  ];
}

function modeTargets(type: LotteryType, mode: WheelingMode): { matches: number; guarantee: number } {
  if (!getWheelingModes(type).some(item => item.id === mode)) throw new Error('Invalid wheeling mode for lottery type');
  if (mode === 'FULL') return type === 'SSQ' ? { matches: 6, guarantee: 6 } : { matches: 5, guarantee: 5 };
  if (mode === 'M6G5') return { matches: 6, guarantee: 5 };
  if (mode === 'M6G4') return { matches: 6, guarantee: 4 };
  if (mode === 'M5G5') return { matches: 5, guarantee: 5 };
  return { matches: 5, guarantee: 4 };
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i;
  return Math.round(result);
}

function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Coverage of the final tickets, considering only red/front numbers. */
export function getCoverage(type: LotteryType, pool: number[], mode: WheelingMode, results: { reds: number[]; blues: number[] }[]) {
  const { matches, guarantee } = modeTargets(type, mode);
  const outcomes = combine(pool, matches);
  const tickets = [...new Map(results.map(result => [result.reds.join(','), result.reds])).values()];
  const covered = outcomes.filter(outcome => tickets.some(ticket => outcome.filter(n => ticket.includes(n)).length >= guarantee)).length;
  return { matches, guarantee, covered, total: outcomes.length };
}

export interface CoverageTierBreakdown {
  minHit: number;
  minTickets: number;
  maxTickets: number;
  avgTickets: number;
  coveredOutcomes: number;
  totalOutcomes: number;
}

/** Detailed breakdown of guaranteed and expected hits across all m-match outcomes in the pool. */
export function getCoverageBreakdown(
  type: LotteryType,
  pool: number[],
  mode: WheelingMode,
  results: { reds: number[]; blues: number[] }[]
): CoverageTierBreakdown[] {
  const { matches } = modeTargets(type, mode);
  const reqA = type === 'SSQ' ? 6 : 5;
  const outcomes = combine(pool, matches);
  const tickets = [...new Map(results.map(result => [result.reds.join(','), result.reds])).values()];
  const tiers: number[] = [];
  for (let h = Math.min(reqA, matches); h >= 3; h--) tiers.push(h);

  if (outcomes.length === 0 || tickets.length === 0) {
    return tiers.map(minHit => ({
      minHit,
      minTickets: 0,
      maxTickets: 0,
      avgTickets: 0,
      coveredOutcomes: 0,
      totalOutcomes: outcomes.length,
    }));
  }

  const indexByNum = new Map<number, number>();
  pool.forEach((n, idx) => indexByNum.set(n, idx));

  const useBitmask = pool.length <= 30;
  const ticketMasks = useBitmask
    ? tickets.map(t => t.reduce((acc, n) => acc | (1 << (indexByNum.get(n) ?? 0)), 0))
    : [];
  const outcomeMasks = useBitmask
    ? outcomes.map(o => o.reduce((acc, n) => acc | (1 << (indexByNum.get(n) ?? 0)), 0))
    : [];

  return tiers.map(minHit => {
    let minTickets = Infinity;
    let maxTickets = 0;
    let sumTickets = 0;
    let coveredOutcomes = 0;

    for (let i = 0; i < outcomes.length; i++) {
      let count = 0;
      if (useBitmask) {
        const oMask = outcomeMasks[i];
        for (let j = 0; j < ticketMasks.length; j++) {
          if (popcount32(ticketMasks[j] & oMask) >= minHit) count++;
        }
      } else {
        const outcome = outcomes[i];
        for (const ticket of tickets) {
          if (outcome.filter(n => ticket.includes(n)).length >= minHit) count++;
        }
      }
      if (count < minTickets) minTickets = count;
      if (count > maxTickets) maxTickets = count;
      sumTickets += count;
      if (count > 0) coveredOutcomes++;
    }

    return {
      minHit,
      minTickets: minTickets === Infinity ? 0 : minTickets,
      maxTickets,
      avgTickets: Number((sumTickets / outcomes.length).toFixed(2)),
      coveredOutcomes,
      totalOutcomes: outcomes.length,
    };
  });
}

/** Full ordinary-ticket count before optional reduction or filtering. */
export function getCombinationEstimate(type: LotteryType, countA: number, countB: number, mode: WheelingMode) {
  if (type !== 'SSQ' && type !== 'DLT') throw new Error('未知彩票类型');
  const { matches, guarantee } = modeTargets(type, mode);
  const reqA = type === 'SSQ' ? 6 : 5;
  const reqB = type === 'SSQ' ? 1 : 2;
  if (!Number.isInteger(countA) || countA < 0 || countA > (type === 'SSQ' ? 33 : 35) ||
      !Number.isInteger(countB) || countB < 0 || countB > (type === 'SSQ' ? 16 : 12)) throw new Error('号码池数量无效');
  const candidates = countA < reqA ? 0 : choose(countA, reqA);
  const outcomes = countA < matches ? 0 : choose(countA, matches);
  const blueCombs = countB < reqB ? 0 : choose(countB, reqB);
  const fullCount = candidates * blueCombs;

  // Bitwise greedy covering scans remaining outcomes against candidates; cap at countA <= 18 (or work <= 4e8).
  const maxCoverPerTicket = Math.max(1, choose(reqA, guarantee) * choose(Math.max(0, countA - reqA), matches - guarantee));
  const minWheelTickets = mode === 'FULL' ? candidates : Math.ceil(outcomes / maxCoverPerTicket);
  const work = mode === 'FULL' ? candidates : candidates * outcomes;
  const maxWork = 350_000_000;

  const reason = fullCount && (work > maxWork || (mode !== 'FULL' && countA > 18))
    ? '计算规模过大，请减少红球或前区号码。'
    : (mode === 'FULL' ? fullCount > 500 : minWheelTickets * blueCombs > 500)
      ? '输出上限为 500 注，请减少号码池。'
      : null;

  return { fullCount, fullCost: fullCount * 2, allowed: reason === null, reason };
}

export interface FilterConditions {
  minSum?: number;
  maxSum?: number;
  maxConsecutive?: number;
  oddEvenRatio?: [number, number]; // [odds, evens]
  minAC?: number;
  maxAC?: number;
}

/**
 * Calculate Arithmetic Complexity (AC value) of a combination.
 * AC = (number of distinct positive pairwise differences) - (k - 1)
 */
export function calculateAC(comb: number[]): number {
  if (comb.length <= 1) return 0;
  const diffs = new Set<number>();
  for (let i = 0; i < comb.length; i++) {
    for (let j = i + 1; j < comb.length; j++) {
      diffs.add(Math.abs(comb[i] - comb[j]));
    }
  }
  return Math.max(0, diffs.size - (comb.length - 1));
}

export function getMaxConsecutiveLength(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  let currentLen = 1;
  let maxLen = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentLen++;
      if (currentLen > maxLen) maxLen = currentLen;
    } else if (sorted[i] !== sorted[i - 1]) {
      currentLen = 1;
    }
  }
  return maxLen;
}

export function isConsecutive(arr: number[], maxLen: number): boolean {
  return getMaxConsecutiveLength(arr) >= maxLen;
}

export function filterCombination(comb: number[], conditions: FilterConditions): boolean {
  if (conditions.minSum !== undefined || conditions.maxSum !== undefined) {
    const sum = comb.reduce((a, b) => a + b, 0);
    if (conditions.minSum !== undefined && sum < conditions.minSum) return false;
    if (conditions.maxSum !== undefined && sum > conditions.maxSum) return false;
  }

  if (conditions.maxConsecutive !== undefined) {
    if (isConsecutive(comb, conditions.maxConsecutive)) return false;
  }

  if (conditions.oddEvenRatio) {
    const odds = comb.filter((n) => n % 2 !== 0).length;
    const evens = comb.filter((n) => n % 2 === 0).length;
    if (odds !== conditions.oddEvenRatio[0] || evens !== conditions.oddEvenRatio[1]) {
      return false;
    }
  }

  if (conditions.minAC !== undefined || conditions.maxAC !== undefined) {
    const ac = calculateAC(comb);
    if (conditions.minAC !== undefined && ac < conditions.minAC) return false;
    if (conditions.maxAC !== undefined && ac > conditions.maxAC) return false;
  }

  return true;
}

/**
 * Bitwise Greedy Covering Algorithm for Rotation Matrix (Wheeling System)
 * @param pool The selected numbers pool
 * @param k Size of each ticket (6 for SSQ, 5 for DLT)
 * @param m Condition: number of matches in pool (usually 6 or 5)
 * @param t Guarantee: guarantee at least t matches
 * @param onProgress Optional progress callback
 * @param candidateUniverse Optional pre-filtered candidate tickets
 */
export function generateRotationMatrix(
  pool: number[],
  k: number,
  m: number,
  t: number,
  onProgress?: (fraction: number) => void,
  candidateUniverse?: number[][]
): number[][] {
  const universe = candidateUniverse ?? combine(pool, k);
  const draws = combine(pool, m);
  if (universe.length === 0 || draws.length === 0) return [];

  const indexByNum = new Map<number, number>();
  pool.forEach((n, idx) => indexByNum.set(n, idx));

  const toMask = (arr: number[]) => {
    let mask = 0;
    for (let i = 0; i < arr.length; i++) {
      mask |= 1 << (indexByNum.get(arr[i]) ?? 0);
    }
    return mask;
  };

  const ticketMasks = new Int32Array(universe.length);
  for (let i = 0; i < universe.length; i++) ticketMasks[i] = toMask(universe[i]);

  const uncoveredMasks = new Int32Array(draws.length);
  for (let i = 0; i < draws.length; i++) uncoveredMasks[i] = toMask(draws[i]);
  let uncoveredCount = draws.length;

  const usedTicket = new Uint8Array(universe.length);
  const selected: number[][] = [];
  const totalDraws = draws.length;

  // Theoretical maximum draws a single ticket can cover in one step
  const maxPossiblePerStep = choose(k, t) * choose(Math.max(0, pool.length - k), m - t);

  while (uncoveredCount > 0) {
    let bestTicketIdx = -1;
    let maxNewCovered = 0;

    for (let c = 0; c < universe.length; c++) {
      if (usedTicket[c]) continue;
      const tMask = ticketMasks[c];
      let count = 0;
      for (let d = 0; d < uncoveredCount; d++) {
        if (popcount32(tMask & uncoveredMasks[d]) >= t) {
          count++;
        }
      }
      if (count > maxNewCovered) {
        maxNewCovered = count;
        bestTicketIdx = c;
        if (maxNewCovered >= uncoveredCount || (maxPossiblePerStep > 0 && maxNewCovered >= maxPossiblePerStep)) {
          break;
        }
      }
    }

    if (bestTicketIdx < 0 || maxNewCovered === 0) break;

    usedTicket[bestTicketIdx] = 1;
    selected.push(universe[bestTicketIdx]);

    const chosenMask = ticketMasks[bestTicketIdx];
    let writeIdx = 0;
    for (let d = 0; d < uncoveredCount; d++) {
      if (popcount32(chosenMask & uncoveredMasks[d]) < t) {
        uncoveredMasks[writeIdx++] = uncoveredMasks[d];
      }
    }
    uncoveredCount = writeIdx;
    onProgress?.((totalDraws - uncoveredCount) / totalDraws);
  }

  return selected;
}

export function generateCombinations(
  type: LotteryType,
  poolA: number[],
  poolB: number[],
  conditions?: FilterConditions,
  wheelingMode: WheelingMode = 'FULL',
  onProgress?: (fraction: number) => void
): { reds: number[]; blues: number[] }[] {
  const estimate = getCombinationEstimate(type, poolA.length, poolB.length, wheelingMode);
  if (!estimate.allowed) throw new Error(estimate.reason!);
  if (estimate.fullCount === 0) return [];
  const reqA = type === 'SSQ' ? 6 : 5;
  const reqB = type === 'SSQ' ? 1 : 2;

  const allCandidates = combine(poolA, reqA);
  const validCandidates = conditions
    ? allCandidates.filter((c) => filterCombination(c, conditions))
    : allCandidates;

  let aCombs: number[][] = [];

  if (wheelingMode === 'FULL') {
    aCombs = validCandidates;
    onProgress?.(1);
  } else {
    const { matches: m, guarantee: t } = modeTargets(type, wheelingMode);
    aCombs = generateRotationMatrix(poolA, reqA, m, t, onProgress, validCandidates);
  }

  const bCombs = combine(poolB, reqB);

  if (aCombs.length * bCombs.length > 500) {
    throw new Error('输出上限为 500 注，请减少号码池。');
  }

  const results: { reds: number[]; blues: number[] }[] = [];
  for (const a of aCombs) {
    for (const b of bCombs) {
      results.push({ reds: a, blues: b });
    }
  }

  return results;
}

export interface GameTheoryConfig {
  monthPenalty: number;        // 1-12月偏好
  birthdayPenalty: number;     // 1-31日偏好
  luckyPenalty: number;        // 6,8,16...等吉利数偏好
  largeNumberBonus: number;    // 31以上大数冷门加成
  blueMonthPenalty: number;    // 蓝球1-12偏好
  blueLargeBonus: number;      // 蓝球12以上冷门加成
  patternPenalty: number;      // 规律形态避让（连号/等差/同尾数/低AC值）
  allBirthdayPenalty: number;  // 纯生日组合避让（整注全≤31惩罚）
}

export const DEFAULT_GAME_THEORY_CONFIG: GameTheoryConfig = {
  ...CALIBRATION_DATA.calibratedConfig,
};

export interface CombinationCrowdingDiagnostic {
  coldnessScore: number;      // 0-100, higher means more unpopular / lower crowding risk
  acValue: number;
  largeCount: number;         // count of red/front balls > 31
  maxConsecutive: number;
  maxSameTail: number;
  crowdingPenalty: number;
}

/**
 * Evaluate combo-level and ball-level crowding risk for a ticket.
 */
export function evaluateCombinationCrowding(
  type: LotteryType,
  reds: number[],
  blues: number[],
  config: GameTheoryConfig = DEFAULT_GAME_THEORY_CONFIG
): CombinationCrowdingDiagnostic {
  const sortedReds = [...reds].sort((a, b) => a - b);
  const acValue = calculateAC(sortedReds);
  const maxConsecutive = getMaxConsecutiveLength(sortedReds);
  const largeCount = sortedReds.filter(n => n > 31).length;

  const tailCounts = new Map<number, number>();
  for (const n of sortedReds) {
    const tail = n % 10;
    tailCounts.set(tail, (tailCounts.get(tail) ?? 0) + 1);
  }
  const maxSameTail = Math.max(0, ...tailCounts.values());

  // 1. Ball-level score
  let ballScore = 0;
  for (const n of sortedReds) {
    if (n <= 12) ballScore += config.monthPenalty;
    else if (n <= 31) ballScore += config.birthdayPenalty;
    else ballScore -= config.largeNumberBonus;
    if ([6, 8, 16, 18, 26, 28].includes(n)) ballScore += config.luckyPenalty;
  }
  for (const b of blues) {
    if (b <= 12) ballScore += config.blueMonthPenalty;
    else ballScore -= config.blueLargeBonus;
    if ([6, 8].includes(b)) ballScore += 0.1;
  }

  // 2. Combo-level pattern crowding penalty
  const pWeight = config.patternPenalty ?? 0.5;
  const bWeight = config.allBirthdayPenalty ?? 0.5;
  let patternScore = 0;

  // Low AC value penalty (arithmetic progressions / symmetric patterns)
  const targetAC = type === 'SSQ' ? 7 : 4;
  if (acValue < targetAC) {
    patternScore += (targetAC - acValue) * 0.45 * pWeight;
  }

  // Consecutive run penalty
  if (maxConsecutive >= 3) {
    patternScore += (maxConsecutive - 2) * 0.7 * pWeight;
  } else if (maxConsecutive === 2) {
    patternScore += 0.15 * pWeight;
  }

  // Same tail (mod 10) clustering penalty
  if (maxSameTail >= 3) {
    patternScore += (maxSameTail - 2) * 0.55 * pWeight;
  }

  // All-birthday ticket penalty (no ball > 31)
  if (largeCount === 0) {
    patternScore += 1.1 * bWeight;
  }

  const crowdingPenalty = ballScore + patternScore;
  // Normalize into a 0-100 coldness score where ~85+ is strongly anti-crowded
  const rawScore = 78 - crowdingPenalty * 14;
  const coldnessScore = Math.max(15, Math.min(99, Math.round(rawScore)));

  return {
    coldnessScore,
    acValue,
    largeCount,
    maxConsecutive,
    maxSameTail,
    crowdingPenalty,
  };
}

/** Constraints shared by capacity calculation and random generation. */
function randomPools(type: LotteryType, fixedReds: number[], fixedBlues: number[], excludedReds: number[], excludedBlues: number[]) {
  if (type !== 'SSQ' && type !== 'DLT') throw new Error('未知彩票类型');
  const prepare = (fixed: number[], excluded: number[], max: number, required: number) => {
    for (const values of [fixed, excluded]) {
      if (new Set(values).size !== values.length || values.some(n => !Number.isInteger(n) || n < 1 || n > max)) {
        throw new Error('号码必须在范围内且不能重复');
      }
    }
    if (fixed.some(n => excluded.includes(n))) throw new Error('胆码与杀号冲突');
    if (fixed.length > required) throw new Error('胆码数量过多');
    const pool = Array.from({ length: max }, (_, i) => i + 1).filter(n => !fixed.includes(n) && !excluded.includes(n));
    const needed = required - fixed.length;
    if (pool.length < needed) throw new Error('剩余号码不足以组成一注');
    return { fixed, pool, needed };
  };
  return {
    red: prepare(fixedReds, excludedReds, type === 'SSQ' ? 33 : 35, type === 'SSQ' ? 6 : 5),
    blue: prepare(fixedBlues, excludedBlues, type === 'SSQ' ? 16 : 12, type === 'SSQ' ? 1 : 2),
  };
}

export function getRandomCombinationCapacity(type: LotteryType, fixedReds: number[], fixedBlues: number[], excludedReds: number[] = [], excludedBlues: number[] = []): number {
  const { red, blue } = randomPools(type, fixedReds, fixedBlues, excludedReds, excludedBlues);
  return choose(red.pool.length, red.needed) * choose(blue.pool.length, blue.needed);
}

/** Uniform sampling without replacement over valid tickets. */
export function generateRandomWithFixed(
  type: LotteryType, fixedReds: number[], fixedBlues: number[], count: number = 1,
  excludedReds: number[] = [], excludedBlues: number[] = [],
  options: { random?: () => number } = {}
): { reds: number[]; blues: number[] }[] {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('注数必须为正整数');
  const { red, blue } = randomPools(type, fixedReds, fixedBlues, excludedReds, excludedBlues);
  const blueCount = choose(blue.pool.length, blue.needed);
  const capacity = choose(red.pool.length, red.needed) * blueCount;
  if (count > capacity) throw new Error(`可用组合仅有 ${capacity} 注`);
  const random = options.random ?? Math.random;
  const draw = (limit: number) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('随机源必须返回 [0, 1) 内的数');
    return Math.floor(value * limit);
  };
  const unrank = (pool: number[], needed: number, rank: number) => {
    const result: number[] = [];
    let start = 0;
    for (let left = needed; left > 0; left--) {
      for (let i = start; i <= pool.length - left; i++) {
        const size = choose(pool.length - i - 1, left - 1);
        if (rank < size) { result.push(pool[i]); start = i + 1; break; }
        rank -= size;
      }
    }
    return result;
  };
  // Partial Fisher–Yates over ranks, stored sparsely to avoid enumerating the space.
  const swaps = new Map<number, number>();
  return Array.from({ length: count }, (_, i) => {
    const remaining = capacity - i;
    const index = draw(remaining);
    const rank = swaps.get(index) ?? index;
    swaps.set(index, swaps.get(remaining - 1) ?? remaining - 1);
    return {
      reds: [...red.fixed, ...unrank(red.pool, red.needed, Math.floor(rank / blueCount))].sort((a, b) => a - b),
      blues: [...blue.fixed, ...unrank(blue.pool, blue.needed, rank % blueCount)].sort((a, b) => a - b),
    };
  });
}

/**
 * Weighted sampling without replacement combining single-ball anti-popularity
 * and combo-level pattern penalties (AC value, consecutive runs, tail clustering, all-birthday penalty).
 */
export function generateReverseBatch(
  type: LotteryType,
  count: number,
  config: GameTheoryConfig = DEFAULT_GAME_THEORY_CONFIG
): { reds: number[]; blues: number[] }[] {
  const fullConfig: GameTheoryConfig = { ...DEFAULT_GAME_THEORY_CONFIG, ...config };
  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;
  const reqRed = type === 'SSQ' ? 6 : 5;
  const reqBlue = type === 'SSQ' ? 1 : 2;
  const redUsage = new Map<number, number>(), blueUsage = new Map<number, number>();

  const pick = (max: number, amount: number, usage: Map<number, number>, blue: boolean) => {
    const choices = Array.from({ length: max }, (_, i) => i + 1);
    const picked: number[] = [];
    while (picked.length < amount) {
      const weights = choices.map(n => {
        const score = blue
          ? (n <= 12 ? fullConfig.blueMonthPenalty : -fullConfig.blueLargeBonus) + ([6, 8].includes(n) ? 0.1 : 0)
          : (n <= 12 ? fullConfig.monthPenalty : n <= 31 ? fullConfig.birthdayPenalty : -fullConfig.largeNumberBonus) +
            ([6, 8, 16, 18, 26, 28].includes(n) ? fullConfig.luckyPenalty : 0);
        return Math.exp(-2 * score) / (1 + 0.05 * (usage.get(n) || 0));
      });
      let threshold = Math.random() * weights.reduce((a, b) => a + b, 0);
      let index = weights.findIndex(w => (threshold -= w) <= 0);
      if (index < 0) index = choices.length - 1;
      picked.push(choices.splice(index, 1)[0]);
    }
    return picked.sort((a, b) => a - b);
  };

  const results: { reds: number[]; blues: number[] }[] = [], seen = new Set<string>();
  const pWeight = fullConfig.patternPenalty ?? 0.5;
  const bWeight = fullConfig.allBirthdayPenalty ?? 0.5;

  for (let attempts = 0; results.length < count && attempts < count * 150; attempts++) {
    const reds = pick(maxRed, reqRed, redUsage, false);
    const blues = pick(maxBlue, reqBlue, blueUsage, true);
    const key = `${reds}|${blues}`;
    if (seen.has(key)) continue;

    // Combo-level rejection sampling based on pattern & all-birthday crowding penalty
    if (pWeight > 0 || bWeight > 0) {
      const diag = evaluateCombinationCrowding(type, reds, blues, fullConfig);
      const targetAC = type === 'SSQ' ? 7 : 4;
      let comboPenalty = 0;
      if (diag.acValue < targetAC) comboPenalty += (targetAC - diag.acValue) * 0.45 * pWeight;
      if (diag.maxConsecutive >= 3) comboPenalty += (diag.maxConsecutive - 2) * 0.7 * pWeight;
      else if (diag.maxConsecutive === 2) comboPenalty += 0.15 * pWeight;
      if (diag.maxSameTail >= 3) comboPenalty += (diag.maxSameTail - 2) * 0.55 * pWeight;
      if (diag.largeCount === 0) comboPenalty += 1.1 * bWeight;

      const acceptProb = Math.exp(-1.5 * comboPenalty);
      // Relax acceptance gradually if attempts are running high so batch size is still met
      const progress = attempts / (count * 150);
      const effectiveProb = acceptProb + (1 - acceptProb) * (progress * progress);
      if (Math.random() > effectiveProb) continue;
    }

    seen.add(key);
    results.push({ reds, blues });
    reds.forEach(n => redUsage.set(n, (redUsage.get(n) || 0) + 1));
    blues.forEach(n => blueUsage.set(n, (blueUsage.get(n) || 0) + 1));
  }
  return results;
}
