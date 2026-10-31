import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateAC, generateCombinations, getCoverageBreakdown, getWheelingModes } from '../src/lib/combinations.ts';

test('大乐透只提供实际前区五个号码的缩水模式', () => {
  assert.deepEqual(getWheelingModes('DLT').map(mode => mode.id), ['FULL', 'M5G5', 'M5G4']);
});

test('过滤后只统计最终注数覆盖的前区开奖情况，且优先从满足过滤条件的候选注中覆盖', async () => {
  const { getCoverage } = await import('../src/lib/combinations.ts');
  const pool = [1, 2, 3, 4, 5, 6];
  const results = generateCombinations('DLT', pool, [1, 2], { maxSum: 15 }, 'M5G5');
  assert.deepEqual(getCoverage('DLT', pool, 'M5G5', results), { matches: 5, guarantee: 5, covered: 1, total: 6 });

  // Filter-aware covering: in M5G4 on 6 balls, even when maxSum: 15 restricts the candidate to [1,2,3,4,5],
  // that single valid candidate still covers all 6 five-number draws with >= 4 matches!
  const m5g4Results = generateCombinations('DLT', pool, [1, 2], { maxSum: 15 }, 'M5G4');
  assert.equal(m5g4Results.length, 1);
  assert.deepEqual(getCoverage('DLT', pool, 'M5G4', m5g4Results), { matches: 5, guarantee: 4, covered: 6, total: 6 });
});

test('支持奇偶比与AC值（算术复杂度）过滤及命中等级分布明细', () => {
  assert.equal(calculateAC([1, 2, 3, 4, 5, 6]), 0);
  assert.ok(calculateAC([1, 4, 9, 16, 25, 33]) >= 8);

  const pool = [1, 2, 3, 4, 7, 11, 18, 25];
  const results = generateCombinations('SSQ', pool, [1], { oddEvenRatio: [3, 3], minAC: 6 }, 'FULL');
  assert.ok(results.length > 0);
  for (const r of results) {
    const odds = r.reds.filter(n => n % 2 !== 0).length;
    assert.equal(odds, 3);
    assert.ok(calculateAC(r.reds) >= 6);
  }

  const wheel = generateCombinations('SSQ', pool, [1], undefined, 'M6G5');
  const breakdown = getCoverageBreakdown('SSQ', pool, 'M6G5', wheel);
  const tier5 = breakdown.find(b => b.minHit === 5)!;
  assert.ok(tier5.minTickets >= 1);
  assert.equal(tier5.coveredOutcomes, tier5.totalOutcomes);
});

test('两种彩票的每种模式覆盖小号码池中的所有目标情况', async () => {
  const { getCoverage, getWheelingModes } = await import('../src/lib/combinations.ts');
  for (const type of ['SSQ', 'DLT'] as const) {
    const pool = type === 'SSQ' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
    const blue = type === 'SSQ' ? [1] : [1, 2];
    for (const mode of getWheelingModes(type)) {
      const tickets = generateCombinations(type, pool, blue, undefined, mode.id);
      const coverage = getCoverage(type, pool, mode.id, tickets);
      const outcomes = Array.from({ length: 1 << pool.length }, (_, mask) => pool.filter((_, i) => mask & (1 << i))).filter(draw => draw.length === coverage.matches);
      const covered = outcomes.filter(draw => tickets.some(ticket => draw.filter(n => ticket.reds.includes(n)).length >= coverage.guarantee)).length;
      assert.equal(covered, outcomes.length, `${type} ${mode.id}`);
      assert.equal(coverage.covered, covered);
      assert.equal(coverage.total, outcomes.length);
    }
  }
});

test('无最终注数不保留覆盖保证，且拒绝不适用的模式', async () => {
  const { getCoverage } = await import('../src/lib/combinations.ts');
  const pool = [1, 2, 3, 4, 5, 6];
  const tickets = generateCombinations('DLT', pool, [1, 2], { minSum: 100 }, 'M5G4');
  assert.deepEqual(tickets, []);
  assert.deepEqual(getCoverage('DLT', pool, 'M5G4', tickets), { matches: 5, guarantee: 4, covered: 0, total: 6 });
  assert.throws(() => generateCombinations('DLT', pool, [1, 2], undefined, 'M6G5'));
});

test('每种模式的过滤覆盖与最终号码逐一穷举一致', async () => {
  const { getCoverage, getWheelingModes } = await import('../src/lib/combinations.ts');
  for (const type of ['SSQ', 'DLT'] as const) {
    const pool = type === 'SSQ' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7];
    for (const mode of getWheelingModes(type)) {
      const tickets = generateCombinations(type, pool, type === 'SSQ' ? [1, 2] : [1, 2, 3], { minSum: type === 'SSQ' ? 26 : 21 }, mode.id);
      const report = getCoverage(type, pool, mode.id, tickets);
      const draws = Array.from({ length: 1 << pool.length }, (_, mask) => pool.filter((_, i) => mask & (1 << i))).filter(draw => draw.length === report.matches);
      const covered = draws.filter(draw => tickets.some(ticket => draw.filter(n => ticket.reds.includes(n)).length >= report.guarantee)).length;
      assert.equal(report.total, draws.length);
      assert.equal(report.covered, covered, `${type} ${mode.id}`);
    }
  }
});

test('蓝球池不足时没有注数，也没有覆盖', async () => {
  const { getCoverage } = await import('../src/lib/combinations.ts');
  const pool = [1, 2, 3, 4, 5];
  const tickets = generateCombinations('DLT', pool, [1], undefined, 'M5G4');
  assert.deepEqual(tickets, []);
  assert.deepEqual(getCoverage('DLT', pool, 'M5G4', tickets), { matches: 5, guarantee: 4, covered: 0, total: 1 });
});

test('缩水生成报告覆盖进度，并保持原有号码结果', () => {
  const progress: number[] = [];
  const pool = [1, 2, 3, 4, 5, 6, 7, 8];
  const result = generateCombinations('SSQ', pool, [1], undefined, 'M6G5', value => progress.push(value));
  assert.deepEqual(result, generateCombinations('SSQ', pool, [1], undefined, 'M6G5'));
  assert.ok(progress.some(value => value > 0 && value < 1));
  assert.equal(progress.at(-1), 1);
});
