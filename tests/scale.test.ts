import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getCombinationEstimate } from '../src/lib/combinations.ts';

test('两种彩票全复式注数及普通投注成本', () => {
  assert.deepEqual(getCombinationEstimate('SSQ', 7, 2, 'FULL'), { fullCount: 14, fullCost: 28, allowed: true, reason: null });
  assert.deepEqual(getCombinationEstimate('DLT', 6, 3, 'FULL'), { fullCount: 18, fullCost: 36, allowed: true, reason: null });
});

test('输出上限与缩水计算上限在生成前生效', async () => {
  const { generateCombinations } = await import('../src/lib/combinations.ts');
  assert.equal(getCombinationEstimate('SSQ', 10, 2, 'FULL').allowed, true);
  assert.match(getCombinationEstimate('SSQ', 10, 3, 'FULL').reason!, /输出/);
  assert.match(getCombinationEstimate('SSQ', 12, 1, 'M6G5').reason!, /计算/);
  assert.throws(() => generateCombinations('SSQ', Array.from({length: 10}, (_, i) => i + 1), [1, 2, 3]), /输出/);
});

test('号码不足时返回零注，不展开大型前区组合', async () => {
  const { generateCombinations } = await import('../src/lib/combinations.ts');
  assert.equal(getCombinationEstimate('DLT', 35, 1, 'M5G4').fullCount, 0);
  assert.deepEqual(generateCombinations('DLT', Array.from({length: 35}, (_, i) => i + 1), [1], undefined, 'M5G4'), []);
});

test('过滤后以实际保留注数计费，全复式只是上限', async () => {
  const { generateCombinations } = await import('../src/lib/combinations.ts');
  const estimate = getCombinationEstimate('DLT', 6, 3, 'FULL');
  const results = generateCombinations('DLT', [1, 2, 3, 4, 5, 6], [1, 2, 3], { maxSum: 15 });
  assert.equal(estimate.fullCount, 18);
  assert.equal(results.length, 3);
  assert.equal(results.length * 2, 6);
});
