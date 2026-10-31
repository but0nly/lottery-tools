'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Loader2, Info, Scale, ShieldCheck, AlertCircle } from 'lucide-react';
import type { LotteryType } from '../lib/combinations';
import type { PortfolioPayoutResult } from '../lib/payout';

interface PayoutDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LotteryType;
  tickets: { reds: number[]; blues: number[] }[];
  pool?: number[];
  addOn?: boolean;
}

export function PayoutDistributionModal({
  isOpen,
  onClose,
  type,
  tickets,
  pool,
  addOn = false,
}: PayoutDistributionModalProps) {
  const [result, setResult] = useState<PortfolioPayoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!isOpen || tickets.length === 0) {
      return;
    }

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setResult(null);
    });

    // 启动 Web Worker 执行大规模概率枚举
    try {
      const worker = new Worker(new URL('../lib/payout.worker.ts', import.meta.url));
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<{ kind: string; result?: PortfolioPayoutResult; message?: string }>) => {
        if (workerRef.current !== worker) return;
        if (e.data.kind === 'complete' && e.data.result) {
          setResult(e.data.result);
          setLoading(false);
        } else if (e.data.kind === 'error') {
          setError(e.data.message || '计算出错');
          setLoading(false);
        }
      };

      worker.onerror = err => {
        if (workerRef.current !== worker) return;
        console.error('Payout worker error:', err);
        setError('计算发生未知错误');
        setLoading(false);
      };

      worker.postMessage({
        type,
        tickets,
        pool,
        addOn,
      });
    } catch (err) {
      console.error('Failed to create worker:', err);
      // Fallback to direct synchronous execution if worker not available
      import('../lib/payout')
        .then(({ getPortfolioPayoutDistribution }) => {
          const res = getPortfolioPayoutDistribution({
            type,
            tickets,
            pool,
            addOn,
          });
          setResult(res);
          setLoading(false);
        })
        .catch(e => {
          setError(e instanceof Error ? e.message : '计算失败');
          setLoading(false);
        });
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isOpen, type, tickets, pool, addOn]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                整组方案奖级概率与回报分布
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">
                  {type === 'SSQ' ? '双色球' : '大乐透'} · {tickets.length} 注
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                基于组合数学与概率论，分析全样本空间下的中奖与盈亏分布
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗主体内容 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600">正在遍历组合样本空间计算回报分布...</p>
              <p className="text-xs text-slate-400">大样本方案采用后台多线程子集分组计数</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-rose-700 font-medium">
                <p className="font-bold">计算中断</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* 核心盈亏与期望卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">方案总成本</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900">
                    ¥{result.cost}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {result.ticketCount} 注 × ¥{result.cost / result.ticketCount}
                  </span>
                </div>

                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100/60">
                  <span className="text-[11px] font-bold text-indigo-600 block mb-1">理论期望总回报</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-900">
                    ¥{result.portfolio.expectedPayout.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-indigo-600/80 block mt-0.5 font-bold">
                    期望返还率: {((result.portfolio.expectedPayout / result.cost) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100/60">
                  <span className="text-[11px] font-bold text-rose-600 block mb-1">亏损概率</span>
                  <span className="text-lg sm:text-xl font-black text-rose-800">
                    {(result.portfolio.lossProbability * 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-rose-600/80 block mt-0.5">
                    回报 &lt; ¥{result.cost}
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100/60">
                  <span className="text-[11px] font-bold text-emerald-600 block mb-1">保本及以上概率</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-800">
                    {(result.portfolio.breakEvenProbability * 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                    回报 ≥ ¥{result.cost}
                  </span>
                </div>
              </div>

              {/* 核心提示条：EV 不变定律 */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 font-medium leading-relaxed">
                  <span className="font-bold">统计学提示：</span>
                  {result.explanation.evNote}
                </div>
              </div>

              {/* 条件保证与真实无条件概率对比（若有 pool） */}
              {result.conditional && (
                <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border border-indigo-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs sm:text-sm font-black text-indigo-950">
                      条件保证 vs 真实开奖概率
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {result.explanation.conditionNote}
                  </p>
                  {result.conditional.guaranteedMinHitTier && (
                    <div className="inline-block px-2.5 py-1 bg-indigo-100/80 text-indigo-800 text-[11px] font-black rounded-lg">
                      {result.conditional.guaranteedMinHitTier} (若前提满足)
                    </div>
                  )}
                </div>
              )}

              {/* 奖级命中概率明细表 */}
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center justify-between">
                  <span>各奖级命中概率与期望注数</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {result.method === 'exact' ? '全样本空间精确枚举' : '10万次抽样蒙特卡洛'}
                  </span>
                </h4>

                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                          <th className="py-2.5 px-3">奖级</th>
                          <th className="py-2.5 px-3">至少中1注概率</th>
                          <th className="py-2.5 px-3">期望中奖注数</th>
                          <th className="py-2.5 px-3 text-slate-400">同注数纯随机基准</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {result.tiers.map(t => {
                          const isLikely = t.probabilityAtLeastOne > 0.01;
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900">{t.name}</td>
                              <td className="py-2 px-3">
                                <span className={isLikely ? 'text-indigo-600 font-black' : 'text-slate-700'}>
                                  {t.probabilityAtLeastOne < 0.0001
                                    ? `${(t.probabilityAtLeastOne * 100).toExponential(2)}%`
                                    : `${(t.probabilityAtLeastOne * 100).toFixed(3)}%`}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {t.expectedCount < 0.001
                                  ? t.expectedCount.toExponential(2)
                                  : t.expectedCount.toFixed(3)}{' '}
                                注
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                {t.randomProbabilityAtLeastOne < 0.0001
                                  ? `${(t.randomProbabilityAtLeastOne * 100).toExponential(2)}%`
                                  : `${(t.randomProbabilityAtLeastOne * 100).toFixed(3)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 独立随机方案基准对照 */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block">对照组：相同注数（{result.ticketCount} 注）纯随机选号</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                  <div>
                    随机理论期望回报:{' '}
                    <span className="font-bold text-slate-900">
                      ¥{result.randomBaseline.expectedPayout.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    随机回报波动(标准差):{' '}
                    <span className="font-bold text-slate-900">
                      ¥{result.randomBaseline.stdDevPayout.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    随机亏损概率:{' '}
                    <span className="font-bold text-slate-900">
                      {(result.randomBaseline.lossProbability * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  * 缩水选号方案由于各注号码之间存在交集正相关，回报标准差为 ¥
                  {result.portfolio.stdDevPayout.toFixed(1)}，中奖注数更加集中，但总体均值期望绝不增加。
                </p>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮栏 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
}
