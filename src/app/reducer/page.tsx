"use client";

import { useEffect, useState, useCallback } from 'react';
import { BallPicker } from '@/components/BallPicker';
import { generateCombinations, LotteryType, FilterConditions, WheelingMode } from '@/lib/combinations';
import { storage, ReducerSettings } from '@/lib/storage';
import { toast } from '@/lib/notification';
import { CheckCircle2, AlertTriangle, Loader2, Plus, Pin, Shuffle, HelpCircle, Info, Calculator, Trash2 } from 'lucide-react';

import { LotteryTabSwitcher } from '@/components/LotteryTabSwitcher';
import { triggerFlyToCart } from '@/components/FlyToCartAnimation';

export default function ReducerPage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [wheelingMode, setWheelingMode] = useState<WheelingMode>('FULL');
  const [reds, setReds] = useState<number[]>([]);
  const [blues, setBlues] = useState<number[]>([]);
  const [results, setResults] = useState<{reds: number[], blues: number[]}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWheelingTip, setShowWheelingTip] = useState(false);
  const [showFilterTip, setShowFilterTip] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track existing data for active states
  const [inSelectionKeys, setInSelectionKeys] = useState<Set<string>>(new Set());
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());

  const loadExistingStates = useCallback(async () => {
    const [selection, settings] = await Promise.all([
      storage.getSelection(),
      storage.getSettings<ReducerSettings>('reducer_params')
    ]);
    
    setInSelectionKeys(new Set(selection.map(i => `${i.type}|${i.reds}|${i.blues}`)));
    setPinnedKeys(new Set(selection.filter(i => i.isPinned).map(i => `${i.type}|${i.reds}|${i.blues}`)));

    if (settings) {
      if (settings.type) setType(settings.type);
      if (settings.wheelingMode) setWheelingMode(settings.wheelingMode);
      if (settings.reds) setReds(settings.reds);
      if (settings.blues) setBlues(settings.blues);
      if (settings.conditions) setConditions(settings.conditions);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    loadExistingStates();
    window.addEventListener('selection-updated', loadExistingStates);
    return () => window.removeEventListener('selection-updated', loadExistingStates);
  }, [loadExistingStates]);

  const [conditions, setConditions] = useState<FilterConditions>({
    minSum: undefined,
    maxSum: undefined,
    maxConsecutive: undefined,
  });

  // Save settings when they change
  useEffect(() => {
    if (!isInitialized) return;
    storage.setSettings('reducer_params', {
      type,
      wheelingMode,
      reds,
      blues,
      conditions
    });
  }, [type, wheelingMode, reds, blues, conditions, isInitialized]);

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

  const handlePinAll = async () => {
    let saved = 0;
    for (const r of results) {
      await storage.addToSelection({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'REDUCER',
        isPinned: true
      });
      saved++;
    }
    window.dispatchEvent(new Event('selection-updated'));
    toast.show(`成功固定 ${saved} 注缩水选号`, 'success');
    loadExistingStates();
  };

  const handleAddToSelectionAll = async (e: React.MouseEvent) => {
    triggerFlyToCart(e, 'bg-emerald-500');
    let saved = 0;
    let skipped = 0;
    for (const r of results) {
      const result = await storage.addToSelection({
        type,
        reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
        blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
        toolUsed: 'REDUCER'
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
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
      
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:pr-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Calculator className="w-7 h-7" />
            </div>
            组合缩水选号
          </h1>
          <p className="text-slate-500 text-sm md:text-base ml-1">通过旋转矩阵算法降低购彩成本</p>
        </div>
      </div>
      
      <div className="mb-10 flex justify-center md:justify-start">
        <LotteryTabSwitcher 
          activeTab={type} 
          onTabChange={(newType) => { setType(newType); handleClear(); }} 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 min-w-0">
        <div className="space-y-6 min-w-0">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                选择红球池 <span className="text-slate-400 font-medium ml-1">({reds.length}个)</span>
              </div>
              {reds.length > 16 && wheelingMode !== 'FULL' && (
                <span className="text-[10px] md:text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded-full flex items-center gap-1 font-bold border border-rose-100 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> 旋转矩阵上限16个
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

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              选择蓝球池 <span className="text-slate-400 font-medium ml-1">({blues.length}个)</span>
            </h3>
            <BallPicker 
              max={type === 'SSQ' ? 16 : 12} 
              selected={blues} 
              onChange={setBlues} 
              color="blue" 
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleRandomPick}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-white/70 backdrop-blur-xl hover:bg-emerald-50 border border-white hover:border-emerald-200 text-slate-600 hover:text-emerald-600 rounded-[24px] text-sm font-black transition-all shadow-xl shadow-slate-200/50 active:scale-[0.98]"
            >
              <Shuffle className="w-4 h-4" />
              随机选号池
            </button>
            <button 
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-white/70 backdrop-blur-xl hover:bg-rose-50 border border-white hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-[24px] text-sm font-black transition-all shadow-xl shadow-slate-200/50 active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              清空重选
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                缩水模式 
                <button 
                  onClick={() => setShowWheelingTip(!showWheelingTip)}
                  className={`p-1.5 rounded-full transition-colors ${showWheelingTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showWheelingTip && (
              <div className="text-[11px] md:text-xs text-emerald-800 mb-6 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 leading-relaxed shadow-inner">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                基于旋转矩阵算法，在选出的号码池中通过抽稀组合注数来降低成本。例如「中6保5」指若选号包含开奖号，则必有1注中5红。
              </div>
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
                  className={`group relative p-4 rounded-2xl border-2 text-left transition-all ${
                    wheelingMode === mode.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100/50'
                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className={`font-black text-sm ${wheelingMode === mode.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {mode.name}
                  </div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">{mode.desc}</div>
                  {wheelingMode === mode.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                高级过滤 <span className="text-slate-400 text-xs font-normal">(可选)</span>
                <button 
                  onClick={() => setShowFilterTip(!showFilterTip)}
                  className={`p-1.5 rounded-full transition-colors ${showFilterTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showFilterTip && (
              <div className="text-[11px] md:text-xs text-emerald-800 mb-6 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 leading-relaxed shadow-inner">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                和值指选出的红球之和；连号指连续数字。设置这些区间可剔除掉小概率出现的非典型组合方案。
              </div>
            )}
            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最小和值</label>
                <input 
                  type="number" 
                  value={conditions.minSum || ''} 
                  onChange={e => setConditions({...conditions, minSum: parseInt(e.target.value)})}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="例: 80"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最大和值</label>
                <input 
                  type="number" 
                  value={conditions.maxSum || ''} 
                  onChange={e => setConditions({...conditions, maxSum: parseInt(e.target.value)})}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="例: 130"
                />
              </div>
              <div className="col-span-2 relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最大连号数</label>
                <input 
                  type="number" 
                  value={conditions.maxConsecutive || ''} 
                  onChange={e => setConditions({...conditions, maxConsecutive: parseInt(e.target.value)})}
                  placeholder="例如 3 表示最多允许3连号"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-3xl shadow-xl shadow-emerald-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                正在智能缩水计算...
              </>
            ) : (
              <>
                <Calculator className="w-6 h-6" />
                立即缩水生成方案
              </>
            )}
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 md:p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
              生成结果 
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{results.length} 注</span>
            </h3>
            {results.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleAddToSelectionAll(e)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  全部加入
                </button>
                <button 
                  onClick={handlePinAll}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                >
                  <Pin className="w-3.5 h-3.5" />
                  全部固定
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar overscroll-behavior-none">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                <div className="w-24 h-24 bg-slate-50/50 rounded-full flex items-center justify-center shadow-inner">
                  <Calculator className="w-10 h-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-2">Awaiting Analysis</p>
                  <p className="text-sm text-slate-500 font-medium">在左侧选择号码并设置条件后点击生成</p>
                </div>
              </div>
            ) : (
              results.map((r, i) => {
                const redsStr = r.reds.map(n => n.toString().padStart(2, '0')).join(',');
                const bluesStr = r.blues.map(n => n.toString().padStart(2, '0')).join(',');
                const key = `${type}|${redsStr}|${bluesStr}`;
                const isPinned = pinnedKeys.has(key);
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
                          {r.reds.map(n => (
                            <span key={`r${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-red-100 group-hover:scale-105 transition-transform">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                          <div className="w-px h-4 bg-slate-200 mx-0.5 flex-shrink-0"></div>
                          {r.blues.map(n => (
                            <span key={`b${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-blue-100 group-hover:scale-105 transition-transform">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 分割线 */}
                    <div className="h-px bg-slate-100/50 mx-1"></div>

                    {/* 第二行：操作按钮 */}
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={async () => {
                          if (isPinned) {
                            const items = await storage.getSelection();
                            const item = items.find(i => i.type === type && i.reds === redsStr && i.blues === bluesStr);
                            if (item) await storage.updateSelection(item.id!, { isPinned: false });
                            toast.show('已取消固定', 'info');
                          } else {
                            await storage.addToSelection({
                              type,
                              reds: redsStr,
                              blues: bluesStr,
                              toolUsed: 'REDUCER',
                              isPinned: true
                            });
                            toast.show('已固定选号', 'success');
                          }
                          window.dispatchEvent(new Event('selection-updated'));
                          loadExistingStates();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isPinned ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 bg-white shadow-sm border border-slate-100'}`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                        {isPinned ? '已固定' : '固定'}
                      </button>
                      <button 
                        onClick={async (e) => {
                          if (isInSelection) {
                            await storage.removeFromSelectionByContent(type, redsStr, bluesStr);
                            window.dispatchEvent(new Event('selection-updated'));
                            toast.show('已从选号单移除', 'info');
                            loadExistingStates();
                          } else {
                            triggerFlyToCart(e, 'bg-emerald-500');
                            setTimeout(async () => {
                              await storage.addToSelection({
                                type,
                                reds: redsStr,
                                blues: bluesStr,
                                toolUsed: 'REDUCER'
                              });
                              window.dispatchEvent(new Event('selection-updated'));
                              toast.show('已加入选号单', 'success');
                              loadExistingStates();
                            }, 600);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isInSelection ? 'text-emerald-600 bg-emerald-50 shadow-inner' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 bg-white shadow-sm border border-slate-100'}`}
                      >
                        {isInSelection ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isInSelection ? '已加入' : '加入'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {results.length > 500 && (
              <div className="text-center text-orange-500 py-6 text-xs font-black uppercase tracking-widest">
                Large Result Set · Limited Preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}