"use client";

import { useEffect, useState } from 'react';
import { toast } from '@/lib/notification';
import { 
  Trash2, Plus, Minus, 
  Copy, Check, Pin, X, LayoutGrid
} from 'lucide-react';
import { storage, SavedCombination } from '@/lib/storage';
import { LotteryType } from '@/lib/combinations';
import { LotteryTabSwitcher } from '@/components/LotteryTabSwitcher';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const SwipeableItem = ({ 
  record, 
  onDelete, 
  onTogglePin, 
  onUpdateMultiplier, 
  onToggleSelect,
  isSelected 
}: { 
  record: SavedCombination; 
  onDelete: (id: number) => void; 
  onTogglePin: (id: number, isPinned: boolean) => void;
  onUpdateMultiplier: (id: number, delta: number) => void;
  onToggleSelect: (id: number) => void;
  isSelected: boolean;
}) => {
  const x = useMotionValue(0);
  const deleteBtnOpacity = useTransform(x, [-100, -60], [1, 0]);
  const pinBtnOpacity = useTransform(x, [60, 100], [0, 1]);

  return (
    <div className="relative overflow-hidden rounded-[24px] mb-4">
      {/* Background Action Layer (Left - Pin) */}
      <motion.div 
        style={{ opacity: pinBtnOpacity }}
        className="absolute left-0 top-0 bottom-0 w-24 bg-indigo-500 flex items-center justify-center"
      >
        <button 
          onClick={() => onTogglePin(record.id!, !record.isPinned)}
          className="w-full h-full flex flex-col items-center justify-center text-white gap-1"
        >
          {record.isPinned ? <X className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{record.isPinned ? '取消固定' : '固定'}</span>
        </button>
      </motion.div>

      {/* Background Action Layer (Right - Delete) */}
      <motion.div 
        style={{ opacity: deleteBtnOpacity }}
        className="absolute right-0 top-0 bottom-0 w-24 bg-rose-500 flex items-center justify-center"
      >
        <button 
          onClick={() => onDelete(record.id!)}
          className="w-full h-full flex flex-col items-center justify-center text-white gap-1"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">删除</span>
        </button>
      </motion.div>

      {/* Main Content Layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        style={{ x, touchAction: 'pan-y' }}
        transition={{ duration: 0 }}
        className={`bg-white p-4 md:p-5 border border-white shadow-xl shadow-slate-200/50 flex items-center gap-4 relative z-10 w-full ${record.isPinned ? 'bg-indigo-50/30 border-indigo-100/50' : ''}`}
      >
        {/* Checkbox */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(record.id!);
          }}
          className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border-2 ${
            isSelected 
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
              : 'bg-white border-slate-200'
          }`}
        >
          {isSelected && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {record.reds.split(',').map((n, i) => (
              <span key={`r${i}`} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-xs md:text-sm font-black shadow-md shadow-red-100">
                {n}
              </span>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0"></div>
            {record.blues.split(',').map((n, i) => (
              <span key={`b${i}`} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-xs md:text-sm font-black shadow-md shadow-blue-100">
                {n}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                {record.toolUsed === 'REDUCER' ? '缩水' : record.toolUsed === 'RANDOM' ? '随机' : '反向'}
              </span>
              {record.isPinned && (
                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <Pin className="w-2.5 h-2.5 fill-current" />
                  已固定
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
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30"
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
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-900"
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
  const [activeTab, setActiveTab] = useState<LotteryType>('SSQ');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await storage.getSelection();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    window.addEventListener('selection-updated', loadRecords);
    return () => window.removeEventListener('selection-updated', loadRecords);
  }, []);

  const handleDelete = async (id: number) => {
    await storage.removeFromSelection(id);
    loadRecords();
    window.dispatchEvent(new Event('selection-updated'));
    toast.show('已删除该项', 'success');
  };

  const handleTogglePin = async (id: number, isPinned: boolean) => {
    await storage.updateSelection(id, { isPinned });
    loadRecords();
    toast.show(isPinned ? '已固定该号码组' : '已取消固定', 'info');
  };

  const handleUpdateMultiplier = async (id: number, delta: number) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    const newMultiplier = Math.max(1, (record.multiplier || 1) + delta);
    if (newMultiplier === record.multiplier) return;
    
    await storage.updateSelection(id, { multiplier: newMultiplier });
    loadRecords();
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
      await navigator.clipboard.writeText(text);
      toast.show('已复制到剪贴板', 'success');

      // Clear selection and remove unpinned items
      const toDelete = selectedRecords.filter(r => !r.isPinned).map(r => r.id!);
      
      if (toDelete.length > 0) {
        for (const id of toDelete) {
          await storage.removeFromSelection(id);
        }
        window.dispatchEvent(new Event('selection-updated'));
      }
      
      setSelectedIds(new Set());
      loadRecords();
    } catch {
      toast.show('复制失败，请重试', 'error');
    }
  };

  // Grouping logic for the ACTIVE TAB
  const filteredRecords = records.filter(r => r.type === activeTab);
  const ssqCount = records.filter(r => r.type === 'SSQ').length;
  const dltCount = records.filter(r => r.type === 'DLT').length;

  return (
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-40 md:pb-32 overflow-x-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16">
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
          <p className="font-black text-slate-400 uppercase tracking-widest text-sm">正在整理您的选号单...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-24 md:py-32 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 shadow-sm p-8">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <LayoutGrid className="w-10 h-10" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">暂无{activeTab === 'SSQ' ? '双色球' : '大乐透'}选号</h3>
          <p className="text-sm md:text-base text-slate-500 font-medium">在缩水、随机或反向模块生成的号码将在这里显示</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredRecords.map(record => (
            <div key={record.id} className="w-full overflow-hidden">
              <SwipeableItem 
                record={record} 
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onUpdateMultiplier={handleUpdateMultiplier}
                onToggleSelect={toggleSelect}
                isSelected={selectedIds.has(record.id!)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 md:bottom-10 left-0 right-0 px-6 z-40 flex justify-center">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 max-w-md w-full"
          >
            <div className="flex-1">
              <p className="text-white font-black text-lg leading-tight">已选 {selectedIds.size} 注</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">复制后非固定项将自动清空</p>
            </div>
            <button 
              onClick={handleCopySelected}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>复制已选</span>
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
