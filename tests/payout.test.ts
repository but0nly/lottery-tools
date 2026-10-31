import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getPrizeRules } from '../src/lib/prize-rules.ts';
import { getPortfolioPayoutDistribution } from '../src/lib/payout.ts';

const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) <= eps, `${a} !≈ ${b} (diff ${Math.abs(a - b)} > ${eps})`);

test('单注方案各奖级命中概率与官方单注理论概率一致，期望回报与官方EV一致', () => {
  const rules = getPrizeRules('SSQ');
  const result = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets: [{ reds: [1, 2, 3, 4, 5, 6], blues: [1] }],
    floatingEstimates: { tier1: 5_000_000, tier2: 200_000 },
  });

  assert.equal(result.ticketCount, 1);
  assert.equal(result.cost, 2);

  for (const tier of rules.tiers) {
    const rTier = result.tiers.find(t => t.id === tier.id);
    assert.ok(rTier, `Tier ${tier.id} should exist`);
    near(rTier.probabilityAtLeastOne, tier.probability, 1e-8);
    near(rTier.expectedCount, tier.probability, 1e-8);
  }

  // 期望回报必须与独立随机方案完全一致
  near(result.portfolio.expectedPayout, result.randomBaseline.expectedPayout, 1e-8);
  // 单注时组合本身就是独立单注，方差也一致
  near(result.portfolio.stdDevPayout, result.randomBaseline.stdDevPayout, 1e-4);
  near(result.portfolio.lossProbability, result.randomBaseline.lossProbability, 1e-6);
});

test('两注完全相同的重复注不静默去重，中奖注数与期望回报翻倍', () => {
  const single = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets: [{ reds: [1, 2, 3, 4, 5, 6], blues: [1] }],
    floatingEstimates: { tier1: 5_000_000, tier2: 200_000 },
  });

  const dup = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets: [
      { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
      { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
    ],
    floatingEstimates: { tier1: 5_000_000, tier2: 200_000 },
  });

  assert.equal(dup.ticketCount, 2);
  assert.equal(dup.cost, 4);

  // 至少中1注的概率不变（因为一注中则另一注必中）
  near(dup.tiers[0].probabilityAtLeastOne, single.tiers[0].probabilityAtLeastOne, 1e-9);
  // 但期望中奖注数翻倍
  near(dup.tiers[0].expectedCount, single.tiers[0].expectedCount * 2, 1e-9);
  // 期望总回报严格翻倍
  near(dup.portfolio.expectedPayout, single.portfolio.expectedPayout * 2, 1e-6);
});

test('两注互斥注（选两个不同蓝球），各奖级命中情况可解析验证', () => {
  // 两注红球相同、蓝球分别为 1 和 2
  const result = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets: [
      { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
      { reds: [1, 2, 3, 4, 5, 6], blues: [2] },
    ],
  });

  // 一等奖（6+1）：蓝球只有 1 或 2 能中一等奖，概率为 2 / 17,721,088
  near(result.tiers[0].probabilityAtLeastOne, 2 / 17721088, 1e-12);
  // 二等奖（6+0）：红球全中时（概率 1/1107568）：
  // 若蓝球是 1，则票 1 中一等奖、票 2 中二等奖；若蓝球是 2，票 1 中二等奖、票 2 中一等奖；
  // 若蓝球是 3..16（14种情况），两票都中二等奖！
  // 所以只要红球全中，至少有 1 注中二等奖！概率就是红球全中的概率 1 / 1107568
  near(result.tiers[1].probabilityAtLeastOne, 1 / 1107568, 1e-12);
});

test('概率总和与样本空间穷举一致，损失概率与保本概率和为 1', () => {
  const result = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets: [
      { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
      { reds: [2, 3, 4, 5, 6, 7], blues: [2] },
      { reds: [3, 4, 5, 6, 7, 8], blues: [3] },
    ],
  });

  assert.equal(result.ticketCount, 3);
  assert.equal(result.cost, 6);
  near(result.portfolio.lossProbability + result.portfolio.breakEvenProbability, 1, 1e-9);
  assert.ok(result.portfolio.stdDevPayout > 0);
  assert.ok(result.randomBaseline.stdDevPayout > 0);
});

test('随机选号基准对比与组合选号：期望回报完全相同，但方差与分布不同', () => {
  const tickets = [
    { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
    { reds: [1, 2, 3, 4, 7, 8], blues: [1] },
    { reds: [1, 2, 5, 6, 7, 8], blues: [1] },
    { reds: [3, 4, 5, 6, 7, 8], blues: [1] },
  ];

  const result = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets,
  });

  // 核心定理：期望回报不因选号组合而改变
  near(result.portfolio.expectedPayout, result.randomBaseline.expectedPayout, 1e-7);
  // 但相关性导致方差不同
  assert.notEqual(result.portfolio.stdDevPayout, result.randomBaseline.stdDevPayout);
});

test('条件概率 vs 无条件概率明确区分', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const tickets = [
    { reds: [1, 2, 3, 4, 5, 6], blues: [1] },
    { reds: [1, 2, 3, 7, 8, 9], blues: [1] },
    { reds: [4, 5, 6, 7, 8, 10], blues: [1] },
  ];

  const result = getPortfolioPayoutDistribution({
    type: 'SSQ',
    tickets,
    pool,
  });

  assert.ok(result.conditional, '应包含条件概率分析');
  // C(10, 6) / C(33, 6) = 210 / 1107568
  near(result.conditional.poolHitProbability, 210 / 1107568, 1e-9);
  // 条件概率下（开奖号码全在 1..10 内），中高奖级（如四等奖、五等奖）概率远高于无条件概率
  const condTier4 = result.conditional.conditionalDistribution.find(t => t.tierId === 4)!;
  const uncondTier4 = result.tiers.find(t => t.id === 4)!;
  assert.ok(condTier4.probabilityAtLeastOne > uncondTier4.probabilityAtLeastOne * 100);

  const condTier5 = result.conditional.conditionalDistribution.find(t => t.tierId === 5)!;
  const uncondTier5 = result.tiers.find(t => t.id === 5)!;
  assert.ok(condTier5.probabilityAtLeastOne > uncondTier5.probabilityAtLeastOne * 10);
});

test('大乐透追加投注（addOn: true）成本为 3 元/注，追加奖金正确计入', () => {
  const base = getPortfolioPayoutDistribution({
    type: 'DLT',
    tickets: [{ reds: [1, 2, 3, 4, 5], blues: [1, 2] }],
    addOn: false,
    floatingEstimates: { tier1: 10_000_000, tier2: 2_000_000 },
  });

  const addOn = getPortfolioPayoutDistribution({
    type: 'DLT',
    tickets: [{ reds: [1, 2, 3, 4, 5], blues: [1, 2] }],
    addOn: true,
    floatingEstimates: { tier1: 10_000_000, tier2: 2_000_000 },
  });

  assert.equal(base.cost, 2);
  assert.equal(addOn.cost, 3);
  assert.ok(addOn.portfolio.expectedPayout > base.portfolio.expectedPayout);
});

test('非法输入抛出清晰中文错误', () => {
  assert.throws(() => getPortfolioPayoutDistribution({ type: 'SSQ', tickets: [] }), /至少/);
  assert.throws(
    () =>
      getPortfolioPayoutDistribution({
        type: 'SSQ',
        tickets: [{ reds: [1, 2, 3], blues: [1] }],
      }),
    /号码/
  );
  assert.throws(
    () =>
      getPortfolioPayoutDistribution({
        type: 'SSQ',
        tickets: [{ reds: [1, 2, 3, 4, 5, 40], blues: [1] }],
      }),
    /范围/
  );
});
