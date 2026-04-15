"use client";

import { useEffect, useState } from 'react';
import { toast } from '@/lib/notification';
import { 
  Trash2, Plus, Minus, 
  Copy, Check, Star, X, LayoutGrid,
  Calculator, RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import { storage, SavedCombination } from '@/lib/storage';
import { LotteryType } from '@/lib/combinations';
import { useLotteryContext } from '@/app/LotteryContext';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import confetti from 'canvas-confetti';

const SwipeableItem = ({ 
  record, 
  onDelete, 
  onToggleFavorite, 
  onUpdateMultiplier, 
  onToggleSelect,
  isSelected 
}: { 
  record: SavedCombination; 
  onDelete: (id: number) => void; 
  onToggleFavorite: (id: number, isFavorite: boolean) => void;
  onUpdateMultiplier: (id: number, delta: number) => void;
  onToggleSelect: (id: number) => void;
  isSelected: boolean;
}) => {
  const x = useMotionValue(0);
  const deleteBtnOpacity = useTransform(x, [-100, -60], [1, 0]);
  const deleteBtnOpacityLeft = useTransform(x, [60, 100], [0, 1]);
  
  const deleteScale = useTransform(x, [-100, -80], [1.2, 1]);
  const deleteScaleLeft = useTransform(x, [80, 100], [1, 1.2]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      onDelete(record.id!);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] mb-4 group">
      {/* Background Action Layer (Delete from both sides) */}
      <motion.div 
        style={{ opacity: deleteBtnOpacityLeft }}
        className="absolute left-0 top-0 bottom-0 w-32 bg-rose-500 flex items-center justify-start pl-8"
      >
        <motion.div style={{ scale: deleteScaleLeft }} className="flex flex-col items-center text-white gap-1">
          <Trash2 className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">删除</span>
        </motion.div>
      </motion.div>

      <motion.div 
        style={{ opacity: deleteBtnOpacity }}
        className="absolute right-0 top-0 bottom-0 w-32 bg-rose-500 flex items-center justify-end pr-8"
      >
        <motion.div style={{ scale: deleteScale }} className="flex flex-col items-center text-white gap-1">
          <Trash2 className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">删除</span>
        </motion.div>
      </motion.div>

      {/* Main Content Layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`bg-white p-4 md:p-5 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-3 md:gap-4 relative z-10 w-full transition-colors ${record.isPinned ? 'bg-amber-50/20 border-amber-100/30' : ''}`}
      >
        {/* Checkbox */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(record.id!);
          }}
          className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border-2 transition-all ${
            isSelected 
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
              : 'bg-white border-slate-200 hover:border-emerald-400'
          }`}
        >
          {isSelected && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-1">
              {record.reds.split(',').map((n, i) => (
                <span key={`r${i}`} className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-sm font-black shadow-md shadow-red-100">
                  {n}
                </span>
              ))}
              <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0"></div>
              {record.blues.split(',').map((n, i) => (
                <span key={`b${i}`} className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-sm font-black shadow-md shadow-blue-100">
                  {n}
                </span>
              ))}
            </div>

            {/* Favorite Star Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(record.id!, !record.isPinned);
              }}
              className={`flex-shrink-0 p-2 rounded-xl transition-all active:scale-90 ${
                record.isPinned 
                  ? 'text-amber-500 bg-amber-50 border border-amber-100 shadow-sm' 
                  : 'text-slate-300 hover:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-5 h-5 ${record.isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                {record.toolUsed === 'REDUCER' ? '缩水' : record.toolUsed === 'RANDOM' ? '随机' : '反向'}
              </span>
              {record.isPinned && (
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  已收藏
                </div>
              )}
            </div>

            {/* Multiplier Controls */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateMultiplier(record.id!, -1);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"
                disabled={(record.multiplier || 1) <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="px-2 min-w-[32px] text-center font-black text-xs text-slate-900">
                {record.multiplier || 1}<span className="text-[10px] ml-0.5">倍</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateMultiplier(record.id!, 1);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function SavedPage() {
  const [records, setRecords] = useState<SavedCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeType: activeTab } = useLotteryContext();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadRecords = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await storage.getSelection();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    const handleUpdate = () => loadRecords(true);
    window.addEventListener('selection-updated', handleUpdate);
    return () => window.removeEventListener('selection-updated', handleUpdate);
  }, []);

  const handleDelete = async (id: number) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    const performDelete = async () => {
      // Optimistic delete
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      await storage.removeFromSelection(id);
      window.dispatchEvent(new Event('selection-updated'));
      toast.show('已从列表中移除', 'success');
    };

    if (record.isPinned) {
      toast.confirm({
        title: '删除收藏项',
        message: '该号码已被收藏，确定要将其从列表中永久移除吗？',
        onConfirm: performDelete
      });
    } else {
      await performDelete();
    }
  };

  const handleToggleFavorite = async (id: number, isPinned: boolean) => {
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === id ? { ...r, isPinned } : r));
    
    await storage.updateSelection(id, { isPinned });
    window.dispatchEvent(new Event('selection-updated'));
    toast.show(isPinned ? '已加入收藏' : '已取消收藏', 'info');
  };

  const handleUpdateMultiplier = async (id: number, delta: number) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    const newMultiplier = Math.max(1, (record.multiplier || 1) + delta);
    if (newMultiplier === record.multiplier) return;
    
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === id ? { ...r, multiplier: newMultiplier } : r));
    
    await storage.updateSelection(id, { multiplier: newMultiplier });
    window.dispatchEvent(new Event('selection-updated'));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopySelected = async () => {
    const selectedRecords = records.filter(r => selectedIds.has(r.id!));
    if (selectedRecords.length === 0) {
      toast.show('请先勾选要复制的号码', 'info');
      return;
    }

    const text = selectedRecords.map(r => {
      const label = r.type === 'SSQ' ? '双色球' : '大乐透';
      const multiplierText = (r.multiplier || 1) > 1 ? ` ✖️ ${r.multiplier}` : '';
      return `${label}: 红球 ${r.reds} + 蓝球 ${r.blues}${multiplierText}`;
    }).join('\n');

    try {
      // Modern API (Requires HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP/older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) throw new Error('Fallback failed');
      }
      
      toast.show('已复制到剪贴板，祝您中大奖！ 🎉', 'success');
      
      // Celebratory animation
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6']
      });
    } catch {
      toast.show('复制失败，请重试', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedRecords = records.filter(r => selectedIds.has(r.id!));
    const favoriteCount = selectedRecords.filter(r => r.isPinned).length;
    
    const message = favoriteCount > 0 
      ? `确定要删除选中的 ${selectedIds.size} 注号码吗？（其中包含 ${favoriteCount} 注收藏号码）`
      : `确定要删除选中的 ${selectedIds.size} 注号码吗？`;

    toast.confirm({
      title: '确认批量删除',
      message,
      onConfirm: async () => {
        const idsToRemove = Array.from(selectedIds);
        // Optimistic update
        setRecords(prev => prev.filter(r => !selectedIds.has(r.id!)));
        setSelectedIds(new Set());

        for (const id of idsToRemove) {
          await storage.removeFromSelection(id);
        }
        window.dispatchEvent(new Event('selection-updated'));
        toast.show('已批量删除选中项', 'success');
      }
    });
  };

  const handleClearCurrent = async () => {
    const currentTabRecords = records.filter(r => r.type === activeTab);
    const nonFavorites = currentTabRecords.filter(r => !r.isPinned);
    
    if (currentTabRecords.length === 0) return;

    if (nonFavorites.length === 0) {
      toast.show('当前页全是收藏号码，如需删除请手动操作', 'info');
      return;
    }

    toast.confirm({
      title: '一键清理',
      message: `将清理当前页 ${nonFavorites.length} 注未收藏的号码，保留收藏号码。确认吗？`,
      onConfirm: async () => {
        const idsToRemove = nonFavorites.map(r => r.id!);
        // Optimistic update
        setRecords(prev => prev.filter(r => !idsToRemove.includes(r.id!)));
        
        for (const id of idsToRemove) {
          await storage.removeFromSelection(id);
        }
        window.dispatchEvent(new Event('selection-updated'));
        toast.show('清理完成', 'success');
      }
    });
  };

  // Grouping logic for the ACTIVE TAB
  const filteredRecords = records.filter(r => r.type === activeTab);
  const ssqCount = records.filter(r => r.type === 'SSQ').length;
  const dltCount = records.filter(r => r.type === 'DLT').length;

  const selectedInCurrentTab = filteredRecords.filter(r => selectedIds.has(r.id!));
  const isAllSelected = filteredRecords.length > 0 && selectedInCurrentTab.length === filteredRecords.length;
  const isPartialSelected = selectedInCurrentTab.length > 0 && selectedInCurrentTab.length < filteredRecords.length;

  // Calculate total cost for selected items
  const totalCost = selectedInCurrentTab.reduce((acc, curr) => acc + (curr.multiplier || 1) * 2, 0);

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all in current tab
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredRecords.forEach(r => next.delete(r.id!));
        return next;
      });
    } else {
      // Select all in current tab
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredRecords.forEach(r => next.add(r.id!));
        return next;
      });
    }
  };

  return (
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-40 md:pb-32 overflow-x-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 md:mb-10">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end w-full gap-4">
          <div className="flex items-center gap-2 ml-auto">
            {filteredRecords.length > 0 && (
              <>
                <button 
                  onClick={handleClearCurrent}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-white text-rose-500 border border-rose-100 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                  title="清理未收藏号码"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">一键清理</span>
                </button>
                <button 
                  onClick={handleSelectAll}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 ${
                    isAllSelected 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                      : isPartialSelected
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border-2 transition-colors ${
                    isAllSelected ? 'bg-white border-white text-emerald-500' : isPartialSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                  }`}>
                    {isAllSelected && <Check className="w-3 h-3" strokeWidth={4} />}
                    {isPartialSelected && <Minus className="w-3 h-3" strokeWidth={4} />}
                  </div>
                  <span>{isAllSelected ? '取消全选' : isPartialSelected ? '选中当前' : '全选'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-32 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin shadow-inner"></div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-sm">正在整理您的选号单...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 md:py-32 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 shadow-sm p-8">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <LayoutGrid className="w-10 h-10" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">暂无{activeTab === 'SSQ' ? '双色球' : '大乐透'}选号</h3>
          <p className="text-sm md:text-base text-slate-500 font-medium mb-10 max-w-md mx-auto">
            在缩水、随机或反向模块生成的号码将在这里显示。您可以先去生成一些号码：
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Link href="/reducer" className="flex flex-col items-center gap-3 p-6 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="font-black text-slate-700">缩水过滤</span>
            </Link>
            <Link href="/random" className="flex flex-col items-center gap-3 p-6 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <span className="font-black text-slate-700">智能随机</span>
            </Link>
            <Link href="/reverse" className="flex flex-col items-center gap-3 p-6 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <span className="font-black text-slate-700">反向博弈</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredRecords.map(record => (
            <div key={record.id} className="w-full">
              <SwipeableItem 
                record={record} 
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onUpdateMultiplier={handleUpdateMultiplier}
                onToggleSelect={toggleSelect}
                isSelected={selectedIds.has(record.id!)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <div className="fixed bottom-24 md:bottom-10 left-0 right-0 px-4 md:px-6 z-40 flex justify-center">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 md:px-6 py-4 rounded-[32px] shadow-2xl flex items-center gap-3 md:gap-4 max-w-2xl w-full"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-base md:text-lg leading-tight">已选 {selectedIds.size} 注</p>
                  <div className="h-4 w-px bg-white/20" />
                  <p className="text-emerald-400 font-black text-base md:text-lg">¥{totalCost}</p>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 truncate">
                  {isAllSelected ? '已全选当前列表' : '可批量复制或删除'}
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-2">
                <button 
                  onClick={handleDeleteSelected}
                  className="p-3 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all"
                  title="删除已选"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleCopySelected}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 md:px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">复制选号</span>
                  <span className="sm:hidden text-xs">复制</span>
                </button>
                <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="取消选择"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
