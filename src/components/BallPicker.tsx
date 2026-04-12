"use client";

import React from 'react';

interface BallPickerProps {
  max: number;
  selected: number[];
  fixed?: number[]; // Fixed numbers (Dan Ma)
  onChange: (selected: number[]) => void;
  onFixedChange?: (fixed: number[]) => void;
  color: 'red' | 'blue';
}

export function BallPicker({ max, selected, fixed = [], onChange, onFixedChange, color }: BallPickerProps) {
  const toggle = (num: number) => {
    if (selected.includes(num)) {
      // If it's fixed, also remove it from fixed
      if (fixed.includes(num) && onFixedChange) {
        onFixedChange(fixed.filter(n => n !== num));
      }
      onChange(selected.filter((n) => n !== num));
    } else {
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
      // Must be selected first to be fixed, or auto-select it
      if (!selected.includes(num)) {
        onChange([...selected, num].sort((a, b) => a - b));
      }
      onFixedChange([...fixed, num].sort((a, b) => a - b));
    }
  };

  const handleClick = (num: number) => {
    if (onFixedChange) {
      toggleFixed(num);
    } else {
      toggle(num);
    }
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

  return (
    <div className="grid grid-cols-7 sm:flex sm:flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => {
        const isSelected = selected.includes(num);
        const isFixed = fixed.includes(num);
        
        return (
          <div key={num} className="relative aspect-square w-full sm:w-10 sm:h-10">
            <button
              onClick={() => handleClick(num)}
              onContextMenu={(e) => e.preventDefault()} 
              className={`w-full h-full rounded-full flex items-center justify-center font-medium border transition-all text-xs sm:text-base select-none ${
                isFixed ? fixedClasses : isSelected ? selectedClasses : colorClasses
              }`}
            >
              {num.toString().padStart(2, '0')}
            </button>
            {isFixed && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] sm:text-[10px] px-1 rounded-sm text-slate-900 font-bold leading-tight border border-white shadow-sm pointer-events-none">
                胆
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
