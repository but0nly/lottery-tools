"use client";

import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/notification';
import { ShoppingCart, X, Trash2, ChevronRight, Copy, Check, Bookmark } from 'lucide-react';
import { storage, SavedCombination } from '@/lib/storage';
import confetti from 'canvas-confetti';

export function Cart() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<SavedCombination[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const loadCartData = async () => {
    const cartItems = await storage.getCart();
    setItems(cartItems);
  };

  const loadSavedData = async () => {
    const saved = await storage.getAllSaved();
    setSavedKeys(new Set(saved.map(i => `${i.type}|${i.reds}|${i.blues}`)));
  };

  useEffect(() => {
    // Initial fetch - delayed to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      loadCartData();
      loadSavedData();
    }, 0);
    
    const handleOpen = () => setIsOpen(true);
    
    window.addEventListener('cart-open', handleOpen);
    window.addEventListener('cart-updated', loadCartData);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('cart-open', handleOpen);
      window.removeEventListener('cart-updated', loadCartData);
    };
  }, []);

  const handleRemove = async (id: number) => {
    await storage.removeFromCart(id);
    refreshCart();
  };

  const handleSave = async (item: SavedCombination) => {
    const key = `${item.type}|${item.reds}|${item.blues}`;
    if (savedKeys.has(key)) {
      await storage.deleteSavedByContent(item.type, item.reds, item.blues);
      toast.show('已从收藏库移除', 'info');
    } else {
      await storage.save({
        type: item.type,
        reds: item.reds,
        blues: item.blues,
        toolUsed: item.toolUsed
      });
      toast.show('已保存到收藏库', 'success');
    }
    loadSavedData();
  };

  const handleClear = async () => {
    toast.confirm({
      title: '清空购物车',
      message: '确定要清空购物车中的所有方案吗？',
      onConfirm: async () => {
        await storage.clearCart();
        refreshCart();
        toast.show('购物车已清空', 'success');
      }
    });
  };

  const copyToClipboardInternal = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Clipboard write failed', err);
      }
    }

    // Fallback for insecure contexts (HTTP)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  };

  const copyToClipboard = async (record: SavedCombination) => {
    const text = `${record.type === 'SSQ' ? '双色球' : '大乐透'}: 红球 ${record.reds} + 蓝球 ${record.blues}`;
    const success = await copyToClipboardInternal(text);
    if (success) {
      setCopiedId(record.id!);
      setTimeout(() => setCopiedId(null), 2000);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: record.type === 'SSQ' ? ['#ef4444', '#fca5a5', '#ffffff'] : ['#f59e0b', '#fbbf24', '#ffffff']
      });
      
      toast.show('号码已复制！预祝您中大奖！🎉', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300" onClick={() => setIsOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white/95 backdrop-blur-2xl shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/20">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 -z-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">选号购物车</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                已选 {items.length} 组号码
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-10 h-10 text-slate-300" />
              </div>
              <div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-1">Cart is Empty</p>
                <p className="text-sm font-medium text-slate-500">购物车空空如也</p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const key = `${item.type}|${item.reds}|${item.blues}`;
              const isSaved = savedKeys.has(key);
              
              return (
                <div key={item.id} className="p-3 md:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-orange-100 transition-all relative group flex flex-col gap-2.5">
                  {/* 第一行：标签与号码组 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex-shrink-0 text-[10px] font-black px-2 py-1 rounded-md border tracking-widest ${
                      item.type === 'SSQ' ? 'text-rose-600 border-rose-200 bg-rose-50 shadow-sm shadow-rose-100' : 'text-amber-600 border-amber-200 bg-amber-50 shadow-sm shadow-amber-100'
                    }`}>
                      {item.type === 'SSQ' ? '双色' : '大乐'}
                    </span>
                    
                    <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar pb-0.5">
                      <div className="flex flex-nowrap gap-1.5 items-center">
                        {item.reds.split(',').map((n, i) => (
                          <span key={i} className="w-7 h-7 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-md shadow-red-100 group-hover:scale-105 transition-transform">{n}</span>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-0.5 flex-shrink-0" />
                        {item.blues.split(',').map((n, i) => (
                          <span key={i} className="w-7 h-7 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-md shadow-blue-100 group-hover:scale-105 transition-transform">{n}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 分割线 */}
                  <div className="h-px bg-slate-50 mx-1"></div>

                  {/* 第二行：操作按钮 */}
                  <div className="flex justify-end gap-2 items-center">
                    <button 
                      onClick={() => handleSave(item)}
                      className={`p-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 ${
                        isSaved ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100'
                      }`}
                      title={isSaved ? "取消收藏" : "收藏方案"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={() => copyToClipboard(item)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all shadow-sm border border-slate-100"
                      title="复制号码"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => handleRemove(item.id!)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shadow-sm border border-slate-100"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {items.length > 0 && (
          <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <button 
              onClick={async () => {
                const allText = items.map(item => `${item.type === 'SSQ' ? '双色球' : '大乐透'}: ${item.reds} + ${item.blues}`).join('\n');
                const success = await copyToClipboardInternal(allText);
                if (success) {
                  // Fire two explosions for copy all
                  const end = Date.now() + 2000;
                  const frame = () => {
                    confetti({
                      particleCount: 2,
                      angle: 60,
                      spread: 55,
                      origin: { x: 0 },
                      colors: ['#ef4444', '#3b82f6', '#f59e0b']
                    });
                    confetti({
                      particleCount: 2,
                      angle: 120,
                      spread: 55,
                      origin: { x: 1 },
                      colors: ['#ef4444', '#3b82f6', '#f59e0b']
                    });

                    if (Date.now() < end) {
                      requestAnimationFrame(frame);
                    }
                  };
                  frame();

                  toast.show('全部选号已复制！预祝您中大奖！🎉', 'success');
                } else {
                  toast.show('复制失败，请尝试手动选择并复制', 'error');
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl font-black text-lg hover:from-slate-800 hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-[0.98]"
            >
              复制全部方案
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={handleClear}
              className="w-full py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              清空购物车全部内容
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Global helper to trigger update
export const refreshCart = () => {
  window.dispatchEvent(new Event('cart-updated'));
};
