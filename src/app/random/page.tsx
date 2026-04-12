"use client";

import { useEffect, useState, useCallback } from 'react';
import { BallPicker } from '@/components/BallPicker';
import { LotteryType, generateRandomWithFixed } from '@/lib/combinations';
import { storage } from '@/lib/storage';
import { refreshCart } from '@/components/Cart';
import { toast } from '@/lib/notification';
import { Save, CheckCircle2, Loader2, Plus, ShoppingCart, Bookmark, Shuffle, Trash2 } from 'lucide-react';

export default function RandomPage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [reds, setReds] = useState<number[]>([]);
  const [blues, setBlues] = useState<number[]>([]);
  const [fixedReds, setFixedReds] = useState<number[]>([]);
  const [fixedBlues, setFixedBlues] = useState<number[]>([]);
  const [betCount, setBetCount] = useState<number>(5);
  const [results, setResults] = useState<{reds: number[], blues: number[]}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Track existing data for active states
  const [inCartKeys, setInCartKeys] = useState<Set<string>>(new Set());
  const [inSavedKeys, setInSavedKeys] = useState<Set<string>>(new Set());

  const loadExistingStates = useCallback(async () => {
    const [cart, saved] = await Promise.all([
      storage.getCart(),
      storage.getAllSaved()
    ]);
    
    setInCartKeys(new Set(cart.map(i => `${i.type}|${i.reds}|${i.blues}`)));
    setInSavedKeys(new Set(saved.map(i => `${i.type}|${i.reds}|${i.blues}`)));
  }, []);

  useEffect(() => {
    loadExistingStates();
    window.addEventListener('cart-updated', loadExistingStates);
    return () => window.removeEventListener('cart-updated', loadExistingStates);
  }, [loadExistingStates]);

  const handleGenerate = () => {
    const maxFixedRed = type === 'SSQ' ? 5 : 4;
    const maxFixedBlue = type === 'SSQ' ? 1 : 2;

    if (fixedReds.length > maxFixedRed) {
      toast.show(`红球胆码不能超过 ${maxFixedRed} 个`, 'warning');
      return;
    }
    if (fixedBlues.length > maxFixedBlue) {
      toast.show(`蓝球胆码不能超过 ${maxFixedBlue} 个`, 'warning');
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
        const generated = generateRandomWithFixed(type, fixedReds, fixedBlues, betCount);
        setResults(generated);
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
    setResults([]);
  };

  const handleSaveAll = async () => {
    let saved = 0;
    for (const r of results) {
      await storage.save({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'RANDOM'
      });
      saved++;
    }
    toast.show(`成功保存 ${saved} 注到收藏库`, 'success');
    loadExistingStates();
  };

  const handleAddToCartAll = async () => {
    let saved = 0;
    let skipped = 0;
    for (const r of results) {
      const result = await storage.addToCart({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'RANDOM'
      });
      if (result) saved++;
      else skipped++;
    }
    refreshCart();
    if (saved > 0) {
      toast.show(`成功加购 ${saved} 注${skipped > 0 ? ` (跳过 ${skipped} 注重复)` : ''}`, 'success');
    } else if (skipped > 0) {
      toast.show(`选中的方案均已在购物车中`, 'info');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Shuffle className="w-8 h-8 text-orange-500" />
          智能随机生成器
        </h1>
        <button 
          onClick={handleClear}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          清空重选
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 md:gap-4 mb-8">
        <button 
          onClick={() => { setType('SSQ'); handleClear(); }}
          className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${type === 'SSQ' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          双色球 (SSQ)
        </button>
        <button 
          onClick={() => { setType('DLT'); handleClear(); }}
          className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${type === 'DLT' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          大乐透 (DLT)
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8 min-w-0">
        <div className="space-y-4 md:space-y-6 min-w-0">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-4">
              <h3 className="text-base md:text-lg font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  设置红球胆码 ({fixedReds.length})
                </div>
                <span className="text-[10px] md:text-xs text-slate-400 font-normal">
                  点击数字设为胆码 (固定不变)
                </span>
              </h3>
            </div>
            <BallPicker 
              max={type === 'SSQ' ? 33 : 35} 
              selected={reds} 
              fixed={fixedReds}
              onChange={setReds} 
              onFixedChange={setFixedReds}
              color="red" 
            />
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-4">
              <h3 className="text-base md:text-lg font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  设置蓝球胆码 ({fixedBlues.length})
                </div>
                <span className="text-[10px] md:text-xs text-slate-400 font-normal">
                  点击数字设为胆码 (固定不变)
                </span>
              </h3>
            </div>
            <BallPicker 
              max={type === 'SSQ' ? 16 : 12} 
              selected={blues} 
              fixed={fixedBlues}
              onChange={setBlues} 
              onFixedChange={setFixedBlues}
              color="blue" 
            />
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base md:text-lg font-semibold mb-4">生成注数</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {[1, 5, 10, 20, 50, 100].map((count) => (
                <button
                  key={count}
                  onClick={() => setBetCount(count)}
                  className={`flex-1 min-w-[60px] py-2 rounded-xl border font-bold transition-all ${
                    betCount === count
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'
                  }`}
                >
                  {count}注
                </button>
              ))}
            </div>
            <div className="relative">
              <input 
                type="number" 
                value={betCount}
                onChange={(e) => setBetCount(parseInt(e.target.value) || 0)}
                placeholder="自定义注数 (1-1000)"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">注</span>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在生成随机组合...
              </>
            ) : (
              <>
                <Shuffle className="w-5 h-5" />
                立即随机生成 {betCount} 注
              </>
            )}
          </button>
        </div>

        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
              生成结果 
              <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{results.length} 注</span>
            </h3>
            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleAddToCartAll}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  全部加购
                </button>
                <button 
                  onClick={handleSaveAll}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  全部收藏
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <Shuffle className="w-8 h-8 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-500">待生成号码</p>
                  <p className="text-sm">在左侧设置胆码并选择注数后点击生成</p>
                </div>
              </div>
            ) : (
              results.map((r, i) => {
                const redsStr = r.reds.map(n => n.toString().padStart(2, '0')).join(',');
                const bluesStr = r.blues.map(n => n.toString().padStart(2, '0')).join(',');
                const key = `${type}|${redsStr}|${bluesStr}`;
                const isSaved = inSavedKeys.has(key);
                const isInCart = inCartKeys.has(key);

                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:bg-white hover:shadow-md group">
                    <div className="flex gap-2 items-start min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-500 text-[10px] flex-shrink-0 flex items-center justify-center font-bold mt-1.5 sm:mt-1">
                        {i + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-7 sm:flex sm:flex-wrap gap-1.5 items-center">
                          {r.reds.map(n => {
                            const isFixed = fixedReds.includes(n);
                            return (
                              <span 
                                key={`r${n}`} 
                                className={`aspect-square w-full sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold shadow-sm transition-transform ${
                                  isFixed 
                                    ? 'bg-red-700 text-white ring-2 ring-red-200 ring-offset-1' 
                                    : 'bg-red-500 text-white'
                                }`}
                              >
                                {n.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                          {r.blues.map(n => {
                            const isFixed = fixedBlues.includes(n);
                            return (
                              <span 
                                key={`b${n}`} 
                                className={`aspect-square w-full sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold shadow-sm transition-transform ${
                                  isFixed 
                                    ? 'bg-blue-700 text-white ring-2 ring-blue-200 ring-offset-1' 
                                    : 'bg-blue-500 text-white'
                                }`}
                              >
                                {n.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50">
                      <button 
                        onClick={async () => {
                          if (isSaved) {
                            await storage.deleteSavedByContent(type, redsStr, bluesStr);
                            toast.show('已从库中移除', 'info');
                          } else {
                            await storage.save({
                              type,
                              reds: redsStr,
                              blues: bluesStr,
                              toolUsed: 'RANDOM'
                            });
                            toast.show('已保存至库', 'success');
                          }
                          loadExistingStates();
                        }}
                        className={`p-2 rounded-lg transition-all ${isSaved ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (isInCart) {
                            await storage.removeFromCartByContent(type, redsStr, bluesStr);
                            refreshCart();
                            toast.show('已从购物车移除', 'info');
                          } else {
                            await storage.addToCart({
                              type,
                              reds: redsStr,
                              blues: bluesStr,
                              toolUsed: 'RANDOM'
                            });
                            refreshCart();
                            toast.show('已加入购物车', 'success');
                          }
                          loadExistingStates();
                        }}
                        className={`p-2 rounded-lg transition-all ${isInCart ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                      >
                        {isInCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
