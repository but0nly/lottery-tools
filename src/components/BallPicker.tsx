"use client";

import React, { useState, useRef, useCallback } from 'react';

interface BallPickerProps {
  max: number;
  selected: number[];
  fixed?: number[]; // Fixed numbers (Dan Ma)
  excluded?: number[]; // Excluded numbers (Sha Hao)
  onChange: (selected: number[]) => void;
  onFixedChange?: (fixed: number[]) => void;
  onExcludedChange?: (excluded: number[]) => void;
  color: 'red' | 'blue';
}

export function BallPicker({ max, selected, fixed = [], excluded = [], onChange, onFixedChange, onExcludedChange, color }: BallPickerProps) {
  const [longPressNum, setLongPressNum] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number, y: number } | null>(null);
  const MOVE_THRESHOLD = 10; // 10px threshold to distinguish between click and scroll

  const toggle = (num: number) => {
    if (selected.includes(num)) {
      // If it's fixed, also remove it from fixed
      if (fixed.includes(num) && onFixedChange) {
        onFixedChange(fixed.filter(n => n !== num));
      }
      onChange(selected.filter((n) => n !== num));
    } else {
      // If it was excluded, remove it from excluded
      if (excluded.includes(num) && onExcludedChange) {
        onExcludedChange(excluded.filter(n => n !== num));
      }
      onChange([...selected, num].sort((a, b) => a - b));
    }
  };

  const toggleFixed = (num: number) => {
    if (!onFixedChange) return;

    if (fixed.includes(num)) {
      onFixedChange(fixed.filter(n => n !== num));
      // Also remove from selected to completely unselect
      onChange(selected.filter(n => n !== num));
    } else {
      // If it was excluded, remove it from excluded
      if (excluded.includes(num) && onExcludedChange) {
        onExcludedChange(excluded.filter(n => n !== num));
      }
      // Must be selected first to be fixed, or auto-select it
      if (!selected.includes(num)) {
        onChange([...selected, num].sort((a, b) => a - b));
      }
      onFixedChange([...fixed, num].sort((a, b) => a - b));
    }
  };

  const toggleExcluded = useCallback((num: number) => {
    if (!onExcludedChange) return;

    if (excluded.includes(num)) {
      onExcludedChange(excluded.filter(n => n !== num));
    } else {
      // Cannot be selected or fixed if excluded
      onChange(selected.filter(n => n !== num));
      if (onFixedChange) {
        onFixedChange(fixed.filter(n => n !== num));
      }
      onExcludedChange([...excluded, num].sort((a, b) => a - b));
    }
  }, [excluded, onExcludedChange, fixed, onFixedChange, onChange, selected]);

  const handlePointerDown = (e: React.PointerEvent, num: number) => {
    setLongPressNum(num);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    timerRef.current = setTimeout(() => {
      toggleExcluded(num);
      setLongPressNum(null);
    }, 600); // 600ms for long press
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current || !longPressNum) return;
    
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > MOVE_THRESHOLD) {
      // User is scrolling/moving, cancel the long press and click
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setLongPressNum(null);
      startPosRef.current = null;
    }
  };

  const handlePointerUp = (num: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (longPressNum === num) {
        // This was a click, not a long press or scroll
        if (onFixedChange) {
          toggleFixed(num);
        } else {
          toggle(num);
        }
      }
    }
    setLongPressNum(null);
    startPosRef.current = null;
  };

  const handlePointerCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setLongPressNum(null);
    startPosRef.current = null;
  };

  const colorClasses = color === 'red' 
    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
    : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100';

  const selectedClasses = color === 'red'
    ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200'
    : 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200';

  const fixedClasses = color === 'red'
    ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-300 ring-offset-1'
    : 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300 ring-offset-1';

  const excludedClasses = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 scale-95';

  return (
    <div className="grid grid-cols-7 sm:flex sm:flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => {
        const isSelected = selected.includes(num);
        const isFixed = fixed.includes(num);
        const isExcluded = excluded.includes(num);
        
        return (
          <div key={num} className="relative aspect-square w-full sm:w-10 sm:h-10">
            <button
              onPointerDown={(e) => handlePointerDown(e, num)}
              onPointerMove={handlePointerMove}
              onPointerUp={() => handlePointerUp(num)}
              onPointerLeave={handlePointerCancel}
              onPointerCancel={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()} 
              className={`w-full h-full rounded-full flex items-center justify-center font-medium border transition-all text-xs sm:text-base select-none touch-manipulation ${
                isExcluded ? excludedClasses : isFixed ? fixedClasses : isSelected ? selectedClasses : colorClasses
              } ${longPressNum === num ? 'scale-90 brightness-90' : ''}`}
            >
              {num.toString().padStart(2, '0')}
            </button>
            {isFixed && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] sm:text-[10px] px-1 rounded-sm text-slate-900 font-bold leading-tight border border-white shadow-sm pointer-events-none">
                胆
              </span>
            )}
            {isExcluded && (
              <span className="absolute -top-1 -right-1 bg-slate-400 text-[8px] sm:text-[10px] px-1 rounded-sm text-white font-bold leading-tight border border-white shadow-sm pointer-events-none">
                杀
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
