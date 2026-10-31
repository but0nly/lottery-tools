"use client";

import { useMemo, useState } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
import { useLotteryContext } from '@/app/LotteryContext';
import { computeEV, type EVResult } from '@/lib/ev';
import { getPrizeRules } from '@/lib/prize-rules';

const DEFAULTS = {
  SSQ: { pool: '10000', sales: '17000', second: '300' },
  DLT: { pool: '10000', sales: '15000', second: '300' },
} as const;

const yuan = (n: number) => `${n.toFixed(n < 1 ? 4 : 2)} 元`;
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const wan = (n: number) => `${(n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元`;

function Field({ label, unit, value, onChange, hint }: { label: string; unit: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <div className="mt-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-sky-400">
        <input
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 py-3 bg-transparent outline-none font-black text-slate-900"
        />
        <span className="text-xs font-bold text-slate-400 flex-shrink-0">{unit}</span>
      </div>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export default function EVPage() {
  const { activeType: type } = useLotteryContext();
  const rules = getPrizeRules(type);
  const [fields, setFields] = useState<Record<string, { pool: string; sales: string; second: string }>>({
    SSQ: { ...DEFAULTS.SSQ },
    DLT: { ...DEFAULTS.DLT },
  });
  const f = fields[type];
  const [tickets, setTickets] = useState('1');
  const [addOn, setAddOn] = useState(false);
  const set = (k: 'pool' | 'sales' | 'second', v: string) =>
    setFields(prev => ({ ...prev, [type]: { ...prev[type], [k]: v } }));

  const { result, error } = useMemo<{ result: EVResult | null; error: string | null }>(() => {
    try {
      return {
        result: computeEV({
          type,
          pool: Number(f.pool) * 10000,
          sales: Number(f.sales) * 10000,
          secondPrizeTotal: Number(f.second) * 10000,
          tickets: Number(tickets),
          addOn: type === 'DLT' && addOn,
        }),
        error: null,
      };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : '输入有误' };
    }
  }, [type, f, tickets, addOn]);

  const losing = result !== null && result.returnRatePosttax < 1;

  return (
    <div className="relative p-4 md:p-8 pb-32 max-w-3xl mx-auto space-y-6">
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl opacity-60 -mr-24 -mt-24" />
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Scale className="w-5 h-5 text-white" />
          </span>
          期望值（EV）计算器
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          按奖池、销量与税费估算每注 {rules.ticketCost} 元的理论回报。规则版本 {rules.version}。
        </p>
      </div>

      <section className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="一等奖奖金总额（奖池）" unit="万元" value={f.pool} onChange={v => set('pool', v)} />
          <Field label="预计本期销量" unit="万注" value={f.sales} onChange={v => set('sales', v)} hint="决定头奖平分人数" />
          <Field label="二等奖奖金总额" unit="万元" value={f.second} onChange={v => set('second', v)} />
          <Field label="购买注数" unit="注" value={tickets} onChange={setTickets} />
        </div>
        {type === 'DLT' && (
          <button
            type="button"
            aria-pressed={addOn}
            onClick={() => setAddOn(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border font-bold text-sm transition-all active:scale-95 ${
              addOn ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span>追加投注（每注 3 元）</span>
            <span>{addOn ? '已追加 ✓' : '未追加'}</span>
          </button>
        )}
      </section>

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      {result && (
        <>
          <section className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50">
                <div className="text-[10px] font-black text-slate-400">每注 EV（税后）</div>
                <div className="text-xl font-black text-slate-900">{yuan(result.evPosttax)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50">
                <div className="text-[10px] font-black text-slate-400">每注 EV（税前）</div>
                <div className="text-xl font-black text-slate-900">{yuan(result.evPretax)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50">
                <div className="text-[10px] font-black text-slate-400">回报率（税后）</div>
                <div className={`text-xl font-black ${losing ? 'text-rose-600' : 'text-emerald-600'}`}>{pct(result.returnRatePosttax)}</div>
                <div className="text-[10px] text-slate-400">税前 {pct(result.returnRatePretax)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50">
                <div className="text-[10px] font-black text-slate-400">头奖期望同中人数 λ</div>
                <div className="text-xl font-black text-slate-900">{result.lambda.toFixed(3)}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              共投入 <b>{result.totalCost} 元</b>，理论期望返还 <b>{yuan(result.totalEvPosttax)}</b>（税后）。
            </p>
            <p className="text-sm text-slate-600">
              {result.breakEvenPool.posttax === null
                ? '在该销量下，即使奖池无限大，受单注封顶影响税后 EV 也无法达到 1（不可能回本）。'
                : `在该销量下，一等奖奖金总额需达到 ${wan(result.breakEvenPool.posttax)}（税后）才能让 EV ≥ 1。`}
            </p>
          </section>

          <section className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-xl p-5">
            <h2 className="font-black text-slate-900 mb-3">各奖级对 EV 的贡献</h2>
            <ul className="divide-y divide-slate-100">
              {result.contributions.map(c => (
                <li key={c.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-[10px] text-slate-400">概率 1/{Math.round(1 / c.probability).toLocaleString('zh-CN')}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-slate-900">{yuan(c.evPosttax)}</div>
                    <div className="text-[10px] text-slate-400">税前 {yuan(c.evPretax)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          EV 小于 1 表示长期必然亏损。选号策略不会改变中奖概率，只可能影响中奖后的分奖（参见反向冷门分析）。
          结果为泊松近似估计，奖池、销量需自行输入，仅供参考。
        </p>
      </div>
    </div>
  );
}
