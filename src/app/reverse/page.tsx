"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  LotteryType, 
  getLeastFrequent, 
  generateGameTheoryCombination, 
  DEFAULT_GAME_THEORY_CONFIG,
  GameTheoryConfig
} from '@/lib/combinations';
import { storage, ReverseSettings } from '@/lib/storage';
import { toast } from '@/lib/notification';
import { 
  RefreshCw, 
  CheckCircle2, 
  Zap, 
  BrainCircuit, 
  Users, 
  Sliders, 
  Info, 
  Pin, 
  HelpCircle, 
  History, 
  Plus
} from 'lucide-react';

import { LotteryTabSwitcher } from '@/components/LotteryTabSwitcher';
import { triggerFlyToCart } from '@/components/FlyToCartAnimation';

export default function ReversePage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [mode, setMode] = useState<'FREQUENCY' | 'GAME_THEORY'>('GAME_THEORY');
  const [historySize, setHistorySize] = useState(100);
  const [gtConfig, setGtConfig] = useState<GameTheoryConfig>(DEFAULT_GAME_THEORY_CONFIG);
  const [showAlgorithmTip, setShowAlgorithmTip] = useState(false);
  const [result, setResult] = useState<{reds: number[], blues: number[]} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track states for active buttons
  const [isInSelection, setIsInSelection] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const checkExistingStates = useCallback(async () => {
    if (!result) {
      setIsInSelection(false);
      setIsPinned(false);
    } else {
      const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
      const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');
      
      const selection = await storage.getSelection();

      const match = selection.find(i => i.type === type && i.reds === redsStr && i.blues === bluesStr);
      setIsInSelection(!!match);
      setIsPinned(match?.isPinned || false);
    }
    
    // Initial load of settings
    if (!isInitialized) {
      const settings = await storage.getSettings<ReverseSettings>('reverse_params');
      if (settings) {
        if (settings.type) setType(settings.type);
        if (settings.mode) setMode(settings.mode);
        if (settings.historySize) setHistorySize(settings.historySize);
        if (settings.gtConfig) setGtConfig(settings.gtConfig);
      }
      setIsInitialized(true);
    }
  }, [result, type, isInitialized]);

  useEffect(() => {
    checkExistingStates();
    window.addEventListener('selection-updated', checkExistingStates);
    return () => window.removeEventListener('selection-updated', checkExistingStates);
  }, [checkExistingStates]);

  // Save settings when they change
  useEffect(() => {
    if (!isInitialized) return;
    storage.setSettings('reverse_params', {
      type,
      mode,
      historySize,
      gtConfig
    });
  }, [type, mode, historySize, gtConfig, isInitialized]);

  const handleCalculate = async () => {
    setIsPinned(false);
    setIsInSelection(false);
    setIsLoading(true);
    
    // Slight delay for UX
    setTimeout(async () => {
      try {
        if (mode === 'FREQUENCY') {
          const response = await fetch(`/api/history?type=${type}&limit=${historySize}`);
          const realHistory = await response.json();
          
          if (Array.isArray(realHistory)) {
            const coldest = getLeastFrequent(realHistory, type);
            setResult(coldest);
            toast.show('已为您找到历史遗漏冷门组合', 'success');
          }
        } else {
          setResult(generateGameTheoryCombination(type, gtConfig));
          toast.show('心理避让选号方案生成成功', 'success');
        }
      } catch (error) {
        console.error('Error in calculation:', error);
        toast.show('分析过程中出现错误', 'error');
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handlePin = async () => {
    if (!result) return;
    const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
    const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');

    if (isPinned) {
      const selection = await storage.getSelection();
      const item = selection.find(i => i.type === type && i.reds === redsStr && i.blues === bluesStr);
      if (item) await storage.updateSelection(item.id!, { isPinned: false });
      toast.show('已取消固定', 'info');
    } else {
      await storage.addToSelection({
        type,
        reds: redsStr,
        blues: bluesStr,
        toolUsed: 'REVERSE',
        isPinned: true
      });
      toast.show('已成功固定选号', 'success');
    }
    window.dispatchEvent(new Event('selection-updated'));
    checkExistingStates();
  };

  const handleAddToSelection = async (e: React.MouseEvent) => {
    if (!result) return;
    const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
    const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');
    
    if (isInSelection) {
      await storage.removeFromSelectionByContent(type, redsStr, bluesStr);
      window.dispatchEvent(new Event('selection-updated'));
      toast.show('已从选号单移除', 'info');
    } else {
      triggerFlyToCart(e, 'bg-rose-500');
      
      setTimeout(async () => {
        await storage.addToSelection({
          type: type,
          reds: redsStr,
          blues: bluesStr,
          toolUsed: 'REVERSE'
        });
        window.dispatchEvent(new Event('selection-updated'));
        toast.show('已加入选号单', 'success');
        checkExistingStates();
      }, 600);
    }
  };

  const handleClear = () => {
    setResult(null);
    setGtConfig(DEFAULT_GAME_THEORY_CONFIG);
  };

  const updateConfig = (key: keyof GameTheoryConfig, value: string) => {
    const num = parseFloat(value) || 0;
    setGtConfig(prev => ({ ...prev, [key]: num }));
  };

  return (
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-rose-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
      
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:pr-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <History className="w-7 h-7" />
            </div>
            反向冷门分析
          </h1>
          <p className="text-slate-500 text-sm md:text-base ml-1">基于博弈论与大数据规避大众心理热门号</p>
        </div>
      </div>

      <div className="mb-8 flex justify-center md:justify-start">
        <LotteryTabSwitcher 
          activeTab={type} 
          onTabChange={(newType) => { setType(newType); setResult(null); }} 
        />
      </div>

      <div className="flex w-full md:w-auto md:inline-flex p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl mb-10 border border-slate-200/50">
        <button
          onClick={() => { setMode('GAME_THEORY'); handleClear(); }}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all text-sm ${mode === 'GAME_THEORY' ? 'bg-white text-rose-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          心理避让 (博弈论)
        </button>
        <button
          onClick={() => { setMode('FREQUENCY'); handleClear(); }}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black transition-all text-sm ${mode === 'FREQUENCY' ? 'bg-white text-rose-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          历史遗漏 (大数据)
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 min-w-0">
        <div className="space-y-6 min-w-0">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              核心逻辑说明
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {mode === 'GAME_THEORY' 
                ? "反向选号：通过算法评估号码大众偏好度，避开热门的生日、吉利、连号，旨在提升中奖后独揽大奖的概率。" 
                : "遗漏统计：分析近期历史开奖数据，寻找长期未出的冷门号码，追求号码出现的动态概率平衡。"}
            </p>
          </div>

          {mode === 'FREQUENCY' && (
            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
              <label className="block text-sm font-black text-slate-400 mb-4 uppercase tracking-widest">分析样本量</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[30, 50, 100, 200, 500].map((size) => (
                  <button
                    key={size}
                    onClick={() => setHistorySize(size)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                      historySize === size 
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' 
                        : 'bg-slate-50/50 text-slate-500 border-2 border-slate-100 hover:border-rose-200'
                    }`}
                  >
                    {size}期
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'GAME_THEORY' && (
            <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-rose-500" />
                  <h3 className="font-black text-lg text-slate-800">算法参数微调</h3>
                  <button 
                    onClick={() => setShowAlgorithmTip(!showAlgorithmTip)}
                    className={`p-1.5 rounded-full transition-colors ${showAlgorithmTip ? 'bg-rose-100 text-rose-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setGtConfig(DEFAULT_GAME_THEORY_CONFIG)}
                  className="text-xs text-rose-600 font-black hover:underline underline-offset-4"
                >
                  恢复默认
                </button>
              </div>

              {showAlgorithmTip && (
                <div className="text-[11px] md:text-xs text-rose-800 mb-6 bg-rose-50/80 p-4 rounded-2xl border border-rose-100 flex items-start gap-2 leading-relaxed shadow-inner">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                  权重越高表示该特征在选号时“扣分”越多。算法会寻找权重总分最低的号码组合（即最冷门、最反直觉的方案）。
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {[
                  { label: '月权重', key: 'monthPenalty', desc: '1-12月' },
                  { label: '日权重', key: 'birthdayPenalty', desc: '1-31日' },
                  { label: '吉利号', key: 'luckyPenalty', desc: '6,8,18...' },
                  { label: '大数奖励', key: 'largeNumberBonus', desc: '>31号码' },
                  { label: '蓝月权重', key: 'blueMonthPenalty', desc: '1-12蓝球' },
                  { label: '蓝大数', key: 'blueLargeBonus', desc: '>12蓝球' },
                ].map((item) => (
                  <div key={item.key} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 group/item hover:bg-white transition-colors duration-300">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                      <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 group-hover/item:scale-110 transition-transform">
                        {gtConfig[item.key as keyof GameTheoryConfig]}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={gtConfig[item.key as keyof GameTheoryConfig]}
                      onChange={(e) => updateConfig(item.key as keyof GameTheoryConfig, e.target.value)}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-600 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleCalculate}
            disabled={isLoading}
            className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-3xl shadow-xl shadow-rose-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                正在执行反向数据分析...
              </>
            ) : mode === 'GAME_THEORY' ? (
              <>
                <BrainCircuit className="w-6 h-6" />
                计算最佳避让方案
              </>
            ) : (
              <>
                <Users className="w-6 h-6" />
                寻找极致遗漏冷门
              </>
            )}
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 md:p-10 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              分析推荐结果
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar overscroll-behavior-none">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                <div className="w-24 h-24 bg-slate-50/50 rounded-full flex items-center justify-center shadow-inner">
                  <History className="w-10 h-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-2">Awaiting Analysis</p>
                  <p className="text-sm text-slate-500 font-medium px-4">在左侧设置分析模式并点击生成</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50/50 border-2 border-white rounded-[32px] group">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                      {result.reds.map(n => (
                        <span key={`r${n}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-base md:text-xl font-black shadow-lg shadow-red-100">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                      <div className="w-px h-10 md:h-12 bg-slate-200 mx-1 md:mx-2 self-center"></div>
                      {result.blues.map(n => (
                        <span key={`b${n}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-base md:text-xl font-black shadow-lg shadow-blue-100">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={handlePin}
                        className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs md:text-sm font-black transition-all shadow-lg ${
                          isPinned ? 'text-indigo-600 bg-indigo-50 shadow-inner ring-1 ring-indigo-200' : 'text-slate-600 bg-white border border-slate-100 hover:bg-slate-50 shadow-slate-100'
                        }`}
                      >
                        <Pin className={`w-4 h-4 md:w-5 md:h-5 ${isPinned ? 'fill-current' : ''}`} />
                        {isPinned ? '已固定' : '固定选号'}
                      </button>
                      <button 
                        onClick={(e) => handleAddToSelection(e)}
                        className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs md:text-sm font-black transition-all shadow-lg ${
                          isInSelection ? 'text-orange-600 bg-orange-50 shadow-inner ring-1 ring-orange-200' : 'text-white bg-slate-900 hover:bg-slate-800 shadow-slate-200'
                        }`}
                      >
                        {isInSelection ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                        {isInSelection ? '已加入' : '加入选号'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100/50 rounded-[32px] p-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-16 -mt-16" />
                  <h4 className="text-sm font-black text-rose-900 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    算法推荐理由
                  </h4>
                  <p className="text-xs md:text-sm text-rose-700/90 leading-relaxed font-medium relative z-10">
                    {mode === 'GAME_THEORY' 
                      ? "该组合成功避开了大众最常选取的日期号与吉祥数字，且包含多个高位号码。根据博弈理论，此类组合若开出，一等奖被多人瓜分的概率降至最低，具有极高的单注期望价值。"
                      : `分析了最近 ${historySize} 期的开奖走势，以上号码在近期出现的频率处于谷底（统计显著性高）。根据概率平衡原则，长期遗漏的号码在未来周期内反弹概率会有所上升。`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}