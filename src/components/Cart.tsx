"use client";

import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/notification';
import { ShoppingCart, X, Trash2, ChevronRight, Copy, Check } from 'lucide-react';
import { storage, SavedCombination } from '@/lib/storage';

export function Cart() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<SavedCombination[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Draggable position state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const loadCart = async () => {
    const cartItems = await storage.getCart();
    setItems(cartItems);
  };

  const getInitialPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    
    const saved = localStorage.getItem('cart-pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate if still within bounds
        if (parsed.x < window.innerWidth && parsed.y < window.innerHeight) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved position', e);
      }
    }
    
    // Default: bottom-right
    return { 
      x: window.innerWidth - 80, 
      y: window.innerHeight - 150 
    };
  };

  useEffect(() => {
    loadCart();
    setPosition(getInitialPosition());
    
    const handleResize = () => {
      setPosition(prev => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        // Keep it within bounds and maintain edge snap
        const isNearLeft = prev.x < windowWidth / 2;
        const margin = 16;
        return {
          x: isNearLeft ? margin : windowWidth - 64 - margin,
          y: Math.max(margin, Math.min(prev.y, windowHeight - 80 - margin))
        };
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('cart-updated', loadCart);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('cart-updated', loadCart);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
      setIsDragging(true);
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (isDragging) {
      const margin = 16;
      const windowWidth = window.innerWidth;
      const snapX = (position.x + 32) < windowWidth / 2 ? margin : windowWidth - 64 - margin;
      
      const windowHeight = window.innerHeight;
      const snapY = Math.max(margin, Math.min(position.y, windowHeight - 80 - margin));
      
      const newPos = { x: snapX, y: snapY };
      setPosition(newPos);
      localStorage.setItem('cart-pos', JSON.stringify(newPos));
      setTimeout(() => setIsDragging(false), 50);
    }
  };

  const handleRemove = async (id: number) => {
    await storage.removeFromCart(id);
    loadCart();
  };

  const handleClear = async () => {
    toast.confirm({
      title: '清空购物车',
      message: '确定要清空购物车中的所有方案吗？',
      onConfirm: async () => {
        await storage.clearCart();
        loadCart();
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
    }
  };

  if (!isOpen) {
    const isAtLeft = position.x < 100;
    return (
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => !isDragging && setIsOpen(true)}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          touchAction: 'none'
        }}
        className={`fixed w-14 h-14 md:w-16 md:h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center group z-50 overflow-hidden ${
          items.length === 0 ? 'opacity-40 hover:opacity-100' : 'opacity-100'
        } ${isDragging ? 'scale-95 opacity-80 cursor-grabbing' : 'transition-[left,top,transform,opacity] duration-300 hover:scale-110 cursor-pointer'}`}
      >
        <div className={`transition-transform duration-300 ${isAtLeft ? 'translate-x-0' : 'translate-x-0'}`}>
          <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
        </div>
        {items.length > 0 && (
          <span className="absolute top-2 right-2 md:top-3 md:right-3 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in">
            {items.length}
          </span>
        )}
        
        {/* Visual indicator for collapse if near edge */}
        <div className={`absolute top-0 bottom-0 w-1 bg-white/10 ${isAtLeft ? 'left-0' : 'right-0'}`} />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">选号购物车</h2>
              <p className="text-xs text-slate-500">已选中 {items.length} 组号码</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <ShoppingCart className="w-16 h-16" />
              <p className="font-medium">购物车空空如也</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    item.type === 'SSQ' ? 'text-rose-600 border-rose-200 bg-rose-50' : 'text-amber-600 border-amber-200 bg-amber-50'
                  }`}>
                    {item.type === 'SSQ' ? '双色球' : '大乐透'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">#{item.id}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.reds.split(',').map((n, i) => (
                    <span key={i} className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{n}</span>
                  ))}
                  <div className="w-px h-4 bg-slate-200 mx-0.5 mt-1.5" />
                  {item.blues.split(',').map((n, i) => (
                    <span key={i} className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{n}</span>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => copyToClipboard(item)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-sm"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleRemove(item.id!)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-slate-100 space-y-3">
            <button 
              onClick={handleClear}
              className="w-full py-3 text-slate-500 text-sm font-medium hover:text-rose-500 transition-colors"
            >
              清空购物车
            </button>
            <button 
              onClick={async () => {
                const allText = items.map(item => `${item.type === 'SSQ' ? '双色球' : '大乐透'}: ${item.reds} + ${item.blues}`).join('\n');
                const success = await copyToClipboardInternal(allText);
                if (success) {
                  toast.show('全部选号已复制到剪贴板', 'success');
                } else {
                  toast.show('复制失败，请尝试手动选择并复制', 'error');
                }
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              复制全部方案
              <ChevronRight className="w-4 h-4" />
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
