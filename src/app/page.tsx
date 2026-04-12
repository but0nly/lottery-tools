import Link from 'next/link';
import { Calculator, History, CheckCircle2, Dices } from 'lucide-react';

export default function Home() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">欢迎使用 彩通宝</h1>
        <p className="text-lg text-slate-600 max-w-3xl">专业的双色球和大乐透组合优化、智能随机选号与历史热度分析平台。在这里，你可以缩水降本、定胆随机选号，并寻找独家冷门奖号。</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
            <Calculator className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">组合缩水生成器</h2>
          <p className="text-slate-600 mb-6 min-h-[48px]">
            通过设定奇偶比、连号、和值等过滤条件，将庞大的复式组合大幅缩水，寻找最低购彩成本。
          </p>
          <ul className="space-y-2 mb-8 text-sm text-slate-600 flex-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 支持双色球、大乐透</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 多维度条件精准过滤</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 一键加入方案收藏库</li>
          </ul>
          <Link href="/reducer" className="inline-flex items-center justify-center w-full px-4 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">
            立即使用
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col border-t-4 border-t-orange-500/10">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6">
            <Dices className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">智能随机生成器</h2>
          <p className="text-slate-600 mb-6 min-h-[48px]">
            支持“定胆”随机生成，锁定心仪号码后补齐剩余空位，在概率中寻找惊喜。
          </p>
          <ul className="space-y-2 mb-8 text-sm text-slate-600 flex-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 独家长按定胆技术</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 一次生成 1-1000 注</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 自定义号码池补全</li>
          </ul>
          <Link href="/random" className="inline-flex items-center justify-center w-full px-4 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-all shadow-md shadow-orange-100">
            随机生成
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">历史热度反向计算</h2>
          <p className="text-slate-600 mb-6 min-h-[48px]">
            研究他人心理，根据历史开奖频率反向寻找冷门号码。追求与众不同，提升独揽大奖概率。
          </p>
          <ul className="space-y-2 mb-8 text-sm text-slate-600 flex-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 基于历史大数据分析</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 智能规避常见规律号</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 一键生成冷门绝杀组合</li>
          </ul>
          <Link href="/reverse" className="inline-flex items-center justify-center w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
            立即探索
          </Link>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">免责声明</h3>
        <p className="text-blue-800 text-sm leading-relaxed">
          本平台提供的所有功能及数据分析结果仅供学习、研究及娱乐参考，不构成任何投注建议。彩票具有极高的随机性，请您理性看待，量力而行。我们不对任何形式的购彩损失承担责任。
        </p>
      </div>
    </div>
  );
}
