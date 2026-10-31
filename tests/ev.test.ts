import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getPrizeRules, applyTax } from '../src/lib/prize-rules.ts';
import { computeEV, poissonShareFactor } from '../src/lib/ev.ts';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !≈ ${b}`);

test('一等奖概率符合官方，总中奖率合理', () => {
  near(getPrizeRules('SSQ').tiers[0].probability, 1 / 17721088, 1e-15);
  near(getPrizeRules('DLT').tiers[0].probability, 1 / 21425712, 1e-15);
  near(getPrizeRules('SSQ').tiers.reduce((s, x) => s + x.probability, 0), 0.0672, 5e-4);
  near(getPrizeRules('DLT').tiers.reduce((s, x) => s + x.probability, 0), 0.0667, 5e-4);
});

test('规则含版本、来源、浮动奖级标记与税费规则', () => {
  const r = getPrizeRules('SSQ');
  assert.ok(r.version && r.source);
  assert.deepEqual(r.tiers.filter(t => t.floating).map(t => t.id), [1, 2]);
  assert.equal(r.tiers.find(t => t.id === 3)!.fixedPrize, 3000);
  assert.equal(r.taxThreshold, 10000);
  assert.equal(r.taxRate, 0.2);
});

test('扣税边界：恰好1万元不扣，超过1万元整笔扣20%', () => {
  const r = getPrizeRules('SSQ');
  assert.equal(applyTax(10000, r), 10000);
  near(applyTax(10000.01, r), 10000.01 * 0.8);
  assert.equal(applyTax(3000, r), 3000);
});

test('λ→0 时分得比例→1；λ很大时≈1/λ', () => {
  assert.equal(poissonShareFactor(0), 1);
  near(poissonShareFactor(1e-9), 1, 1e-8);
  near(poissonShareFactor(1000) * 1000, 1, 2e-3);
  near(poissonShareFactor(2), (1 - Math.exp(-2)) / 2);
});

test('固定奖级 EV 为概率×奖金', () => {
  const rules = getPrizeRules('SSQ');
  const ev = computeEV({ type: 'SSQ', pool: 0, sales: 0, secondPrizeTotal: 0 });
  const fixed = rules.tiers.filter(t => !t.floating).reduce((s, t) => s + t.probability * t.fixedPrize!, 0);
  near(ev.evPretax, fixed);
  near(ev.evPosttax, fixed);
  near(ev.returnRatePretax, fixed / 2);
  const c3 = ev.contributions.find(c => c.id === 3)!;
  near(c3.evPretax, ((6 * 27) / 1107568) * (1 / 16) * 3000);
});

test('浮动奖级：无封顶影响时 EV = p × 奖池 × (1-e^-λ)/λ', () => {
  const sales = 1e8;
  const ev = computeEV({ type: 'SSQ', pool: 1e6, sales, secondPrizeTotal: 0 });
  const p = getPrizeRules('SSQ').tiers[0].probability;
  const lambda = sales * p;
  near(ev.lambda, lambda, 1e-12);
  near(ev.contributions[0].evPretax, p * 1e6 * poissonShareFactor(lambda), 1e-9);
});

test('封顶：SSQ 头奖单注不超过500万，奖池再大 EV 不变', () => {
  const a = computeEV({ type: 'SSQ', pool: 5e9, sales: 0, secondPrizeTotal: 0 });
  const p = getPrizeRules('SSQ').tiers[0].probability;
  near(a.contributions[0].evPretax, p * 5e6);
  const b = computeEV({ type: 'SSQ', pool: 5e10, sales: 0, secondPrizeTotal: 0 });
  near(a.evPretax, b.evPretax);
});

test('税后 EV 小于税前，回报率=EV/成本，DLT 追加成本为3元', () => {
  const ev = computeEV({ type: 'SSQ', pool: 3e8, sales: 3e8 });
  assert.ok(ev.evPosttax < ev.evPretax);
  near(ev.returnRatePosttax, ev.evPosttax / 2);
  const dlt = computeEV({ type: 'DLT', pool: 1e9, sales: 3e8, addOn: true });
  assert.equal(dlt.costPerTicket, 3);
  const dltBase = computeEV({ type: 'DLT', pool: 1e9, sales: 3e8 });
  assert.equal(dltBase.costPerTicket, 2);
  assert.ok(dlt.evPretax > dltBase.evPretax);
});

test('购买注数缩放总成本与总EV', () => {
  const ev = computeEV({ type: 'SSQ', pool: 1e8, sales: 2e8, tickets: 10 });
  near(ev.totalCost, 20);
  near(ev.totalEvPosttax, ev.evPosttax * 10);
});

test('奖池阈值：SSQ 受封顶无法回本返回 null；若可达则阈值处回报率≈1', () => {
  const ssq = computeEV({ type: 'SSQ', sales: 2e8, pool: 0 }).breakEvenPool;
  assert.equal(ssq.posttax, null);
  assert.equal(ssq.pretax, null);
  const dlt = computeEV({ type: 'DLT', sales: 1e8, pool: 0 }).breakEvenPool;
  for (const key of ['pretax', 'posttax'] as const) {
    if (dlt[key] !== null) {
      const at = computeEV({ type: 'DLT', sales: 1e8, pool: dlt[key]! });
      near(key === 'pretax' ? at.returnRatePretax : at.returnRatePosttax, 1, 1e-6);
    }
  }
});

test('非法输入抛出明确错误', () => {
  assert.throws(() => computeEV({ type: 'SSQ', pool: -1, sales: 0 }), /奖池/);
  assert.throws(() => computeEV({ type: 'SSQ', pool: 0, sales: NaN }), /销量/);
  assert.throws(() => computeEV({ type: 'SSQ', pool: 0, sales: 0, tickets: 0 }), /注数/);
  assert.throws(() => computeEV({ type: 'SSQ', pool: 0, sales: 0, tickets: 1.5 }), /注数/);
  assert.throws(() => computeEV({ type: 'SSQ', pool: 0, sales: 0, addOn: true }), /追加/);
  assert.throws(() => computeEV({ type: 'XX' as 'SSQ', pool: 0, sales: 0 }), /彩种/);
});
