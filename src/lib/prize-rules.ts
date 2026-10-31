/**
 * 奖级规则（Prize Rules）：SSQ / DLT 的奖级定义、单注各奖级概率、固定奖金、
 * 浮动奖级标记与封顶、税费规则。EV 计算器（ticket #8）与回报分布（ticket #10）共用。
 *
 * 规则版本：2024-ssq-dlt-v1
 * 来源：中国福利彩票双色球游戏规则（zhcw.com）、中国体育彩票超级大乐透游戏规则（lottery.gov.cn），
 *       经 2026-10 检索核对：
 *   - SSQ：一等奖 6+1、二等奖 6+0 为浮动奖，单注最高 500 万元；三等奖 3000、四等奖 200、五等奖 10、六等奖 5。
 *   - DLT：一等奖 5+2、二等奖 5+1 为浮动奖，基本投注单注最高 1000 万 / 500 万（本模块的二等奖封顶按 500 万）；
 *          追加投注（每注加 1 元）仅一、二等奖，追加奖金为基本单注奖金的 80%；
 *          三等奖 10000、四等奖 3000、五等奖 300、六等奖 200、七等奖 100、八等奖 15、九等奖 5。
 *   - 税费：单注奖金超过 1 万元按 20% 缴纳偶然所得税（恰为 1 万元不扣）。
 *     本模块把一注的基本奖金与追加奖金合并后判断是否超过 1 万元（简化假设）。
 * 官方规则调整时只需更新本文件并修改 version。
 */
import type { LotteryType } from './combinations';

export interface PrizeTier {
  id: number;
  name: string;
  /** 单注命中该奖级的概率（已合并该奖级的所有中奖形态） */
  probability: number;
  /** 固定奖金（元）；浮动奖级为 null */
  fixedPrize: number | null;
  /** 是否为浮动奖级（奖金取决于奖池与同中注数） */
  floating: boolean;
  /** 浮动奖级单注基本奖金上限（元） */
  cap: number | null;
  /** 追加投注时额外奖金占基本单注奖金的比例（0 表示追加不参与该奖级） */
  addOnRatio: number;
}

export interface PrizeRules {
  type: LotteryType;
  version: string;
  source: string;
  /** 基本投注每注价格 */
  ticketCost: number;
  /** 追加投注每注额外价格；不支持追加为 null */
  addOnCost: number | null;
  /** 单注奖金超过该值（元）才扣税 */
  taxThreshold: number;
  taxRate: number;
  /** 二等奖等浮动奖级默认的当期奖金总额估计（元），仅作输入默认值 */
  defaultSecondPrizeTotal: number;
  tiers: PrizeTier[];
}

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** 命中 hit 个主区号码（总 total 个、开出 pick 个、用户选 pick 个）的超几何概率 */
function hyper(total: number, pick: number, hit: number): number {
  return (comb(pick, hit) * comb(total - pick, pick - hit)) / comb(total, pick);
}

type Shape = [number, number]; // [主区命中数, 副区命中数]

function build(
  main: number,
  mainPick: number,
  sub: number,
  subPick: number,
  defs: { id: number; name: string; shapes: Shape[]; prize: number | null; cap?: number; addOnRatio?: number }[],
): PrizeTier[] {
  return defs.map(d => ({
    id: d.id,
    name: d.name,
    probability: d.shapes.reduce((s, [m, b]) => s + hyper(main, mainPick, m) * hyper(sub, subPick, b), 0),
    fixedPrize: d.prize,
    floating: d.prize === null,
    cap: d.cap ?? null,
    addOnRatio: d.addOnRatio ?? 0,
  }));
}

const VERSION = '2024-ssq-dlt-v1';
const SOURCE = '福彩双色球 / 体彩超级大乐透官方游戏规则，2026-10 核对';

const SSQ: PrizeRules = {
  type: 'SSQ',
  version: VERSION,
  source: SOURCE,
  ticketCost: 2,
  addOnCost: null,
  taxThreshold: 10000,
  taxRate: 0.2,
  defaultSecondPrizeTotal: 3_000_000,
  tiers: build(33, 6, 16, 1, [
    { id: 1, name: '一等奖（6+1）', shapes: [[6, 1]], prize: null, cap: 5_000_000 },
    { id: 2, name: '二等奖（6+0）', shapes: [[6, 0]], prize: null, cap: 5_000_000 },
    { id: 3, name: '三等奖（5+1）', shapes: [[5, 1]], prize: 3000 },
    { id: 4, name: '四等奖（5+0 / 4+1）', shapes: [[5, 0], [4, 1]], prize: 200 },
    { id: 5, name: '五等奖（4+0 / 3+1）', shapes: [[4, 0], [3, 1]], prize: 10 },
    { id: 6, name: '六等奖（2+1 / 1+1 / 0+1）', shapes: [[2, 1], [1, 1], [0, 1]], prize: 5 },
  ]),
};

const DLT: PrizeRules = {
  type: 'DLT',
  version: VERSION,
  source: SOURCE,
  ticketCost: 2,
  addOnCost: 1,
  taxThreshold: 10000,
  taxRate: 0.2,
  defaultSecondPrizeTotal: 3_000_000,
  tiers: build(35, 5, 12, 2, [
    { id: 1, name: '一等奖（5+2）', shapes: [[5, 2]], prize: null, cap: 10_000_000, addOnRatio: 0.8 },
    { id: 2, name: '二等奖（5+1）', shapes: [[5, 1]], prize: null, cap: 5_000_000, addOnRatio: 0.8 },
    { id: 3, name: '三等奖（5+0）', shapes: [[5, 0]], prize: 10000 },
    { id: 4, name: '四等奖（4+2）', shapes: [[4, 2]], prize: 3000 },
    { id: 5, name: '五等奖（4+1）', shapes: [[4, 1]], prize: 300 },
    { id: 6, name: '六等奖（3+2）', shapes: [[3, 2]], prize: 200 },
    { id: 7, name: '七等奖（4+0）', shapes: [[4, 0]], prize: 100 },
    { id: 8, name: '八等奖（3+1 / 2+2）', shapes: [[3, 1], [2, 2]], prize: 15 },
    { id: 9, name: '九等奖（3+0 / 1+2 / 2+1 / 0+2）', shapes: [[3, 0], [1, 2], [2, 1], [0, 2]], prize: 5 },
  ]),
};

export function getPrizeRules(type: LotteryType): PrizeRules {
  if (type === 'SSQ') return SSQ;
  if (type === 'DLT') return DLT;
  throw new Error(`不支持的彩种：${String(type)}`);
}

/** 单注奖金扣税：超过阈值整笔扣税，恰好等于阈值不扣 */
export function applyTax(prize: number, rules: Pick<PrizeRules, 'taxThreshold' | 'taxRate'>): number {
  return prize > rules.taxThreshold ? prize * (1 - rules.taxRate) : prize;
}
