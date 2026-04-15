"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimationInstance {
  id: number;
  startX: number;
  startY: number;
  color: string;
}

export function FlyToCartAnimationContainer() {
  const [animations, setAnimations] = useState<AnimationInstance[]>([]);

  const handleFly = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const { startX, startY, color = "bg-orange-500" } = customEvent.detail;
    const id = Date.now();
    setAnimations(prev => [...prev, { id, startX, startY, color }]);
  }, []);

  useEffect(() => {
    window.addEventListener('fly-to-cart-trigger', handleFly);
    return () => window.removeEventListener('fly-to-cart-trigger', handleFly);
  }, [handleFly]);

  const removeAnimation = (id: number) => {
    setAnimations(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {animations.map((anim) => (
          <FlyToCartItem 
            key={anim.id} 
            {...anim} 
            onComplete={() => removeAnimation(anim.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FlyToCartItem({ startX, startY, color, onComplete }: AnimationInstance & { onComplete: () => void }) {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Try desktop icon first, then mobile icon
    const cartIcon = document.getElementById('cart-icon') || document.getElementById('cart-icon-mobile');
    if (cartIcon) {
      const rect = cartIcon.getBoundingClientRect();
      // If the icon is not visible (e.g. display: none), find the other one
      if (rect.width === 0 && rect.height === 0) {
        const otherIcon = document.getElementById('cart-icon-mobile') || document.getElementById('cart-icon');
        if (otherIcon) {
          const otherRect = otherIcon.getBoundingClientRect();
          setTimeout(() => {
            setTargetPos({
              x: otherRect.left + otherRect.width / 2,
              y: otherRect.top + otherRect.height / 2
            });
          }, 0);
          return;
        }
      }
      setTimeout(() => {
        setTargetPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }, 0);
    } else {
      onComplete();
    }
  }, [onComplete]);

  if (!targetPos) return null;

  return (
    <motion.div
      initial={{ 
        position: 'fixed',
        left: startX,
        top: startY,
        x: '-50%',
        y: '-50%',
        scale: 1,
        opacity: 1
      }}
      animate={{ 
        left: targetPos.x,
        top: targetPos.y,
        scale: 0.1,
        opacity: 0,
      }}
      transition={{ 
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      onAnimationComplete={onComplete}
      className={`w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 border-white ${color} text-white font-black text-xs z-[9999]`}
    >
      <div className="w-full h-full flex items-center justify-center opacity-70">
        +1
      </div>
    </motion.div>
  );
}

/**
 * Helper to trigger the fly animation from any component
 */
export const triggerFlyToCart = (e: React.MouseEvent | { clientX: number, clientY: number }, color?: string) => {
  const startX = 'clientX' in e ? e.clientX : (e as React.MouseEvent).clientX || 0;
  const startY = 'clientY' in e ? e.clientY : (e as React.MouseEvent).clientY || 0;

  window.dispatchEvent(new CustomEvent('fly-to-cart-trigger', { 
    detail: { startX, startY, color } 
  }));
};
