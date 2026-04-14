"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Home, Calculator, History, Bookmark, Dices } from 'lucide-react';
import { CartButton } from './CartButton';

const navItems = [
  { href: '/', label: '首页', icon: Home, activeColor: 'text-emerald-500' },
  { href: '/reducer', label: '缩水', icon: Calculator, activeColor: 'text-emerald-500' },
  { href: '/random', label: '随机', icon: Dices, activeColor: 'text-orange-500', special: true },
  { href: '/reverse', label: '反向', icon: History, activeColor: 'text-rose-500' },
  { href: '/saved', label: '库', icon: Bookmark, activeColor: 'text-blue-500' },
];

const getPageTitle = (pathname: string) => {
  const currentItem = navItems.find(item => item.href === pathname);
  return currentItem?.label === '库' ? '我的收藏库' : 
         currentItem?.label === '缩水' ? '组合缩水选号' : 
         currentItem?.label === '反向' ? '反向冷门分析' : 
         currentItem?.label === '随机' ? '智能随机选号' : 
         currentItem?.label || '彩通宝';
};

// 移动端顶部导航头
export function MobileHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="md:hidden h-16 bg-white/80 backdrop-blur-2xl text-slate-900 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-100/50 shadow-sm shadow-slate-100/20 z-50 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-white font-black text-xs">彩</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-black tracking-tight leading-none text-slate-900">彩通宝</h1>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{pageTitle}</span>
        </div>
      </div>

      <CartButton className="text-slate-500 hover:text-slate-900 bg-slate-100/40 hover:bg-slate-100 rounded-2xl p-2.5 transition-all active:scale-90" />
    </header>
  );
}

// 桌面端侧边栏
export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex w-64 bg-slate-950 text-slate-100 h-full flex-col flex-shrink-0 border-r border-slate-800/50 relative overflow-hidden">
      {/* Subtle Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
      
      <div className="p-8 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <span className="text-white font-black text-xl">彩</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">彩通宝</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Smart Lottery</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-white/10 text-white shadow-xl shadow-black/20 ring-1 ring-white/10' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? item.activeColor : 'text-slate-500'}`} />
              <span className="font-bold tracking-tight">{getPageTitle(item.href)}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-slate-900/50 relative">
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
          <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
            数据驱动 · 理性购彩<br/>仅供娱乐参考
          </p>
        </div>
      </div>
    </div>
  );
}

// 移动端底部导航栏
export function MobileNav() {
  const pathname = usePathname();
  const [isShaking, setIsShaking] = useState(false);

  const handleDiceClick = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  return (
    <div className="md:hidden fixed bottom-3 left-0 right-0 px-6 z-50">
      <nav className="bg-white/95 backdrop-blur-2xl border border-white/50 shadow-[0_15px_50px_-12px_rgba(0,0,0,0.15)] rounded-[28px] flex justify-around items-center h-[64px] px-1 max-w-md mx-auto relative overflow-visible">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.special) {
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={handleDiceClick}
                className="relative -top-3.5 flex flex-col items-center justify-center transition-transform active:scale-90"
              >
                <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-2xl transition-all ring-4 ring-white ${isActive ? 'bg-orange-500 shadow-orange-200' : 'bg-slate-950 shadow-slate-900/40'}`}>
                  <item.icon className={`w-6 h-6 text-white ${isShaking ? 'animate-shake' : ''}`} />
                </div>
                <span className={`text-[9px] mt-1 font-black tracking-widest uppercase transition-colors ${isActive ? 'text-orange-600' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95 group relative"
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-slate-100 scale-105 shadow-inner' : 'group-hover:bg-slate-50/50'}`}>
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? `${item.activeColor}` : 'text-slate-400'}`} />
              </div>
              <span className={`text-[9px] mt-0.5 font-bold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
