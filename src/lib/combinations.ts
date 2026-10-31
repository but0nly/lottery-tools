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

/** Coverage of the final tickets, considering only red/front numbers. */
export function getCoverage(type: LotteryType, pool: number[], mode: WheelingMode, results: { reds: number[]; blues: number[] }[]) {
  const { matches, guarantee } = modeTargets(type, mode);
  const outcomes = combine(pool, matches);
  const tickets = [...new Map(results.map(result => [result.reds.join(','), result.reds])).values()];
  const covered = outcomes.filter(outcome => tickets.some(ticket => outcome.filter(n => ticket.includes(n)).length >= guarantee)).length;
  return { matches, guarantee, covered, total: outcomes.length };
}

export interface FilterConditions {
  minSum?: number;
  maxSum?: number;
  maxConsecutive?: number;
  oddEvenRatio?: [number, number]; // [odds, evens]
}

export function isConsecutive(arr: number[], maxLen: number): boolean {
  let currentLen = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      currentLen++;
      if (currentLen > maxConsecutive) {
        maxConsecutive = currentLen;
      }
    } else {
      currentLen = 1;
    }
  }
  return maxConsecutive >= maxLen;
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

  return true;
}

/**
 * Greedy Covering Algorithm for Rotation Matrix (Wheeling System)
 * @param pool The selected numbers pool
 * @param k Size of each ticket (6 for SSQ, 5 for DLT)
 * @param m Condition: number of matches in pool (usually 6 or 5)
 * @param t Guarantee: guarantee at least t matches
 */
export function generateRotationMatrix(
  pool: number[],
  k: number,
  m: number,
  t: number
): number[][] {
  const universe = combine(pool, k); // All possible tickets
  const draws = combine(pool, m); // All possible draw outcomes to cover

  const selected: number[][] = [];
  const coveredDraws = new Set<string>();

  const getIntersectionSize = (a: number[], b: number[]) => {
    let count = 0;
    const setB = new Set(b);
    for (const x of a) if (setB.has(x)) count++;
    return count;
  };

  const drawStrings = draws.map(d => d.join(','));

  while (coveredDraws.size < draws.length) {
    let bestTicket: number[] | null = null;
    let maxNewCovered = -1;
    let bestTicketNewCoveredSet: string[] = [];

    // Optimization: if universe is huge, we might need a faster way. 
    // But for pool <= 16, universe is max 8008 for SSQ.
    for (const ticket of universe) {
      const newCoveredForThisTicket: string[] = [];
      for (let i = 0; i < draws.length; i++) {
        const dStr = drawStrings[i];
        if (coveredDraws.has(dStr)) continue;
        
        if (getIntersectionSize(ticket, draws[i]) >= t) {
          newCoveredForThisTicket.push(dStr);
        }
      }

      if (newCoveredForThisTicket.length > maxNewCovered) {
        maxNewCovered = newCoveredForThisTicket.length;
        bestTicket = ticket;
        bestTicketNewCoveredSet = newCoveredForThisTicket;
      }
      
      // Early exit if we find a ticket that covers a lot (heuristic)
      if (maxNewCovered >= draws.length / 5) break; 
    }

    if (!bestTicket || maxNewCovered === 0) break;

    selected.push(bestTicket);
    for (const d of bestTicketNewCoveredSet) {
      coveredDraws.add(d);
    }
  }

  return selected;
}

export function generateCombinations(
  type: LotteryType,
  poolA: number[],
  poolB: number[],
  conditions?: FilterConditions,
  wheelingMode: WheelingMode = 'FULL'
): { reds: number[]; blues: number[] }[] {
  const reqA = type === 'SSQ' ? 6 : 5;
  const reqB = type === 'SSQ' ? 1 : 2;

  let aCombs: number[][] = [];

  if (wheelingMode === 'FULL') {
    aCombs = combine(poolA, reqA);
  } else {
    const { matches: m, guarantee: t } = modeTargets(type, wheelingMode);

    aCombs = generateRotationMatrix(poolA, reqA, m, t);
  }

  const bCombs = combine(poolB, reqB);

  const filteredA = conditions ? aCombs.filter((c) => filterCombination(c, conditions)) : aCombs;

  const results: { reds: number[]; blues: number[] }[] = [];
  for (const a of filteredA) {
    for (const b of bCombs) {
      results.push({ reds: a, blues: b });
    }
  }

  return results;
}

export function getLeastFrequent(history: { reds: string, blues: string }[], type: LotteryType) {
  const redCounts: Record<number, number> = {};
  const blueCounts: Record<number, number> = {};

  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;

  for (let i = 1; i <= maxRed; i++) redCounts[i] = 0;
  for (let i = 1; i <= maxBlue; i++) blueCounts[i] = 0;

  history.forEach(draw => {
    if (!draw.reds || !draw.blues) return;
    draw.reds.split(',').forEach(n => { 
      const num = parseInt(n);
      if (!isNaN(num)) redCounts[num]++; 
    });
    draw.blues.split(',').forEach(n => { 
      const num = parseInt(n);
      if (!isNaN(num)) blueCounts[num]++; 
    });
  });

  // Introduce a small random factor to break ties and make it feel like a 'calculation'
  // Instead of just sorting by count, we sort by (count + tiny_random)
  const sortedReds = Object.entries(redCounts)
    .map(([num, count]) => ({ 
      num: parseInt(num), 
      score: count + Math.random() * 0.1 // Random factor for tie-breaking
    }))
    .sort((a, b) => a.score - b.score)
    .map(e => e.num);

  const sortedBlues = Object.entries(blueCounts)
    .map(([num, count]) => ({ 
      num: parseInt(num), 
      score: count + Math.random() * 0.1 
    }))
    .sort((a, b) => a.score - b.score)
    .map(e => e.num);

  const reqA = type === 'SSQ' ? 6 : 5;
  const reqB = type === 'SSQ' ? 1 : 2;

  // We pick from the coldest pool (e.g., bottom 10 numbers) instead of just the absolute top N
  // to make the generator more interactive and 'fresh'
  const pickReds = sortedReds.slice(0, reqA + 4).sort(() => Math.random() - 0.5).slice(0, reqA);
  const pickBlues = sortedBlues.slice(0, reqB + 2).sort(() => Math.random() - 0.5).slice(0, reqB);

  return {
    reds: pickReds.sort((a, b) => a - b),
    blues: pickBlues.sort((a, b) => a - b)
  };
}

export interface GameTheoryConfig {
  monthPenalty: number;      // 1-12月偏好
  birthdayPenalty: number;   // 1-31日偏好
  luckyPenalty: number;      // 6,8,16...等吉利数偏好
  largeNumberBonus: number;  // 31以上大数冷门加成
  blueMonthPenalty: number;  // 蓝球1-12偏好
  blueLargeBonus: number;    // 蓝球12以上冷门加成
}

export const DEFAULT_GAME_THEORY_CONFIG: GameTheoryConfig = {
  monthPenalty: 0.4,
  birthdayPenalty: 0.3,
  luckyPenalty: 0.2,
  largeNumberBonus: 0.4,
  blueMonthPenalty: 0.3,
  blueLargeBonus: 0.2
};

/**
 * Game Theory Algorithm: Generate unpopular numbers to maximize EV
 * Avoids birthday numbers (1-31), lucky numbers, and common patterns.
 */
export function generateGameTheoryCombination(
  type: LotteryType, 
  config: GameTheoryConfig = DEFAULT_GAME_THEORY_CONFIG
): { reds: number[], blues: number[] } {
  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;
  const reqRed = type === 'SSQ' ? 6 : 5;
  const reqBlue = type === 'SSQ' ? 1 : 2;

  // Calculate scores for each number (Lower is better/colder in terms of human psychology)
  const getRedScore = (n: number) => {
    let score = 0;
    // 1-31 are birthday numbers, 1-12 are month numbers (extreme popularity)
    if (n <= 12) score += config.monthPenalty; 
    else if (n <= 31) score += config.birthdayPenalty;
    
    // Lucky numbers
    if ([6, 8, 16, 18, 26, 28].includes(n)) score += config.luckyPenalty;
    
    // Edge numbers (often overlooked)
    if (n === 1 || n === maxRed) score -= 0.05;
    
    // High numbers (above 31) are less chosen by humans
    if (n > 31) score -= config.largeNumberBonus;

    return score;
  };

  const getBlueScore = (n: number) => {
    let score = 0;
    if (n <= 12) score += config.blueMonthPenalty; // months
    if ([6, 8].includes(n)) score += 0.1; // basic lucky
    if (n > 12) score -= config.blueLargeBonus;
    return score;
  };

  // Weighted random selection based on inverse scores
  const allReds = Array.from({ length: maxRed }, (_, i) => i + 1);
  const allBlues = Array.from({ length: maxBlue }, (_, i) => i + 1);

  // We add some randomness to avoid giving the exact same "unpopular" set to everyone
  const sortedReds = allReds.sort((a, b) => (getRedScore(a) + Math.random() * 1.5) - (getRedScore(b) + Math.random() * 1.5));
  const sortedBlues = allBlues.sort((a, b) => (getBlueScore(a) + Math.random() * 1.5) - (getBlueScore(b) + Math.random() * 1.5));

  return {
    reds: sortedReds.slice(0, reqRed).sort((a, b) => a - b),
    blues: sortedBlues.slice(0, reqBlue).sort((a, b) => a - b)
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

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i;
  return Math.round(result);
}

export function getRandomCombinationCapacity(type: LotteryType, fixedReds: number[], fixedBlues: number[], excludedReds: number[] = [], excludedBlues: number[] = []): number {
  const { red, blue } = randomPools(type, fixedReds, fixedBlues, excludedReds, excludedBlues);
  return choose(red.pool.length, red.needed) * choose(blue.pool.length, blue.needed);
}

/** Uniform sampling over valid tickets, with optional sampling without replacement. */
export function generateRandomWithFixed(
  type: LotteryType, fixedReds: number[], fixedBlues: number[], count: number = 1,
  excludedReds: number[] = [], excludedBlues: number[] = [],
  options: { allowDuplicates?: boolean; random?: () => number } = {}
): { reds: number[]; blues: number[] }[] {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('注数必须为正整数');
  const { red, blue } = randomPools(type, fixedReds, fixedBlues, excludedReds, excludedBlues);
  const blueCount = choose(blue.pool.length, blue.needed);
  const capacity = choose(red.pool.length, red.needed) * blueCount;
  if (options.allowDuplicates === false && count > capacity) throw new Error(`可用组合仅有 ${capacity} 注`);
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
    let rank: number;
    if (options.allowDuplicates === false) {
      const remaining = capacity - i;
      const index = draw(remaining);
      rank = swaps.get(index) ?? index;
      swaps.set(index, swaps.get(remaining - 1) ?? remaining - 1);
    } else rank = draw(capacity);
    return {
      reds: [...red.fixed, ...unrank(red.pool, red.needed, Math.floor(rank / blueCount))].sort((a, b) => a - b),
      blues: [...blue.fixed, ...unrank(blue.pool, blue.needed, rank % blueCount)].sort((a, b) => a - b),
    };
  });
}

/** Weighted sampling without replacement; a small usage penalty spreads a batch. */
export function generateReverseBatch(
  type: LotteryType, count: number, config: GameTheoryConfig,
  history?: { reds: string; blues: string }[]
): { reds: number[]; blues: number[] }[] {
  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;
  const redUsage = new Map<number, number>(), blueUsage = new Map<number, number>();
  const frequencies = (key: 'reds' | 'blues', max: number) => {
    const counts = Array(max + 1).fill(0) as number[];
    history?.forEach(draw => draw[key].split(',').forEach(value => { counts[Number(value)]++; }));
    return counts;
  };
  const redFreq = frequencies('reds', maxRed), blueFreq = frequencies('blues', maxBlue);
  const pick = (max: number, amount: number, usage: Map<number, number>, blue: boolean) => {
    const frequency = blue ? blueFreq : redFreq;
    const maxFreq = Math.max(1, ...frequency);
    const choices = Array.from({ length: max }, (_, i) => i + 1);
    const picked: number[] = [];
    while (picked.length < amount) {
      const weights = choices.map(n => {
        let score: number;
        if (history) score = 2 * frequency[n] / maxFreq;
        else if (blue) score = (n <= 12 ? config.blueMonthPenalty : -config.blueLargeBonus) + ([6, 8].includes(n) ? 0.1 : 0);
        else score = (n <= 12 ? config.monthPenalty : n <= 31 ? config.birthdayPenalty : -config.largeNumberBonus) + ([6, 8, 16, 18, 26, 28].includes(n) ? config.luckyPenalty : 0);
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
  for (let attempts = 0; results.length < count && attempts < count * 100; attempts++) {
    const reds = pick(maxRed, type === 'SSQ' ? 6 : 5, redUsage, false);
    const blues = pick(maxBlue, type === 'SSQ' ? 1 : 2, blueUsage, true);
    const key = `${reds}|${blues}`;
    if (seen.has(key)) continue;
    seen.add(key); results.push({ reds, blues });
    reds.forEach(n => redUsage.set(n, (redUsage.get(n) || 0) + 1));
    blues.forEach(n => blueUsage.set(n, (blueUsage.get(n) || 0) + 1));
  }
  return results;
}
