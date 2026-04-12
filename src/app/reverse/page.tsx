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
import { RefreshCw, Save, CheckCircle2, Zap, BrainCircuit, Users, Plus, Settings2, Sliders, Info, Bookmark } from 'lucide-react';

export default function ReversePage() {
  const [type, setType] = useState<LotteryType>('SSQ');
  const [mode, setMode] = useState<'FREQUENCY' | 'GAME_THEORY'>('GAME_THEORY');
  const [historySize, setHistorySize] = useState(100);
  const [gtConfig, setGtConfig] = useState<GameTheoryConfig>(DEFAULT_GAME_THEORY_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
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

  const updateConfig = (key: keyof GameTheoryConfig, value: string) => {
    const num = parseInt(value) || 0;
    setGtConfig(prev => ({ ...prev, [key]: num }));
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">冷门组合生成器</h1>
      <p className="text-sm md:text-base text-slate-600 mb-8">
        {mode === 'GAME_THEORY' 
          ? "反向选号：避开大众心理偏好（如生日、吉利号），提升中奖后的潜在收益。" 
          : "遗漏统计：分析近期开奖数据，寻找长期未出的冷门号码。"}
      </p>
      
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-4">分析模式</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => { setMode('GAME_THEORY'); setResult(null); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'GAME_THEORY' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <BrainCircuit className={`w-5 h-5 ${mode === 'GAME_THEORY' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className="font-bold text-sm md:text-base">心理偏好避让</span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">
                避开大众喜爱的生日号、连号。目标：一旦中奖，尽可能独揽奖金。
              </p>
            </button>
            
            <button 
              onClick={() => { setMode('FREQUENCY'); setResult(null); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'FREQUENCY' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className={`w-5 h-5 ${mode === 'FREQUENCY' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className="font-bold text-sm md:text-base">历史统计遗漏</span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">
                基于往期数据，寻找近期出号频率最低的冷门号码，追求概率平衡。
              </p>
            </button>
          </div>
        </div>

        {/* Game Theory Config Panel */}
        {mode === 'GAME_THEORY' && (
          <div className="mb-8 bg-slate-50 rounded-2xl border border-slate-100 p-4 md:p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm md:text-base text-slate-800">算法参数微调</h3>
              </div>
              <button 
                onClick={() => setGtConfig(DEFAULT_GAME_THEORY_CONFIG)}
                className="text-xs text-rose-600 font-medium hover:underline"
              >
                恢复默认
              </button>
            </div>
            
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
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">彩种选择</label>
            <div className="flex gap-2">
              <button 
                onClick={() => { setType('SSQ'); setResult(null); }}
                className={`flex-1 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${type === 'SSQ' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                双色球 (SSQ)
              </button>
              <button 
                onClick={() => { setType('DLT'); setResult(null); }}
                className={`flex-1 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${type === 'DLT' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                大乐透 (DLT)
              </button>
            </div>
          </div>
          <div className={mode === 'GAME_THEORY' ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              分析样本量 {mode === 'GAME_THEORY' && "(博弈论模式无需样本)"}
            </label>
            <select 
              value={historySize}
              onChange={e => setHistorySize(parseInt(e.target.value))}
              className="w-full border-slate-300 rounded-lg shadow-sm focus:border-rose-500 focus:ring-rose-500 py-2 px-3 text-sm md:text-base"
            >
              <option value={30}>最近 30 期</option>
              <option value={50}>最近 50 期</option>
              <option value={100}>最近 100 期</option>
              <option value={200}>最近 200 期</option>
              <option value={500}>最近 500 期</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleCalculate}
          disabled={isLoading}
          className={`w-full py-3 md:py-4 text-white font-bold rounded-xl shadow-md transition-colors text-base md:text-lg flex items-center justify-center gap-2 ${
            isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'
          }`}
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : mode === 'GAME_THEORY' ? (
            <Zap className="w-5 h-5" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {isLoading ? "正在分析往期数据..." : mode === 'GAME_THEORY' ? "计算最佳避让方案" : "寻找极致冷门组合"}
        </button>
      </div>

      {result && (
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-4 md:p-8 rounded-2xl border border-rose-100 text-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-orange-400"></div>
          <h2 className="text-lg md:text-xl font-bold text-rose-900 mb-6 flex items-center justify-center gap-2">
            为您推荐的冷门绝杀号码
          </h2>
          
          <div className="grid grid-cols-7 sm:flex sm:justify-center sm:flex-wrap gap-2 md:gap-4 mb-8">
            {result.reds.map(n => (
              <span key={`r${n}`} className="aspect-square w-full sm:w-14 sm:h-14 rounded-full bg-red-500 text-white flex items-center justify-center text-xs sm:text-xl font-black shadow-lg shadow-red-200 transition-transform hover:scale-110">
                {n.toString().padStart(2, '0')}
              </span>
            ))}
            {/* Logic for divider: only visible on desktop or if it doesn't break the grid flow */}
            <div className="hidden sm:block w-px h-14 bg-rose-200 mx-1 md:mx-2"></div>
            {result.blues.map(n => (
              <span key={`b${n}`} className="aspect-square w-full sm:w-14 sm:h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs sm:text-xl font-black shadow-lg shadow-blue-200 transition-transform hover:scale-110">
                {n.toString().padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
            <button 
              onClick={handleSave}
              className={`inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-full font-medium text-sm md:text-base transition-all shadow-md ${
                isSaved ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Save className={`w-4 h-4 md:w-5 md:h-5 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? '从收藏库移除' : '加入收藏库'}
            </button>
            <button 
              onClick={handleAddToCart}
              className={`inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-full font-medium text-sm md:text-base transition-all shadow-md ${
                isInCart ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isInCart ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
              {isInCart ? '从购物车移除' : '加入购物车'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
