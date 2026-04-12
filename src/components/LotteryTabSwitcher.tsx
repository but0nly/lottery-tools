import React from 'react';
import { LotteryType } from '@/lib/combinations';

interface LotteryTabSwitcherProps {
  activeTab: LotteryType;
  onTabChange: (tab: LotteryType) => void;
  counts?: {
    SSQ?: number;
    DLT?: number;
  };
}

export function LotteryTabSwitcher({ activeTab, onTabChange, counts }: LotteryTabSwitcherProps) {
  return (
    <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 relative w-full md:w-auto md:min-w-[280px]">
      <button 
        onClick={() => onTabChange('SSQ')}
        className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
          activeTab === 'SSQ' 
            ? 'text-rose-600' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${activeTab === 'SSQ' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></span>
        双色球
        {counts?.SSQ !== undefined && <span className="ml-1 opacity-50 font-normal">{counts.SSQ}</span>}
      </button>
      <button 
        onClick={() => onTabChange('DLT')}
        className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
          activeTab === 'DLT' 
            ? 'text-amber-600' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${activeTab === 'DLT' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
        大乐透
        {counts?.DLT !== undefined && <span className="ml-1 opacity-50 font-normal">{counts.DLT}</span>}
      </button>
      {/* Sliding Pill Background */}
      <div 
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white shadow-sm rounded-xl transition-transform duration-300 ease-out ${
          activeTab === 'SSQ' ? 'translate-x-0' : 'translate-x-full'
        }`}
      ></div>
    </div>
  );
}
