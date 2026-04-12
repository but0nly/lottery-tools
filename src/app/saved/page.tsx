"use client";

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/lib/notification';
import { Bookmark, Calculator, History, Trash2, Calendar, LayoutGrid, Plus, CheckCircle2, Shuffle } from 'lucide-react';
import { storage, SavedCombination } from '@/lib/storage';
import { refreshCart } from '@/components/Cart';
import { LotteryType } from '@/lib/combinations';

import { LotteryTabSwitcher } from '@/components/LotteryTabSwitcher';
import { triggerFlyToCart } from '@/components/FlyToCartAnimation';

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
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16 md:pr-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
            <Bookmark className="w-7 h-7 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">我的收藏库</h1>
            <p className="text-slate-500 text-sm md:text-base mt-1 font-medium">保存在您本地设备中的方案存档</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <LotteryTabSwitcher 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          counts={{ SSQ: ssqCount, DLT: dltCount }}
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-32 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin shadow-inner"></div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Organizing your collection...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-24 md:py-32 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 shadow-sm p-8">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <LayoutGrid className="w-10 h-10" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">暂无{activeTab === 'SSQ' ? '双色球' : '大乐透'}记录</h3>
          <p className="text-sm md:text-base text-slate-500 font-medium">在功能模块生成的号码将在这里归档</p>
        </div>
      ) : (
        <div 
          key={activeTab}
          className="space-y-10 md:space-y-16 animate-in fade-in duration-700 fill-mode-both"
        >
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="relative pl-8 md:pl-12 group/date">
              {/* Timeline dot and line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-100 to-transparent group-last/date:h-8 transition-all"></div>
              <div className="absolute left-[-6px] top-1.5 w-[16px] h-[16px] rounded-full bg-white border-4 border-indigo-500 shadow-lg z-10 transition-transform group-hover/date:scale-125"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  {date}
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length} 注</span>
                </h3>
                <button 
                  onClick={() => handleBatchDeleteByDate(date, items.map(i => i.id!))}
                  className="text-[11px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all border border-rose-100 uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  删除该日
                </button>
              </div>
              
              <div className="grid gap-4 md:gap-6">
                {items.map(record => {
                  const key = `${record.type}|${record.reds}|${record.blues}`;
                  const isInCart = inCartKeys.has(key);

                  return (
                    <div key={record.id} className="group bg-white/70 backdrop-blur-xl p-5 md:p-8 rounded-[32px] border border-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 md:hover:-translate-y-1 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
                      <div className="flex flex-wrap gap-2.5 items-center">
                        {record.reds.split(',').map((n, i) => (
                          <span key={`r${i}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-base md:text-xl font-black shadow-lg shadow-red-100 transition-transform md:group-hover:scale-110">
                            {n}
                          </span>
                        ))}
                        <div className="w-px h-10 bg-slate-200 mx-2 hidden lg:block"></div>
                        {record.blues.split(',').map((n, i) => (
                          <span key={`b${i}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-base md:text-xl font-black shadow-lg shadow-blue-100 transition-transform md:group-hover:scale-110">
                            {n}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-6 text-sm border-t lg:border-t-0 pt-5 lg:pt-0 border-slate-50">
                        <div className="flex flex-col items-start lg:items-end gap-1.5">
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                            {record.toolUsed === 'REDUCER' ? (
                              <Calculator className="w-4 h-4 text-emerald-500" />
                            ) : record.toolUsed === 'RANDOM' ? (
                              <Shuffle className="w-4 h-4 text-orange-500" />
                            ) : (
                              <History className="w-4 h-4 text-rose-500" />
                            )}
                            <span className="text-xs font-black text-slate-600">
                              {record.toolUsed === 'REDUCER' ? '缩水模式' : record.toolUsed === 'RANDOM' ? '随机生成' : '反向分析'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest px-1">
                            {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async (e) => {
                              if (isInCart) {
                                await storage.removeFromCartByContent(record.type, record.reds, record.blues);
                                refreshCart();
                                toast.show('已从购物车移除', 'info');
                                loadCartState();
                              } else {
                                const colorClass = record.type === 'SSQ' ? 'bg-red-500' : 'bg-emerald-500';
                                triggerFlyToCart(e, colorClass);
                                
                                setTimeout(async () => {
                                  await storage.addToCart({
                                    type: record.type,
                                    reds: record.reds,
                                    blues: record.blues,
                                    toolUsed: record.toolUsed
                                  });
                                  refreshCart();
                                  toast.show('已加入购物车', 'success');
                                  loadCartState();
                                }, 600);
                              }
                            }}
                            className={`p-3.5 rounded-[20px] transition-all shadow-lg ${
                              isInCart 
                                ? 'text-emerald-600 bg-emerald-50 shadow-inner ring-1 ring-emerald-200' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 bg-white border border-slate-100 shadow-slate-100'
                            }`}
                          >
                            {isInCart ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(record.id!)}
                            className="p-3.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[20px] transition-all"
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
