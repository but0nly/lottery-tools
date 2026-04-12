"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  LotteryType, 
  getLeastFrequent, 
  generateGameTheoryCombination, 
  DEFAULT_GAME_THEORY_CONFIG,
  GameTheoryConfig
} from '@/lib/combinations';
import { storage } from '@/lib/storage';
import { refreshCart } from '@/components/Cart';
import { toast } from '@/lib/notification';
import { 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  Zap, 
  BrainCircuit, 
  Users, 
  Plus, 
  Settings2, 
  Sliders, 
  Info, 
  Bookmark, 
  HelpCircle, 
  History, 
  Trash2,
  ShoppingCart
} from 'lucide-react';

export default function ReversePage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [mode, setMode] = useState<'FREQUENCY' | 'GAME_THEORY'>('GAME_THEORY');
  const [historySize, setHistorySize] = useState(100);
  const [gtConfig, setGtConfig] = useState<GameTheoryConfig>(DEFAULT_GAME_THEORY_CONFIG);
  const [showAlgorithmTip, setShowAlgorithmTip] = useState(false);
  const [result, setResult] = useState<{reds: number[], blues: number[]} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track states for active buttons
  const [isInCart, setIsInCart] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const checkExistingStates = useCallback(async () => {
    if (!result) {
      setIsInCart(false);
      setIsSaved(false);
      return;
    }

    const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
    const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');
    
    const [cart, saved] = await Promise.all([
      storage.getCart(),
      storage.getAllSaved()
    ]);

    const cartMatch = cart.some(i => i.type === type && i.reds === redsStr && i.blues === bluesStr);
    const savedMatch = saved.some(i => i.type === type && i.reds === redsStr && i.blues === bluesStr);

    setIsInCart(cartMatch);
    setIsSaved(savedMatch);
  }, [result, type]);

  useEffect(() => {
    checkExistingStates();
    window.addEventListener('cart-updated', checkExistingStates);
    return () => window.removeEventListener('cart-updated', checkExistingStates);
  }, [checkExistingStates]);

  const handleCalculate = async () => {
    setIsSaved(false);
    setIsInCart(false);
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

  const handleSave = async () => {
    if (!result) return;
    const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
    const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');

    if (isSaved) {
      await storage.deleteSavedByContent(type, redsStr, bluesStr);
      toast.show('已从库中移除', 'info');
    } else {
      await storage.save({
        type,
        reds: redsStr,
        blues: bluesStr,
        toolUsed: 'REVERSE'
      });
      toast.show('已成功保存至收藏库', 'success');
    }
    checkExistingStates();
  };

  const handleAddToCart = async () => {
    if (!result) return;
    const redsStr = result.reds.map(n => n.toString().padStart(2, '0')).join(',');
    const bluesStr = result.blues.map(n => n.toString().padStart(2, '0')).join(',');
    
    if (isInCart) {
      await storage.removeFromCartByContent(type, redsStr, bluesStr);
      refreshCart();
      toast.show('已从购物车移除', 'info');
    } else {
      await storage.addToCart({
        type,
        reds: redsStr,
        blues: bluesStr,
        toolUsed: 'REVERSE'
      });
      refreshCart();
      toast.show('已加入购物车', 'success');
    }
    checkExistingStates();
  };

  const handleClear = () => {
    setResult(null);
    setGtConfig(DEFAULT_GAME_THEORY_CONFIG);
  };

  const updateConfig = (key: keyof GameTheoryConfig, value: string) => {
    const num = parseInt(value) || 0;
    setGtConfig(prev => ({ ...prev, [key]: num }));
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <History className="w-8 h-8 text-rose-500" />
          冷门组合生成器
        </h1>
        <button 
          onClick={handleClear}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          重置参数
        </button>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-4 mb-8">
        <button 
          onClick={() => { setMode('GAME_THEORY'); handleClear(); }}
          className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${mode === 'GAME_THEORY' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          心理避让模式 (博弈论)
        </button>
        <button 
          onClick={() => { setMode('FREQUENCY'); handleClear(); }}
          className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${mode === 'FREQUENCY' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          历史遗漏模式 (大数据)
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8 min-w-0">
        <div className="space-y-4 md:space-y-6 min-w-0">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base md:text-lg font-semibold mb-4">核心逻辑说明</h3>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
              {mode === 'GAME_THEORY' 
                ? "反向选号：通过算法评估号码大众偏好度，避开热门的生日、吉利、连号，旨在提升中奖后独揽大奖的概率。" 
                : "遗漏统计：分析近期历史开奖数据，寻找长期未出的冷门号码，追求号码出现的动态概率平衡。"}
            </p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">彩种选择</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setType('SSQ'); setResult(null); }}
                    className={`flex-1 py-2 rounded-lg font-medium text-xs md:text-sm transition-colors ${type === 'SSQ' ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    双色球 (SSQ)
                  </button>
                  <button 
                    onClick={() => { setType('DLT'); setResult(null); }}
                    className={`flex-1 py-2 rounded-lg font-medium text-xs md:text-sm transition-colors ${type === 'DLT' ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    大乐透 (DLT)
                  </button>
                </div>
              </div>
              
              {mode === 'FREQUENCY' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-sm font-medium text-slate-700 mb-2">分析样本量</label>
                  <select 
                    value={historySize}
                    onChange={e => setHistorySize(parseInt(e.target.value))}
                    className="w-full border-slate-200 bg-slate-50 rounded-lg shadow-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 px-3 text-xs md:text-sm outline-none transition-all"
                  >
                    <option value={30}>最近 30 期</option>
                    <option value={50}>最近 50 期</option>
                    <option value={100}>最近 100 期</option>
                    <option value={200}>最近 200 期</option>
                    <option value={500}>最近 500 期</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {mode === 'GAME_THEORY' && (
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-sm md:text-base text-slate-800">算法参数微调</h3>
                  <button 
                    onClick={() => setShowAlgorithmTip(!showAlgorithmTip)}
                    className={`p-1 rounded-full transition-colors ${showAlgorithmTip ? 'bg-rose-100 text-rose-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setGtConfig(DEFAULT_GAME_THEORY_CONFIG)}
                  className="text-[10px] md:text-xs text-rose-600 font-medium hover:underline"
                >
                  恢复默认
                </button>
              </div>

              {showAlgorithmTip && (
                <p className="text-[10px] md:text-xs text-slate-500 mb-6 bg-rose-50/50 p-3 rounded-xl border border-rose-100/50 flex items-start gap-1.5 animate-in slide-in-from-top-2 duration-200 leading-relaxed shadow-sm">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-rose-500" />
                  权重越高表示该特征在选号时“扣分”越多。算法会寻找权重总分最低的号码组合（即最冷门、最反直觉的方案）。
                </p>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { label: '月权重', key: 'monthPenalty', desc: '1-12月' },
                  { label: '日权重', key: 'birthdayPenalty', desc: '1-31日' },
                  { label: '吉利号', key: 'luckyPenalty', desc: '6,8,18...' },
                  { label: '大数奖励', key: 'largeNumberBonus', desc: '>31号码' },
                  { label: '蓝月权重', key: 'blueMonthPenalty', desc: '1-12蓝球' },
                  { label: '蓝大数', key: 'blueLargeBonus', desc: '>12蓝球' },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{item.label}</label>
                    <input 
                      type="number"
                      value={gtConfig[item.key as keyof GameTheoryConfig]}
                      onChange={(e) => updateConfig(item.key as keyof GameTheoryConfig, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleCalculate}
            disabled={isLoading}
            className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-rose-100 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                正在执行反向数据分析...
              </>
            ) : mode === 'GAME_THEORY' ? (
              <>
                <BrainCircuit className="w-5 h-5" />
                计算最佳避让方案
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                寻找极致遗漏冷门
              </>
            )}
          </button>
        </div>

        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
              分析推荐结果
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <History className="w-8 h-8 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-500">待分析号码</p>
                  <p className="text-sm px-4">在左侧设置分析模式并点击生成</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:bg-white hover:shadow-md group">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-7 sm:flex sm:justify-center sm:flex-wrap gap-1.5 md:gap-2">
                      {result.reds.map(n => (
                        <span key={`r${n}`} className="aspect-square w-full sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] sm:text-base md:text-lg font-black shadow-md transition-transform group-hover:scale-110">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                      <div className="hidden sm:block w-px h-8 bg-slate-300 mx-1 self-center"></div>
                      {result.blues.map(n => (
                        <span key={`b${n}`} className="aspect-square w-full sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] sm:text-base md:text-lg font-black shadow-md transition-transform group-hover:scale-110">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 border-t pt-4 border-slate-200/50">
                      <button 
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                          isSaved ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? '已收藏' : '收藏'}
                      </button>
                      <button 
                        onClick={handleAddToCart}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                          isInCart ? 'text-orange-600 bg-orange-50 shadow-inner' : 'text-orange-600 bg-white border border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {isInCart ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                        {isInCart ? '已加购' : '加购物车'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    推荐理由
                  </h4>
                  <p className="text-[10px] md:text-xs text-rose-700 leading-relaxed">
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
