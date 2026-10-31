import type { LotteryType } from './combinations';
import { applyTax, getPrizeRules } from './prize-rules.ts';

export interface EVInput {
  type: LotteryType;
  /** 一等奖奖金总额（当期奖池滚存 + 本期分配），元 */
  pool: number;
  /** 预计本期销量（注） */
  sales: number;
  /** 购买注数，默认 1 */
  tickets?: number;
  /** DLT 是否追加 */
  addOn?: boolean;
  /** 二等奖奖金总额，元；默认取规则中的估计值 */
  secondPrizeTotal?: number;
}

export interface TierContribution {
  id: number;
  name: string;
  probability: number;
  evPretax: number;
  evPosttax: number;
}

export interface EVResult {
  costPerTicket: number;
  /** 头奖其他人同中注数的期望 λ = 销量 × p_头奖 */
  lambda: number;
  evPretax: number;
  evPosttax: number;
  returnRatePretax: number;
  returnRatePosttax: number;
  totalCost: number;
  totalEvPretax: number;
  totalEvPosttax: number;
  contributions: TierContribution[];
  /** 使回报率 ≥ 1 所需的一等奖奖金总额（给定销量）；封顶导致不可能时为 null */
  breakEvenPool: { pretax: number | null; posttax: number | null };
  rulesVersion: string;
}

/** E[1/(K+1)]，K ~ Poisson(λ)，闭式 (1-e^-λ)/λ；λ→0 取极限 1 */
export function poissonShareFactor(lambda: number): number {
  if (lambda === 0) return 1;
  return -Math.expm1(-lambda) / lambda;
}

/** 对 K ~ Poisson(λ) 求 E[f(K)]（数值求和，用于需要封顶/扣税的非线性情形） */
function expectOverPoisson(lambda: number, f: (k: number) => number): number {
  if (lambda <= 0) return f(0);
  const kMax = Math.ceil(lambda + 12 * Math.sqrt(lambda) + 50);
  let logFact = 0;
  let sum = 0;
  const logLambda = Math.log(lambda);
  for (let k = 0; k <= kMax; k++) {
    if (k > 0) logFact += Math.log(k);
    const w = Math.exp(-lambda + k * logLambda - logFact);
    if (w > 0) sum += w * f(k);
  }
  return sum;
}

function validate(input: EVInput): void {
  const { pool, sales, tickets = 1, secondPrizeTotal } = input;
  if (!Number.isFinite(pool) || pool < 0) throw new RangeError('奖池必须是不小于 0 的有限数');
  if (!Number.isFinite(sales) || sales < 0) throw new RangeError('预计销量必须是不小于 0 的有限数');
  if (!Number.isInteger(tickets) || tickets < 1) throw new RangeError('购买注数必须是不小于 1 的整数');
  if (secondPrizeTotal !== undefined && (!Number.isFinite(secondPrizeTotal) || secondPrizeTotal < 0)) {
    throw new RangeError('二等奖奖金总额必须是不小于 0 的有限数');
  }
}

function evPerTicket(input: EVInput, bank1: number) {
  const rules = getPrizeRules(input.type);
  const addOn = !!input.addOn;
  const bank2 = input.secondPrizeTotal ?? rules.defaultSecondPrizeTotal;
  const contributions: TierContribution[] = [];
  let lambda1 = 0;
  for (const tier of rules.tiers) {
    let pre: number;
    let post: number;
    if (!tier.floating) {
      pre = tier.probability * tier.fixedPrize!;
      post = tier.probability * applyTax(tier.fixedPrize!, rules);
    } else {
      const bank = tier.id === 1 ? bank1 : bank2;
      const lambda = input.sales * tier.probability;
      if (tier.id === 1) lambda1 = lambda;
      const ratio = addOn ? tier.addOnRatio : 0;
      const prize = (k: number) => {
        const base = Math.min(bank / (k + 1), tier.cap ?? Infinity);
        return base * (1 + ratio);
      };
      pre = tier.probability * expectOverPoisson(lambda, prize);
      post = tier.probability * expectOverPoisson(lambda, k => applyTax(prize(k), rules));
    }
    contributions.push({ id: tier.id, name: tier.name, probability: tier.probability, evPretax: pre, evPosttax: post });
  }
  return {
    contributions,
    lambda: lambda1,
    pre: contributions.reduce((s, c) => s + c.evPretax, 0),
    post: contributions.reduce((s, c) => s + c.evPosttax, 0),
  };
}

function solveBreakEven(input: EVInput, cost: number, pick: 'pre' | 'post'): number | null {
  const value = (bank: number) => evPerTicket(input, bank)[pick];
  const huge = 1e15;
  if (value(huge) < cost) return null;
  if (value(0) >= cost) return 0;
  let lo = 0;
  let hi = huge;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (value(mid) >= cost) hi = mid;
    else lo = mid;
    if (hi - lo < 1) break;
  }
  return hi;
}

export function computeEV(input: EVInput): EVResult {
  const rules = getPrizeRules(input.type);
  validate(input);
  if (input.addOn && rules.addOnCost === null) throw new Error('该彩种不支持追加投注');
  const tickets = input.tickets ?? 1;
  const cost = rules.ticketCost + (input.addOn ? rules.addOnCost! : 0);
  const r = evPerTicket(input, input.pool);
  return {
    costPerTicket: cost,
    lambda: r.lambda,
    evPretax: r.pre,
    evPosttax: r.post,
    returnRatePretax: r.pre / cost,
    returnRatePosttax: r.post / cost,
    totalCost: cost * tickets,
    totalEvPretax: r.pre * tickets,
    totalEvPosttax: r.post * tickets,
    contributions: r.contributions,
    breakEvenPool: { pretax: solveBreakEven(input, cost, 'pre'), posttax: solveBreakEven(input, cost, 'post') },
    rulesVersion: rules.version,
  };
}
