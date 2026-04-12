"use client";

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/lib/notification';
import { Bookmark, Calculator, History, Trash2, Calendar, LayoutGrid, Plus, CheckCircle2, Shuffle } from 'lucide-react';
import { storage, SavedCombination } from '@/lib/storage';
import { refreshCart } from '@/components/Cart';

type LotteryType = 'SSQ' | 'DLT';

export default function SavedPage() {
  const [records, setRecords] = useState<SavedCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LotteryType>('SSQ');
  const [inCartKeys, setInCartKeys] = useState<Set<string>>(new Set());

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await storage.getAllSaved();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCartState = useCallback(async () => {
    const cart = await storage.getCart();
    setInCartKeys(new Set(cart.map(i => `${i.type}|${i.reds}|${i.blues}`)));
  }, []);

  useEffect(() => {
    loadRecords();
    loadCartState();
    window.addEventListener('cart-updated', loadCartState);
    return () => window.removeEventListener('cart-updated', loadCartState);
  }, [loadCartState]);

  const handleDelete = async (id: number) => {
    toast.confirm({
      title: '删除记录',
      message: '确定要永久删除这条方案记录吗？',
      onConfirm: async () => {
        await storage.deleteSaved(id);
        loadRecords();
        toast.show('记录已删除', 'success');
      }
    });
  };

  const handleBatchDeleteByDate = async (date: string, itemIds: number[]) => {
    toast.confirm({
      title: '批量删除',
      message: `确定要永久删除 ${date} 的所有 ${itemIds.length} 条记录吗？`,
      onConfirm: async () => {
        for (const id of itemIds) {
          await storage.deleteSaved(id);
        }
        loadRecords();
        toast.show(`${date} 的记录已清空`, 'success');
      }
    });
  };

  // Grouping logic for the ACTIVE TAB only
  const filteredRecords = records.filter(r => r.type === activeTab);
  
  const groupedByDate = filteredRecords.reduce((acc, record) => {
    const date = new Date(record.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, SavedCombination[]>);

  const ssqCount = records.filter(r => r.type === 'SSQ').length;
  const dltCount = records.filter(r => r.type === 'DLT').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Bookmark className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">我的收藏库</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">保存在您手机/电脑本地的方案</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 relative min-w-[240px] md:min-w-[280px]">
          <button 
            onClick={() => setActiveTab('SSQ')}
            className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
              activeTab === 'SSQ' 
                ? 'text-rose-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${activeTab === 'SSQ' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></span>
            双色球
            <span className="ml-1 opacity-50 font-normal">{ssqCount}</span>
          </button>
          <button 
            onClick={() => setActiveTab('DLT')}
            className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
              activeTab === 'DLT' 
                ? 'text-amber-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${activeTab === 'DLT' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
            大乐透
            <span className="ml-1 opacity-50 font-normal">{dltCount}</span>
          </button>
          {/* Sliding Pill Background */}
          <div 
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white shadow-sm rounded-xl transition-transform duration-300 ease-out ${
              activeTab === 'SSQ' ? 'translate-x-0' : 'translate-x-full'
            }`}
          ></div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-32 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          正在整理您的收藏...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 md:py-24 bg-white rounded-[32px] border border-dashed border-slate-300 shadow-sm p-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">暂无{activeTab === 'SSQ' ? '双色球' : '大乐透'}记录</h3>
          <p className="text-sm text-slate-500">在功能模块生成的号码将在这里归档</p>
        </div>
      ) : (
        <div 
          key={activeTab}
          className="space-y-8 md:space-y-12 animate-in fade-in duration-700 fill-mode-both"
        >
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="relative pl-6 md:pl-8 group/date">
              {/* Timeline dot and line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 group-last/date:h-6 transition-all"></div>
              <div className="absolute left-[-5px] top-1.5 w-[11px] h-[11px] rounded-full bg-white border-2 border-indigo-500 shadow-sm z-10 transition-transform group-hover/date:scale-125"></div>
              
              <h3 className="text-xs font-black text-slate-400 mb-6 flex items-center justify-between tracking-[0.2em] uppercase">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date}
                </div>
                <button 
                  onClick={() => handleBatchDeleteByDate(date, items.map(i => i.id!))}
                  className="text-[10px] text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1 normal-case tracking-normal font-bold"
                >
                  <Trash2 className="w-3 h-3" />
                  删除该日全部
                </button>
              </h3>
              
              <div className="grid gap-4 md:gap-5">
                {items.map(record => {
                  const key = `${record.type}|${record.reds}|${record.blues}`;
                  const isInCart = inCartKeys.has(key);

                  return (
                    <div key={record.id} className="group bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 md:hover:-translate-y-1 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 relative overflow-hidden">
                      <div className="flex flex-wrap gap-2 md:gap-2.5 items-center">
                        {record.reds.split(',').map((n, i) => (
                          <span key={`r${i}`} className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-500 text-white flex items-center justify-center text-sm md:text-base font-black shadow-md shadow-red-100 transition-transform md:group-hover:scale-110">
                            {n}
                          </span>
                        ))}
                        <div className="w-px h-8 bg-slate-200 mx-1 md:mx-2 hidden lg:block"></div>
                        {record.blues.split(',').map((n, i) => (
                          <span key={`b${i}`} className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm md:text-base font-black shadow-md shadow-blue-100 transition-transform md:group-hover:scale-110">
                            {n}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 text-xs md:text-sm border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-50">
                        <div className="flex flex-col items-start lg:items-end gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            {record.toolUsed === 'REDUCER' ? (
                              <Calculator className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                            ) : record.toolUsed === 'RANDOM' ? (
                              <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" />
                            ) : (
                              <History className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" />
                            )}
                            {record.toolUsed === 'REDUCER' ? '缩水模式' : record.toolUsed === 'RANDOM' ? '随机生成' : '博弈模式'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                            {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 md:gap-2">
                          <button 
                            onClick={async () => {
                              if (isInCart) {
                                await storage.removeFromCartByContent(record.type, record.reds, record.blues);
                                refreshCart();
                                toast.show('已从购物车移除', 'info');
                              } else {
                                await storage.addToCart({
                                  type: record.type,
                                  reds: record.reds,
                                  blues: record.blues,
                                  toolUsed: record.toolUsed
                                });
                                refreshCart();
                                toast.show('已加入购物车', 'success');
                              }
                              loadCartState();
                            }}
                            className={`p-2 md:p-3 rounded-xl transition-all ${
                              isInCart 
                                ? 'text-emerald-600 bg-emerald-50 shadow-inner ring-1 ring-emerald-200' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isInCart ? "取消加购" : "加入购物车"}
                          >
                            {isInCart ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(record.id!)}
                            className="p-2 md:p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="永久删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
