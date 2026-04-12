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
export type WheelingMode = 'FULL' | 'M6G5' | 'M6G4' | 'M5G5';

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
    let m = 6, t = 5;
    if (wheelingMode === 'M6G5') { m = 6; t = 5; }
    else if (wheelingMode === 'M6G4') { m = 6; t = 4; }
    else if (wheelingMode === 'M5G5') { m = 5; t = 5; }
    
    // For DLT, if user chooses M6Gx, we cap m at 5 since draw only has 5 front balls
    if (type === 'DLT' && m > 5) m = 5;

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

/**
 * Generate random combinations with fixed numbers (Dan Ma) and excluded numbers (Sha Hao)
 */
export function generateRandomWithFixed(
  type: LotteryType,
  fixedReds: number[],
  fixedBlues: number[],
  count: number = 1,
  excludedReds: number[] = [],
  excludedBlues: number[] = []
): { reds: number[]; blues: number[] }[] {
  const maxRed = type === 'SSQ' ? 33 : 35;
  const maxBlue = type === 'SSQ' ? 16 : 12;
  const reqRed = type === 'SSQ' ? 6 : 5;
  const reqBlue = type === 'SSQ' ? 1 : 2;

  const results: { reds: number[]; blues: number[] }[] = [];
  
  // Available pool: exclude both fixed (already picked) and excluded (don't want to pick)
  const allReds = Array.from({ length: maxRed }, (_, i) => i + 1)
    .filter(n => !fixedReds.includes(n) && !excludedReds.includes(n));
  const allBlues = Array.from({ length: maxBlue }, (_, i) => i + 1)
    .filter(n => !fixedBlues.includes(n) && !excludedBlues.includes(n));

  for (let i = 0; i < count; i++) {
    const randomReds = [...allReds].sort(() => Math.random() - 0.5).slice(0, reqRed - fixedReds.length);
    const randomBlues = [...allBlues].sort(() => Math.random() - 0.5).slice(0, reqBlue - fixedBlues.length);

    results.push({
      reds: [...fixedReds, ...randomReds].sort((a, b) => a - b),
      blues: [...fixedBlues, ...randomBlues].sort((a, b) => a - b)
    });
  }

  return results;
}
