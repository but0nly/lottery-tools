"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, History, Bookmark, Dices } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '首页', icon: Home, activeColor: 'text-emerald-500' },
    { href: '/reducer', label: '缩水', icon: Calculator, activeColor: 'text-emerald-500' },
    { href: '/random', label: '随机', icon: Dices, activeColor: 'text-orange-500', special: true },
    { href: '/reverse', label: '反向', icon: History, activeColor: 'text-rose-500' },
    { href: '/saved', label: '库', icon: Bookmark, activeColor: 'text-blue-500' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-100 h-screen flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">彩通宝</h1>
          <p className="text-sm text-slate-400 mt-1">组合优化与历史分析</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? item.activeColor : 'text-slate-400'}`} />
                <span>{item.label === '库' ? '方案收藏库' : item.label === '缩水' ? '组合缩水生成器' : item.label === '反向' ? '历史反向计算器' : item.label === '随机' ? '智能随机生成器' : item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">仅供参考，理性购彩</p>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex justify-around items-end h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.special) {
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className="relative -top-6 flex flex-col items-center justify-center"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isActive ? 'bg-orange-500' : 'bg-slate-800'}`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex flex-col items-center justify-center flex-1 py-3"
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? item.activeColor : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
