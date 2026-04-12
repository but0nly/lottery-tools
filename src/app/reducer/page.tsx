"use client";

import { useEffect, useState, useCallback } from 'react';
import { BallPicker } from '@/components/BallPicker';
import { generateCombinations, LotteryType, FilterConditions, WheelingMode } from '@/lib/combinations';
import { storage, SavedCombination } from '@/lib/storage';
import { refreshCart } from '@/components/Cart';
import { toast } from '@/lib/notification';
import { Save, CheckCircle2, AlertTriangle, Loader2, Plus, ShoppingCart, Bookmark, Shuffle, HelpCircle, Info, Calculator, Trash2 } from 'lucide-react';

export default function ReducerPage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [wheelingMode, setWheelingMode] = useState<WheelingMode>('FULL');
  const [reds, setReds] = useState<number[]>([]);
  const [blues, setBlues] = useState<number[]>([]);
  const [results, setResults] = useState<{reds: number[], blues: number[]}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWheelingTip, setShowWheelingTip] = useState(false);
  const [showFilterTip, setShowFilterTip] = useState(false);
  
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

  const [conditions, setConditions] = useState<FilterConditions>({
    minSum: undefined,
    maxSum: undefined,
    maxConsecutive: undefined,
  });

  const handleGenerate = () => {
    const minRed = type === 'SSQ' ? 6 : 5;
    const minBlue = type === 'SSQ' ? 1 : 2;
    if (reds.length < minRed || blues.length < minBlue) {
      toast.show(`请至少选择 ${minRed} 个红球和 ${minBlue} 个蓝球`, 'warning');
      return;
    }

    if (wheelingMode !== 'FULL' && reds.length > 16) {
      toast.show("为了保证计算性能，智能缩水模式下红球最多选择16个号码。", 'warning');
      return;
    }
    
    setIsGenerating(true);
    
    // Use setTimeout to allow UI to show loader
    setTimeout(() => {
      // Clean up conditions
      const cleanedConditions: FilterConditions = {};
      if (conditions.minSum && conditions.minSum > 0) cleanedConditions.minSum = conditions.minSum;
      if (conditions.maxSum && conditions.maxSum > 0) cleanedConditions.maxSum = conditions.maxSum;
      if (conditions.maxConsecutive && conditions.maxConsecutive > 0) cleanedConditions.maxConsecutive = conditions.maxConsecutive;
      
      try {
        const generated = generateCombinations(
          type, 
          reds, 
          blues, 
          Object.keys(cleanedConditions).length > 0 ? cleanedConditions : undefined,
          wheelingMode
        );
        setResults(generated);
        toast.show(`已成功生成 ${generated.length} 注缩水方案`, 'success');
      } catch (e) {
        console.error(e);
        toast.show("计算过程中出错，请尝试减少号码数量。", 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 300);
  };

  const handleSaveAll = async () => {
    let saved = 0;
    for (const r of results) {
      await storage.save({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'REDUCER'
      });
      saved++;
    }
    toast.show(`成功保存 ${saved} 注组合到收藏库`, 'success');
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
        toolUsed: 'REDUCER'
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

  const handleRandomPick = () => {
    const maxRed = type === 'SSQ' ? 33 : 35;
    const maxBlue = type === 'SSQ' ? 16 : 12;
    
    // Pick the minimum required pool size as requested
    const redCount = type === 'SSQ' ? 7 : 6; 
    const blueCount = 2; 

    const randomReds: number[] = [];
    while (randomReds.length < redCount) {
      const num = Math.floor(Math.random() * maxRed) + 1;
      if (!randomReds.includes(num)) randomReds.push(num);
    }
    
    const randomBlues: number[] = [];
    while (randomBlues.length < blueCount) {
      const num = Math.floor(Math.random() * maxBlue) + 1;
      if (!randomBlues.includes(num)) randomBlues.push(num);
    }

    setReds(randomReds.sort((a, b) => a - b));
    setBlues(randomBlues.sort((a, b) => a - b));
    setResults([]);
  };

  const handleClear = () => {
    setReds([]);
    setBlues([]);
    setResults([]);
    setConditions({
      minSum: undefined,
      maxSum: undefined,
      maxConsecutive: undefined,
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-emerald-500" />
          组合缩水生成器
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={handleRandomPick}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
          >
            <Shuffle className="w-4 h-4" />
            随机选号池
          </button>
          <button 
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            清空重选
          </button>
        </div>
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
            <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                选择红球池 ({reds.length}个)
              </div>
              {reds.length > 16 && wheelingMode !== 'FULL' && (
                <span className="text-[10px] md:text-xs text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 旋转矩阵模式上限16个
                </span>
              )}
            </h3>
            <BallPicker 
              max={type === 'SSQ' ? 33 : 35} 
              selected={reds} 
              onChange={setReds} 
              color="red" 
            />
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              选择蓝球池 ({blues.length}个)
            </h3>
            <BallPicker 
              max={type === 'SSQ' ? 16 : 12} 
              selected={blues} 
              onChange={setBlues} 
              color="blue" 
            />
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                缩水模式 
                <button 
                  onClick={() => setShowWheelingTip(!showWheelingTip)}
                  className={`p-1 rounded-full transition-colors ${showWheelingTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                  title="点击查看说明"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showWheelingTip && (
              <p className="text-[10px] md:text-xs text-slate-500 mb-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 flex items-start gap-1.5 animate-in slide-in-from-top-2 duration-200 leading-relaxed">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                基于旋转矩阵算法，在选出的号码池中通过抽稀组合注数来降低成本。例如「中6保5」指若选号包含开奖号，则必有1注中5红。
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'FULL', name: '全复式', desc: '生成所有组合' },
                { id: 'M6G5', name: '中6保5', desc: '6中时必有1注中5' },
                { id: 'M6G4', name: '中6保4', desc: '6中时必有1注中4' },
                { id: 'M5G5', name: '中5保5', desc: '5中时必有1注中5' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setWheelingMode(mode.id as WheelingMode)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    wheelingMode === mode.id
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className={`font-bold text-xs md:text-sm ${wheelingMode === mode.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {mode.name}
                  </div>
                  <div className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                过滤条件 (可选)
                <button 
                  onClick={() => setShowFilterTip(!showFilterTip)}
                  className={`p-1 rounded-full transition-colors ${showFilterTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                  title="点击查看说明"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showFilterTip && (
              <p className="text-[10px] md:text-xs text-slate-500 mb-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 flex items-start gap-1.5 animate-in slide-in-from-top-2 duration-200 leading-relaxed">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                和值指选出的红球之和；连号指连续数字。设置这些区间可剔除掉小概率出现的非典型组合方案。
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">最小和值</label>
                <input 
                  type="number" 
                  value={conditions.minSum || ''} 
                  onChange={e => setConditions({...conditions, minSum: parseInt(e.target.value)})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">最大和值</label>
                <input 
                  type="number" 
                  value={conditions.maxSum || ''} 
                  onChange={e => setConditions({...conditions, maxSum: parseInt(e.target.value)})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="col-span-2 relative">
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">最大允许连号数</label>
                <input 
                  type="number" 
                  value={conditions.maxConsecutive || ''} 
                  onChange={e => setConditions({...conditions, maxConsecutive: parseInt(e.target.value)})}
                  placeholder="例如 3 表示最多允许3连号"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在为您计算组合...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                立即缩水生成 ({reds.length}红 + {blues.length}蓝)
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
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
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
                  <Calculator className="w-8 h-8 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-500">待计算组合</p>
                  <p className="text-sm">在左侧选择号码并设置条件后点击生成</p>
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
                          {r.reds.map(n => (
                            <span key={`r${n}`} className="aspect-square w-full sm:w-8 sm:h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] sm:text-sm font-bold shadow-sm">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
                          {r.blues.map(n => (
                            <span key={`b${n}`} className="aspect-square w-full sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] sm:text-sm font-bold shadow-sm">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
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
                              toolUsed: 'REDUCER'
                            });
                            toast.show('已成功保存至收藏库', 'success');
                          }
                          loadExistingStates();
                        }}
                        className={`p-2 rounded-lg transition-all ${isSaved ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={isSaved ? "取消收藏" : "收藏"}
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
                              toolUsed: 'REDUCER'
                            });
                            refreshCart();
                            toast.show('已加入购物车', 'success');
                          }
                          loadExistingStates();
                        }}
                        className={`p-2 rounded-lg transition-all ${isInCart ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        title={isInCart ? "取消加购" : "加入购物车"}
                      >
                        {isInCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {results.length > 500 && (
              <div className="text-center text-orange-500 py-4 text-sm font-medium">
                只展示部分结果，请进一步缩小条件
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
