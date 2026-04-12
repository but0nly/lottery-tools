"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { storage } from '@/lib/storage';

interface CartButtonProps {
  className?: string;
}

export function CartButton({ className = "" }: CartButtonProps) {
  const [count, setCount] = useState(0);

  const loadCount = async () => {
    const items = await storage.getCart();
    setCount(items.length);
  };

  useEffect(() => {
    // Initial fetch - delayed to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      loadCount();
    }, 0);
    
    // Listen for cart updates to refresh the badge count
    window.addEventListener('cart-updated', loadCount);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('cart-updated', loadCount);
    };
  }, []);

  const handleOpenCart = () => {
    window.dispatchEvent(new Event('cart-open'));
  };

  return (
    <button
      onClick={handleOpenCart}
      className={`relative p-2.5 transition-all active:scale-90 hover:scale-110 flex items-center justify-center ${className}`}
      aria-label="打开购物车"
    >
      <ShoppingCart id="cart-icon" className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-rose-500/40 animate-in zoom-in duration-300">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
