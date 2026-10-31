import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomWithFixed } from '../src/lib/combinations.ts';

test('rejects conflicting fixed and excluded numbers', () => {
  assert.throws(() => generateRandomWithFixed('SSQ', [1], [], 1, [1]), /冲突/);
});

test('reports capacity and refuses a unique batch larger than it', async () => {
  const { getRandomCombinationCapacity } = await import('../src/lib/combinations.ts');
  const excluded = Array.from({ length: 27 }, (_, i) => i + 7);
  assert.equal(getRandomCombinationCapacity('SSQ', [], [], excluded, [3,4,5,6,7,8,9,10,11,12,13,14,15,16]), 2);
  assert.throws(() => generateRandomWithFixed('SSQ', [], [], 3, excluded, [3,4,5,6,7,8,9,10,11,12,13,14,15,16], { allowDuplicates: false }), /可用组合/);
});

test('validates numbers, counts, and constraints for both games', () => {
  for (const [type, redMax, blueMax, redCount, blueCount] of [['SSQ', 33, 16, 6, 1], ['DLT', 35, 12, 5, 2]]) {
    for (const args of [[[0], []], [[redMax + 1], []], [[1, 1], []], [[], [blueMax + 1]]]) {
      assert.throws(() => generateRandomWithFixed(type, ...args));
    }
    assert.throws(() => generateRandomWithFixed(type, Array(redCount + 1).fill(0).map((_, i) => i + 1), []));
    assert.throws(() => generateRandomWithFixed(type, [], [], 0));
    assert.throws(() => generateRandomWithFixed(type, [], [], 1, Array.from({length: redMax - redCount + 1}, (_, i) => i + 1)));
    const bets = generateRandomWithFixed(type, [1], [1], 30, [2], [2]);
    for (const { reds, blues } of bets) {
      assert.equal(reds.length, redCount); assert.equal(blues.length, blueCount);
      assert.equal(new Set(reds).size, redCount); assert.equal(new Set(blues).size, blueCount);
      assert.ok(reds.includes(1) && blues.includes(1));
      assert.ok(!reds.includes(2) && !blues.includes(2));
      assert.ok(reds.every(n => n >= 1 && n <= redMax));
      assert.ok(blues.every(n => n >= 1 && n <= blueMax));
    }
  }
});

test('a fixed seed reproduces unique batches and allows duplicates when requested', () => {
  const seed = () => { let state = 12345; return () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32); };
  const sample = () => generateRandomWithFixed('DLT', [1], [], 100, [], [], { allowDuplicates: false, random: seed() });
  const bets = sample();
  assert.deepEqual(bets, sample());
  assert.equal(new Set(bets.map(b => JSON.stringify(b))).size, 100);
  const repeated = generateRandomWithFixed('SSQ', [], [], 2, [], [], { allowDuplicates: true, random: () => 0 });
  assert.deepEqual(repeated[0], repeated[1]);
});

test('samples each of four constrained tickets with similar frequency', () => {
  let state = 19;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
  const excludedReds = Array.from({length: 27}, (_, i) => i + 7);
  const excludedBlues = Array.from({length: 12}, (_, i) => i + 5);
  const bets = generateRandomWithFixed('SSQ', [], [], 4000, excludedReds, excludedBlues, { random });
  const counts = new Map();
  for (const bet of bets) counts.set(bet.blues[0], (counts.get(bet.blues[0]) ?? 0) + 1);
  assert.equal(counts.size, 4);
  for (const count of counts.values()) assert.ok(count > 900 && count < 1100, `unexpected count ${count}`);
});
