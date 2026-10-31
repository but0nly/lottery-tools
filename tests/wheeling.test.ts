import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateCombinations, getWheelingModes } from '../src/lib/combinations.ts';

test('大乐透只提供实际前区五个号码的缩水模式', () => {
  assert.deepEqual(getWheelingModes('DLT').map(mode => mode.id), ['FULL', 'M5G5', 'M5G4']);
});

test('过滤后只统计最终注数覆盖的前区开奖情况', async () => {
  const { getCoverage } = await import('../src/lib/combinations.ts');
  const pool = [1, 2, 3, 4, 5, 6];
  const results = generateCombinations('DLT', pool, [1, 2], { maxSum: 15 }, 'M5G5');
  assert.deepEqual(getCoverage('DLT', pool, 'M5G5', results), { matches: 5, guarantee: 5, covered: 1, total: 6 });
});

test('两种彩票的每种模式覆盖小号码池中的所有目标情况', async () => {
  const { getCoverage, getWheelingModes } = await import('../src/lib/combinations.ts');
  for (const type of ['SSQ', 'DLT'] as const) {
    const pool = type === 'SSQ' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
    const blue = type === 'SSQ' ? [1] : [1, 2];
    for (const mode of getWheelingModes(type)) {
      const tickets = generateCombinations(type, pool, blue, undefined, mode.id);
      const coverage = getCoverage(type, pool, mode.id, tickets);
      // Enumerate all subsets independently and check each against actual final tickets.
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
