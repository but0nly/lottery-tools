import Link from 'next/link';
import { Calculator, History, CheckCircle2, Dices, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-full p-6 pb-32 md:p-12 max-w-7xl mx-auto overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60 -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-3xl opacity-60 -ml-32 -mb-32" />

      <header className="hidden md:block mb-16 relative">
        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-blue-600 uppercase bg-blue-50 rounded-full">
          智能选号 · 数据驱动
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
          欢迎使用 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">彩通宝</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          专业的双色球和大乐透组合优化、智能随机选号与历史热度分析平台。在这里，你可以缩水降本、定胆随机选号，并寻找独家冷门奖号。
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {/* Card 1: Reducer */}
        <div className="group bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 hover:-translate-y-2 transition-all duration-300 flex flex-col">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
            <Calculator className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">组合缩水生成器</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            通过设定奇偶比、连号、和值等过滤条件，将庞大的复式组合大幅缩水，有效降低购彩成本。
          </p>
          <ul className="space-y-3 mb-8 text-sm text-slate-500 flex-1">
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 支持双色球、大乐透</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 独家旋转矩阵优化算法</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 精准条件过滤与方案导出</li>
          </ul>
          <Link href="/reducer" className="group/btn inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300">
            立即开始
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 2: Random */}
        <div className="group bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 hover:-translate-y-2 transition-all duration-300 flex flex-col border-b-4 border-b-orange-500/20">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
            <Dices className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">智能随机生成器</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            支持“定胆”与“杀号”随机生成，锁定心仪号码并排除不看好的号码后补齐空位，在数学概率中寻找属于你的惊喜。
          </p>
          <ul className="space-y-3 mb-8 text-sm text-slate-500 flex-1">
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 灵活一键定胆与杀号</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 一次生成 1-1000 注</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-orange-500"/> 自定义号码池补全</li>
          </ul>
          <Link href="/random" className="group/btn inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300">
            随机选号
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 3: Reverse */}
        <div className="group bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 hover:-translate-y-2 transition-all duration-300 flex flex-col">
          <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
            <History className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">历史热度反向计算</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            研究他人心理，根据历史开奖频率反向寻找冷门号码。规避热门陷阱，提升独揽大奖概率。
          </p>
          <ul className="space-y-3 mb-8 text-sm text-slate-500 flex-1">
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 基于历史大数据分析</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 智能规避常见规律号</li>
            <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-rose-500"/> 寻找独特的冷门绝杀组合</li>
          </ul>
          <Link href="/reverse" className="group/btn inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-300 hover:shadow-slate-400">
            反向探索
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
      
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span className="w-2 h-8 bg-blue-300 rounded-full" />
          免责声明
        </h3>
        <p className="text-blue-50/90 text-sm leading-relaxed max-w-4xl relative z-10">
          本平台提供的所有功能及数据分析结果仅供学习、研究及娱乐参考，不构成任何投注建议。彩票具有极高的随机性，请您理性看待，量力而行。我们不对任何形式的购彩损失承担责任。购彩有风险，请遵守当地法律法规。
        </p>
      </div>
    </div>
  );
}
