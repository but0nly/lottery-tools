"use client";

import { useEffect, useState, useCallback } from 'react';
import { BallPicker } from '@/components/BallPicker';
import { TumblingBall } from '@/components/TumblingBall';
import { LotteryType, generateRandomWithFixed } from '@/lib/combinations';
import { storage, RandomSettings } from '@/lib/storage';
import { toast } from '@/lib/notification';
import { CheckCircle2, Loader2, Plus, Shuffle, Trash2 } from 'lucide-react';
import { useLotteryContext } from '@/app/LotteryContext';

import { triggerFlyToCart } from '@/components/FlyToCartAnimation';

export default function RandomPage() {
  const { activeType: type } = useLotteryContext();
  const [reds, setReds] = useState<number[]>([]);
  const [blues, setBlues] = useState<number[]>([]);
  const [fixedReds, setFixedReds] = useState<number[]>([]);
  const [fixedBlues, setFixedBlues] = useState<number[]>([]);
  const [excludedReds, setExcludedReds] = useState<number[]>([]);
  const [excludedBlues, setExcludedBlues] = useState<number[]>([]);
  const [betCount, setBetCount] = useState<number>(5);
  const [results, setResults] = useState<{reds: number[], blues: number[]}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Track existing data for active states
  const [inSelectionKeys, setInSelectionKeys] = useState<Set<string>>(new Set());

  const loadExistingStates = useCallback(async () => {
    const [selection, settings] = await Promise.all([
      storage.getSelection(),
      storage.getSettings<RandomSettings>('random_params')
    ]);
    
    setInSelectionKeys(new Set(selection.map(i => `${i.type}|${i.reds}|${i.blues}`)));

    if (settings && settings.type === type) {
      if (settings.fixedReds) setFixedReds(settings.fixedReds);
      if (settings.fixedBlues) setFixedBlues(settings.fixedBlues);
      if (settings.excludedReds) setExcludedReds(settings.excludedReds);
      if (settings.excludedBlues) setExcludedBlues(settings.excludedBlues);
      if (settings.betCount) setBetCount(settings.betCount);
    } else {
      handleClear();
    }
    setIsInitialized(true);
  }, [type]);

  useEffect(() => {
    loadExistingStates();
    window.addEventListener('selection-updated', loadExistingStates);
    return () => window.removeEventListener('selection-updated', loadExistingStates);
  }, [loadExistingStates]);

  // Save settings when they change
  useEffect(() => {
    if (!isInitialized) return;
    storage.setSettings('random_params', {
      type,
      fixedReds,
      fixedBlues,
      excludedReds,
      excludedBlues,
      betCount
    });
  }, [type, fixedReds, fixedBlues, excludedReds, excludedBlues, betCount, isInitialized]);

  const handleGenerate = () => {
    const maxFixedRed = type === 'SSQ' ? 5 : 4;
    const maxFixedBlue = type === 'SSQ' ? 1 : 2;
    const reqRed = type === 'SSQ' ? 6 : 5;
    const reqBlue = type === 'SSQ' ? 1 : 2;
    const totalRed = type === 'SSQ' ? 33 : 35;
    const totalBlue = type === 'SSQ' ? 16 : 12;

    if (fixedReds.length > maxFixedRed) {
      toast.show(`红球胆码不能超过 ${maxFixedRed} 个`, 'warning');
      return;
    }
    if (fixedBlues.length > maxFixedBlue) {
      toast.show(`蓝球胆码不能超过 ${maxFixedBlue} 个`, 'warning');
      return;
    }

    // Validation for excluded numbers
    if (totalRed - excludedReds.length < reqRed) {
      toast.show(`排除红球过多，剩余号码不足以组成一注`, 'warning');
      return;
    }
    if (totalBlue - excludedBlues.length < reqBlue) {
      toast.show(`排除蓝球过多，剩余号码不足以组成一注`, 'warning');
      return;
    }

    if (betCount < 1 || betCount > 1000) {
      toast.show("注数请设置为 1 到 1000 之间", 'warning');
      return;
    }

    setIsGenerating(true);
    
    // Slight delay for UX
    setTimeout(() => {
      try {
        const generated = generateRandomWithFixed(type, fixedReds, fixedBlues, betCount, excludedReds, excludedBlues);
        setResults(generated);
        setAnimationKey(prev => prev + 1);
        toast.show(`已随机生成 ${betCount} 注号码`, 'success');
      } catch (e) {
        console.error(e);
        toast.show("生成失败，请重试。", 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 300);
  };

  const handleClear = () => {
    setReds([]);
    setBlues([]);
    setFixedReds([]);
    setFixedBlues([]);
    setExcludedReds([]);
    setExcludedBlues([]);
    setResults([]);
  };

  const handleAddToSelectionAll = async (e: React.MouseEvent) => {
    triggerFlyToCart(e, 'bg-orange-500');
    let saved = 0;
    let skipped = 0;
    for (const r of results) {
      const result = await storage.addToSelection({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'RANDOM'
      });
      if (result) saved++;
      else skipped++;
    }
    window.dispatchEvent(new Event('selection-updated'));
    if (saved > 0) {
      toast.show(`成功加入 ${saved} 注选号${skipped > 0 ? ` (跳过 ${skipped} 注重复)` : ''}`, 'success');
    } else if (skipped > 0) {
      toast.show(`选中的方案均已在选号单中`, 'info');
    }
  };

  return (
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
      
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:pr-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Shuffle className="w-7 h-7" />
            </div>
            智能随机选号
          </h1>
          <p className="text-slate-500 text-sm md:text-base ml-1">支持“定胆”与“杀号”，在概率中寻找惊喜</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 min-w-0">
        <div className="space-y-6 min-w-0">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  设置红球 <span className="text-slate-400 font-medium ml-1">({fixedReds.length} 胆, {excludedReds.length} 杀)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">长按球号码排除(杀号)</div>
              </h3>
            </div>
            <BallPicker 
              max={type === 'SSQ' ? 33 : 35} 
              selected={reds} 
              fixed={fixedReds}
              excluded={excludedReds}
              onChange={setReds} 
              onFixedChange={setFixedReds}
              onExcludedChange={setExcludedReds}
              color="red" 
            />
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                  设置蓝球 <span className="text-slate-400 font-medium ml-1">({fixedBlues.length} 胆, {excludedBlues.length} 杀)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">长按球号码排除(杀号)</div>
              </h3>
            </div>
            <BallPicker 
              max={type === 'SSQ' ? 16 : 12} 
              selected={blues} 
              fixed={fixedBlues}
              excluded={excludedBlues}
              onChange={setBlues} 
              onFixedChange={setFixedBlues}
              onExcludedChange={setExcludedBlues}
              color="blue" 
            />
          </div>

          <div className="flex">
            <button 
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-white/70 backdrop-blur-xl hover:bg-rose-50 border border-white hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-[24px] text-sm font-black transition-all shadow-xl shadow-slate-200/50 active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              清空重置
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-6">生成注数</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
              {[1, 5, 10, 20, 50, 100].map((count) => (
                <button
                  key={count}
                  onClick={() => setBetCount(count)}
                  className={`py-2.5 rounded-xl border-2 font-black transition-all text-sm ${
                    betCount === count
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md shadow-orange-100/50'
                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 text-slate-600'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <div className="relative group">
              <input 
                type="number" 
                value={betCount}
                onChange={(e) => setBetCount(parseInt(e.target.value) || 0)}
                placeholder="自定义注数 (1-1000)"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 outline-none transition-all font-bold shadow-inner"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">注</span>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-3xl shadow-xl shadow-orange-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                正在生成随机组合...
              </>
            ) : (
              <>
                <Shuffle className="w-6 h-6" />
                立即随机生成 {betCount} 注
              </>
            )}
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 md:p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
              生成结果 
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{results.length} 注</span>
            </h3>
            {results.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleAddToSelectionAll(e)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  全部加入选号单
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                <div className="w-24 h-24 bg-slate-50/50 rounded-full flex items-center justify-center shadow-inner">
                  <Shuffle className="w-10 h-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-2">Awaiting Generation</p>
                  <p className="text-sm text-slate-500 font-medium">在左侧设置胆码并选择注数后点击生成</p>
                </div>
              </div>
            ) : (
              results.map((r, i) => {
                const redsStr = r.reds.map(n => n.toString().padStart(2, '0')).join(',');
                const bluesStr = r.blues.map(n => n.toString().padStart(2, '0')).join(',');
                const key = `${type}|${redsStr}|${bluesStr}`;
                const isInSelection = inSelectionKeys.has(key);

                return (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-white rounded-2xl transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100 group relative overflow-hidden">
                    {/* 第一行：序号与号码 (单行排列，支持横滑) */}
                    <div className="flex gap-3 items-center min-w-0">
                      <span className="w-5 h-5 rounded-md bg-white shadow-sm text-slate-400 text-[10px] flex-shrink-0 flex items-center justify-center font-black border border-slate-100">
                        {i + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar pb-0.5">
                        <div className="flex flex-nowrap gap-1.5 items-center">
                          {r.reds.map((n, idx) => {
                            const isFixed = fixedReds.includes(n);
                            return (
                              <TumblingBall 
                                key={`r${n}-${animationKey}`}
                                finalNumber={n}
                                color="red"
                                delay={300 + idx * 100}
                                isFixed={isFixed}
                                max={type === 'SSQ' ? 33 : 35}
                              />
                            );
                          })}
                          <div className="w-px h-4 bg-slate-200 mx-0.5 flex-shrink-0"></div>
                          {r.blues.map((n, idx) => {
                            const isFixed = fixedBlues.includes(n);
                            const redCount = r.reds.length;
                            return (
                              <TumblingBall 
                                key={`b${n}-${animationKey}`}
                                finalNumber={n}
                                color="blue"
                                delay={300 + (redCount + idx) * 100}
                                isFixed={isFixed}
                                max={type === 'SSQ' ? 16 : 12}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* 分割线 */}
                    <div className="h-px bg-slate-100/50 mx-1"></div>

                    {/* 第二行：操作按钮 */}
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={async (e) => {
                          if (isInSelection) {
                            await storage.removeFromSelectionByContent(type, redsStr, bluesStr);
                            window.dispatchEvent(new Event('selection-updated'));
                            toast.show('已从选号单移除', 'info');
                            loadExistingStates();
                          } else {
                            triggerFlyToCart(e, 'bg-orange-500');
                            setTimeout(async () => {
                              await storage.addToSelection({
                                type,
                                reds: redsStr,
                                blues: bluesStr,
                                toolUsed: 'RANDOM'
                              });
                              window.dispatchEvent(new Event('selection-updated'));
                              toast.show('已加入选号单', 'success');
                              loadExistingStates();
                            }, 600);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isInSelection ? 'text-orange-600 bg-orange-50 shadow-inner' : 'text-white bg-slate-900 hover:bg-slate-800 shadow-lg active:scale-95'}`}
                      >
                        {isInSelection ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isInSelection ? '已加入' : '加入选号单'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
