"use client";

import { useEffect, useState } from 'react';
import { DEFAULT_GAME_THEORY_CONFIG, GameTheoryConfig, generateReverseBatch } from '@/lib/combinations';
import { storage, ReverseSettings } from '@/lib/storage';
import { toast } from '@/lib/notification';
import { useLotteryContext } from '@/app/LotteryContext';
import { BrainCircuit, CheckCircle2, History, Info, Loader2, Plus, Sliders } from 'lucide-react';

type Combination = { reds: number[]; blues: number[] };
const format = (numbers: number[]) => numbers.map(n => String(n).padStart(2, '0')).join(',');

export default function ReversePage() {
  const { activeType: type } = useLotteryContext();
  const [mode, setMode] = useState<'GAME_THEORY' | 'FREQUENCY'>('GAME_THEORY');
  const [config, setConfig] = useState<GameTheoryConfig>(DEFAULT_GAME_THEORY_CONFIG);
  const [historySize, setHistorySize] = useState(100);
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<Combination[]>([]);
  const [sampleSize, setSampleSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsType, setSettingsType] = useState<string | null>(null);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const refresh = async () => setExisting(new Set((await storage.getSelection()).filter(r => r.type === type).map(r => `${r.reds}|${r.blues}`)));
  // Results and saved-combination status are scoped to the active lottery.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { setResults([]); setSampleSize(null); void refresh(); }, [type]);
  useEffect(() => {
    let cancelled = false;
    storage.getSettings<ReverseSettings>('reverse_params').then(settings => {
      if (cancelled) return;
      if (settings?.type === type) {
        setMode(settings.mode); setHistorySize(settings.historySize); setConfig(settings.gtConfig);
      } else { setMode('GAME_THEORY'); setHistorySize(100); setConfig(DEFAULT_GAME_THEORY_CONFIG); }
      setSettingsType(type);
    }).catch(() => { if (!cancelled) setSettingsType(type); });
    return () => { cancelled = true; };
  }, [type]);
  useEffect(() => {
    if (settingsType === type) void storage.setSettings('reverse_params', { type, mode, historySize, gtConfig: config });
  }, [settingsType, type, mode, historySize, config]);
  const generate = async () => {
    if (!Number.isInteger(count) || count < 1 || count > 1000) { toast.show('请输入 1–1000 注', 'warning'); return; }
    setBusy(true); setResults([]); setSampleSize(null);
    try {
      let history: { reds: string; blues: string }[] | undefined;
      if (mode === 'FREQUENCY') {
        const response = await fetch(`/api/history?type=${type}&limit=${historySize}`);
        if (!response.ok) throw new Error('历史数据获取失败');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('历史数据无效');
        const valid = (value: unknown, length: number, max: number) => {
          if (typeof value !== 'string') return false;
          const nums = value.split(',').map(Number);
          return nums.length === length && new Set(nums).size === length && nums.every(n => Number.isInteger(n) && n >= 1 && n <= max);
        };
        history = data.filter(d => valid(d.reds, type === 'SSQ' ? 6 : 5, type === 'SSQ' ? 33 : 35) && valid(d.blues, type === 'SSQ' ? 1 : 2, type === 'SSQ' ? 16 : 12));
        if (!history?.length) throw new Error('没有有效的历史开奖数据');
        setSampleSize(history.length);
      }
      const batch = generateReverseBatch(type, count, config, history);
      setResults(batch);
      toast.show(batch.length < count ? `生成 ${batch.length} 注；达到尝试次数上限，无法取得更多不重复组合` : `已生成 ${batch.length} 注`, batch.length < count ? 'warning' : 'success');
    } catch (error) { toast.show(error instanceof Error ? error.message : '分析失败', 'error'); }
    finally { setBusy(false); }
  };
  const add = async (items: Combination[]) => {
    const { saved, skipped } = await storage.addBatchToSelection(items.map(r => ({ type, reds: format(r.reds), blues: format(r.blues), toolUsed: 'REVERSE' as const })));
    await refresh(); window.dispatchEvent(new Event('selection-updated'));
    toast.show(`加入 ${saved} 注，跳过 ${skipped} 注重复`, saved ? 'success' : 'info');
  };
  return <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
    <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-rose-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
    <div className="hidden md:flex flex-col gap-2 mb-10">
      <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-200"><History className="w-7 h-7" /></span>反向冷门分析</h1>
      <p className="text-slate-500 ml-1">根据选号偏好假设或历史频次生成号码</p>
    </div>
    <div className="flex w-full md:w-auto md:inline-flex p-1.5 bg-slate-100/50 rounded-2xl mb-6 md:mb-10 border border-slate-200/50">{([['GAME_THEORY', '心理避让'], ['FREQUENCY', '历史低频']] as const).map(([value, label]) => <button key={value} onClick={() => { setMode(value); setResults([]); setSampleSize(null); }} className={`flex-1 md:flex-none min-h-11 px-6 rounded-xl font-black transition-all text-sm ${mode === value ? 'bg-white text-rose-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500'}`}>{label}</button>)}</div>
    <div className="grid lg:grid-cols-2 gap-6 md:gap-8 min-w-0">
      <div className="space-y-6 min-w-0">
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />核心逻辑说明</h3>
          <p className="text-sm text-slate-500 leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100">{mode === 'GAME_THEORY' ? '根据日期和吉祥数字等偏好假设加权抽样，并尽量分散多注号码。权重未经真实投注数据验证，不保证减少撞注或提高收益。' : '根据所选历史开奖样本中的频次加权抽样。历史低频不代表未来更容易开出，也不能反映他人选号偏好。'}</p>
          <p className="mt-3 text-xs text-rose-600/80 flex items-start gap-1.5"><Info className="w-4 h-4 flex-shrink-0" />在公平、独立开奖的假设下，历史开奖不能预测未来开奖。</p>
        </div>
        {mode === 'FREQUENCY' ? <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white"><h3 className="text-lg font-bold mb-4">分析样本量</h3><div className="grid grid-cols-5 gap-2">{[30,50,100,200,500].map(n => <button key={n} onClick={() => setHistorySize(n)} className={`min-h-11 rounded-xl text-xs font-black transition-all ${historySize === n ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 'bg-slate-50 text-slate-500 border-2 border-slate-100'}`}>{n}期</button>)}</div></div> : <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
          <div className="flex justify-between items-center mb-5"><h3 className="text-lg font-bold flex items-center gap-2"><Sliders className="w-5 h-5 text-rose-500" />算法参数微调</h3><button onClick={() => setConfig(DEFAULT_GAME_THEORY_CONFIG)} className="min-h-11 text-xs font-black text-rose-600">恢复默认</button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{([['monthPenalty','月份偏好','1–12'],['birthdayPenalty','日期偏好','1–31'],['luckyPenalty','吉利数字','6、8、18…'],['largeNumberBonus','大号码奖励','大于31'],['blueMonthPenalty','蓝球月份偏好','1–12'],['blueLargeBonus','蓝球大号奖励','大于12']] as const).map(([key, label, desc]) => <label key={key} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2"><span className="flex items-center justify-between gap-1 text-xs font-black text-slate-500">{label}<span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{config[key]}</span></span><input className="w-full accent-rose-500" type="range" min="0" max="1" step="0.1" value={config[key]} onChange={e => setConfig({...config, [key]: Number(e.target.value)})} /><span className="text-[10px] text-slate-400 font-medium">{desc}</span></label>)}</div>
        </div>}
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white"><h3 className="text-lg font-bold mb-5">生成注数</h3><div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">{[1,5,10,20,50,100].map(n => <button key={n} onClick={() => setCount(n)} className={`min-h-11 rounded-xl border-2 font-black text-sm transition-all ${count === n ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md shadow-rose-100/50' : 'border-slate-100 bg-slate-50/50 text-slate-600'}`}>{n}</button>)}</div><div className="relative"><input aria-label="自定义注数" type="number" min="1" max="1000" value={count} onChange={e => setCount(Number(e.target.value))} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all font-bold shadow-inner" /><span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">注</span></div><p className="mt-2 text-xs text-slate-400">可自定义 1–1000 注</p></div>
        <button disabled={busy} onClick={generate} className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-600 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-3xl shadow-xl shadow-rose-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-[0.98]">{busy ? <><Loader2 className="w-6 h-6 animate-spin" />正在分析...</> : <><BrainCircuit className="w-6 h-6" />生成 {count} 注方案</>}</button>
      </div>
      <div className="bg-white/70 backdrop-blur-xl p-4 md:p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white flex flex-col max-h-[1000px] min-w-0"><div className="flex flex-wrap justify-between items-center gap-3 mb-6"><h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">分析结果 <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">{results.length} 注</span></h2>{results.length > 0 && <button onClick={() => add(results)} className="flex items-center justify-center gap-2 bg-rose-500 text-white rounded-xl px-4 py-3 text-xs font-black shadow-lg shadow-rose-100"><Plus className="w-4 h-4" />全部加入选号单</button>}</div><p className="text-xs text-slate-500 leading-relaxed mb-3">如果中奖，同号人数可能影响分奖金额；选号方式不会改变号码的开奖概率，也不保证减少撞注或提高收益。</p>{sampleSize !== null && <p className="text-xs font-bold text-slate-400 mb-3">实际有效样本：{sampleSize} 期</p>}
        <div className="overflow-y-auto space-y-3 min-w-0">{results.length === 0 ? <div className="py-16 text-center text-slate-400"><div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-5"><History className="w-9 h-9 text-slate-200" /></div><p className="font-black text-sm mb-2">等待分析</p><p className="text-xs font-medium">设置参数后点击生成方案</p></div> : results.map((r, i) => { const key = `${format(r.reds)}|${format(r.blues)}`; return <div key={key} className="p-3 bg-slate-50/50 border border-white rounded-2xl"><div className="flex gap-2 items-center min-w-0"><span className="w-5 h-5 rounded-md bg-white text-slate-400 text-[10px] flex-shrink-0 flex items-center justify-center font-black">{i+1}</span><div className="flex gap-1.5 items-center overflow-x-auto no-scrollbar">{r.reds.map(n => <span key={`r${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-red-100">{String(n).padStart(2,'0')}</span>)}<span className="w-px h-4 bg-slate-200 flex-shrink-0" />{r.blues.map(n => <span key={`b${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-blue-100">{String(n).padStart(2,'0')}</span>)}</div></div><div className="h-px bg-slate-100 my-2" /><div className="flex justify-end"><button disabled={existing.has(key)} onClick={() => add([r])} className="min-h-10 flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 disabled:bg-rose-50 disabled:text-rose-500">{existing.has(key) ? <><CheckCircle2 className="w-4 h-4" />已加入</> : <><Plus className="w-4 h-4" />加入选号单</>}</button></div></div>; })}</div>
      </div>
    </div>
  </div>;
}
