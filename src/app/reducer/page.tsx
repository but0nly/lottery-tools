"use client";

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { BallPicker } from '@/components/BallPicker';
import { FilterConditions, WheelingMode, filterCombination, getCoverage, getWheelingModes, getCombinationEstimate } from '@/lib/combinations';
import { storage, ReducerSettings, SavedCombination } from '@/lib/storage';
import { toast } from '@/lib/notification';
import { CheckCircle2, Loader2, Plus, Shuffle, HelpCircle, Info, Calculator, Trash2 } from 'lucide-react';
import { useLotteryContext } from '@/app/LotteryContext';

import { triggerFlyToCart } from '@/components/FlyToCartAnimation';

export default function ReducerPage() {
  const { activeType: type } = useLotteryContext();
  const [importMode, setImportMode] = useState(false);
  const [available, setAvailable] = useState<SavedCombination[]>([]);
  const [importIds, setImportIds] = useState<Set<number>>(new Set());
  const [discarded, setDiscarded] = useState<SavedCombination[]>([]);
  const [importResultCount, setImportResultCount] = useState<number | null>(null);
  const [wheelingMode, setWheelingMode] = useState<WheelingMode>('FULL');
  const [reds, setReds] = useState<number[]>([]);
  const [blues, setBlues] = useState<number[]>([]);
  const [results, setResults] = useState<{reds: number[], blues: number[]}[]>([]);
  const [coverage, setCoverage] = useState<ReturnType<typeof getCoverage> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWheelingTip, setShowWheelingTip] = useState(false);
  const [showFilterTip, setShowFilterTip] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track existing data for active states
  const [inSelectionKeys, setInSelectionKeys] = useState<Set<string>>(new Set());

  const loadExistingStates = useCallback(async () => {
    const [selection, settings] = await Promise.all([
      storage.getSelection(),
      storage.getSettings<ReducerSettings>('reducer_params')
    ]);

    setAvailable(selection.filter(item => item.type === type));
    setInSelectionKeys(new Set(selection.map(i => `${i.type}|${i.reds}|${i.blues}`)));

    if (settings && settings.type === type) {
      setWheelingMode(getWheelingModes(type).some(mode => mode.id === settings.wheelingMode) ? settings.wheelingMode : 'FULL');
      if (settings.reds) setReds(settings.reds);
      if (settings.blues) setBlues(settings.blues);
      if (settings.conditions) setConditions(settings.conditions);
    } else {
      handleClear();
    }
    setIsInitialized(true);
  }, [type]);

  // Reset a previous import when the active lottery changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setImportIds(new Set()); setDiscarded([]); setImportResultCount(null); setResults([]); setCoverage(null); setWheelingMode('FULL'); }, [type]);

  useEffect(() => {
    loadExistingStates();
    window.addEventListener('selection-updated', loadExistingStates);
    return () => window.removeEventListener('selection-updated', loadExistingStates);
  }, [loadExistingStates]);

  const [conditions, setConditions] = useState<FilterConditions>({
    minSum: undefined,
    maxSum: undefined,
    maxConsecutive: undefined,
  });

  // Save settings when they change
  useEffect(() => {
    if (!isInitialized) return;
    storage.setSettings('reducer_params', {
      type,
      wheelingMode,
      reds,
      blues,
      conditions
    });
  }, [type, wheelingMode, reds, blues, conditions, isInitialized]);

  // Terminate before the browser can deliver a result for changed inputs.
  useLayoutEffect(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsGenerating(false);
      setProgress(null);
    }
  }, [type, importMode, wheelingMode, reds, blues, conditions]);
  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null; }, []);

  const cancelGeneration = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsGenerating(false);
    setProgress(null);
  };

  const activeMode = getWheelingModes(type).some(mode => mode.id === wheelingMode) ? wheelingMode : 'FULL';
  const estimate = getCombinationEstimate(type, reds.filter(n => n <= (type === 'SSQ' ? 33 : 35)).length, blues.filter(n => n <= (type === 'SSQ' ? 16 : 12)).length, activeMode);

  const handleGenerate = () => {
    if (importMode) {
      const selected = available.filter(r => importIds.has(r.id!));
      if (!selected.length) { toast.show('请先选择要导入的号码', 'warning'); return; }
      if (selected.length > 500) { toast.show('输出上限为 500 注，请减少导入号码。', 'warning'); return; }
      const cleaned: FilterConditions = {};
      if (conditions.minSum && conditions.minSum > 0) cleaned.minSum = conditions.minSum;
      if (conditions.maxSum && conditions.maxSum > 0) cleaned.maxSum = conditions.maxSum;
      if (conditions.maxConsecutive && conditions.maxConsecutive > 0) cleaned.maxConsecutive = conditions.maxConsecutive;
      const keep = selected.filter(r => filterCombination(r.reds.split(',').map(Number).sort((a,b) => a-b), cleaned));
      setDiscarded(selected.filter(r => !keep.includes(r)));
      setImportResultCount(selected.length);
      setResults(keep.map(r => ({ reds: r.reds.split(',').map(Number), blues: r.blues.split(',').map(Number) })));
      if (!Object.keys(cleaned).length) toast.show('未设置筛选条件，已保留全部号码', 'info');
      return;
    }
    const minRed = type === 'SSQ' ? 6 : 5;
    const minBlue = type === 'SSQ' ? 1 : 2;
    if (reds.length < minRed || blues.length < minBlue) {
      toast.show(`请至少选择 ${minRed} 个红球和 ${minBlue} 个蓝球`, 'warning');
      return;
    }

    if (!estimate.allowed) { toast.show(estimate.reason!, 'warning'); return; }

    const cleanedConditions: FilterConditions = {};
    if (conditions.minSum && conditions.minSum > 0) cleanedConditions.minSum = conditions.minSum;
    if (conditions.maxSum && conditions.maxSum > 0) cleanedConditions.maxSum = conditions.maxSum;
    if (conditions.maxConsecutive && conditions.maxConsecutive > 0) cleanedConditions.maxConsecutive = conditions.maxConsecutive;

    setResults([]);
    setCoverage(null);
    setIsGenerating(true);
    setProgress(0);
    try {
      const worker = new Worker(new URL('../../lib/reducer.worker.ts', import.meta.url));
      workerRef.current = worker;
      const fail = () => {
        if (workerRef.current !== worker) return;
        cancelGeneration();
        toast.show('计算过程中出错，请尝试减少号码数量。', 'error');
      };
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.onmessage = (event) => {
        if (workerRef.current !== worker) return;
        const message = event.data;
        if (message.kind === 'progress') setProgress(message.fraction);
        else if (message.kind === 'coverage') setProgress(1);
        else if (message.kind === 'error') fail();
        else if (message.kind === 'complete') {
          setResults(message.results);
          setCoverage(message.coverage);
          cancelGeneration();
          toast.show(message.results.length ? `已生成 ${message.results.length} 注缩水方案` : '没有符合条件的号码', message.results.length ? 'success' : 'warning');
        }
      };
      worker.postMessage({ type, reds, blues, conditions: cleanedConditions, mode: activeMode });
    } catch {
      cancelGeneration();
      toast.show('计算过程中出错，请尝试减少号码数量。', 'error');
    }
  };

  const handleAddToSelectionAll = async (e: React.MouseEvent) => {
    triggerFlyToCart(e, 'bg-emerald-500');
    
    const batch = results.map(r => ({
      type,
      reds: r.reds.map(n => n.toString().padStart(2, '0')).join(','),
      blues: r.blues.map(n => n.toString().padStart(2, '0')).join(','),
      toolUsed: 'REDUCER' as const
    }));

    const { saved, skipped } = await storage.addBatchToSelection(batch);
    
    window.dispatchEvent(new Event('selection-updated'));
    if (saved > 0) {
      toast.show(`成功加入 ${saved} 注选号${skipped > 0 ? ` (跳过 ${skipped} 注重复)` : ''}`, 'success');
    } else if (skipped > 0) {
      toast.show(`选中的方案均已在选号单中`, 'info');
    }
  };

  const handleRandomPick = () => {
    const maxRed = type === 'SSQ' ? 33 : 35;
    const maxBlue = type === 'SSQ' ? 16 : 12;

    // Pick the minimum required pool size as requested
    const redCount = type === 'SSQ' ? 7 : 6; 
    const blueCount = 2; 

    const randomReds: number[] = [];
    while (randomReds.length < redCount) {
      const num = Math.floor(Math.random() * maxRed) + 1;
      if (!randomReds.includes(num)) randomReds.push(num);
    }

    const randomBlues: number[] = [];
    while (randomBlues.length < blueCount) {
      const num = Math.floor(Math.random() * maxBlue) + 1;
      if (!randomBlues.includes(num)) randomBlues.push(num);
    }

    setReds(randomReds.sort((a, b) => a - b));
    setBlues(randomBlues.sort((a, b) => a - b));
    setResults([]);
    setCoverage(null);
  };

  const handleClear = () => {
    setImportIds(new Set()); setDiscarded([]); setImportResultCount(null);
    setReds([]);
    setBlues([]);
    setCoverage(null);
    setResults([]);
    setConditions({
      minSum: undefined,
      maxSum: undefined,
      maxConsecutive: undefined,
    });
  };

  return (
    <div className="relative min-h-full p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />

      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:pr-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Calculator className="w-7 h-7" />
            </div>
            组合缩水选号
          </h1>
          <p className="text-slate-500 text-sm md:text-base ml-1">通过旋转矩阵算法降低购彩成本</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 min-w-0">
        <div className="space-y-6 min-w-0">
          <div className="flex w-full p-1.5 rounded-2xl bg-slate-100/50 border border-slate-200/50">
            {([false, true] as const).map(value => <button key={String(value)} onClick={() => { setImportMode(value); setResults([]); setCoverage(null); setDiscarded([]); setImportResultCount(null); }} className={`flex-1 min-h-11 rounded-xl text-sm font-black transition-all ${importMode === value ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500'}`}>{value ? '从选号单导入' : '手动号码池'}</button>)}
          </div>
          {importMode ? <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-lg font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />选择已有号码</h3>
              <button disabled={!available.length} onClick={() => { setImportIds(importIds.size === available.length ? new Set() : new Set(available.map(r => r.id!))); setImportResultCount(null); setDiscarded([]); setResults([]); }} className="min-h-11 px-3 rounded-xl text-xs font-black text-emerald-600 bg-emerald-50 disabled:opacity-40">{available.length > 0 && importIds.size === available.length ? '取消全选' : '全选'}</button>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">轻点号码选择 · 已选 {importIds.size} / {available.length} 注</p>
            {available.length === 0 ? <div className="rounded-2xl bg-slate-50/70 py-10 text-center text-sm text-slate-400 font-bold">当前彩种的选号单还是空的</div> :
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">{available.map((r, index) => {
                const selected = importIds.has(r.id!);
                return <button key={r.id} type="button" aria-pressed={selected} aria-label={`第${index + 1}注 ${r.reds} 加 ${r.blues}`} onClick={() => { setImportIds(prev => { const next = new Set(prev); if (next.has(r.id!)) next.delete(r.id!); else next.add(r.id!); return next; }); setImportResultCount(null); setDiscarded([]); setResults([]); }} className={`w-full flex items-center gap-2 p-3 min-h-14 rounded-2xl border-2 transition-all active:scale-[0.99] ${selected ? 'border-emerald-400 bg-emerald-50/70 shadow-sm' : 'border-transparent bg-slate-50/70'}`}>
                  <span className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${selected ? 'text-emerald-500' : 'text-slate-300'}`}><CheckCircle2 className="w-5 h-5" /></span>
                  <span className="flex gap-1 sm:gap-1.5 items-center min-w-0 overflow-x-auto no-scrollbar">
                    {r.reds.split(',').map(n => <span key={`r${n}`} className="w-7 h-7 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-sm">{n}</span>)}
                    <span className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />
                    {r.blues.split(',').map(n => <span key={`b${n}`} className="w-7 h-7 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-sm">{n}</span>)}
                  </span>
                </button>;
              })}</div>}
          </div> : <>
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                选择红球池 <span className="text-slate-400 font-medium ml-1">({reds.length}个)</span>
              </div>

            </h3>
            <BallPicker 
              max={type === 'SSQ' ? 33 : 35} 
              selected={reds} 
              onChange={value => { setReds(value); setResults([]); setCoverage(null); }} 
              color="red" 
            />
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              选择蓝球池 <span className="text-slate-400 font-medium ml-1">({blues.length}个)</span>
            </h3>
            <BallPicker 
              max={type === 'SSQ' ? 16 : 12} 
              selected={blues} 
              onChange={value => { setBlues(value); setResults([]); setCoverage(null); }} 
              color="blue" 
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleRandomPick}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-white/70 backdrop-blur-xl hover:bg-emerald-50 border border-white hover:border-emerald-200 text-slate-600 hover:text-emerald-600 rounded-[24px] text-sm font-black transition-all shadow-xl shadow-slate-200/50 active:scale-[0.98]"
            >
              <Shuffle className="w-4 h-4" />
              随机选号池
            </button>
            <button 
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-white/70 backdrop-blur-xl hover:bg-rose-50 border border-white hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-[24px] text-sm font-black transition-all shadow-xl shadow-slate-200/50 active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              清空重选
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                缩水模式 
                <button 
                  onClick={() => setShowWheelingTip(!showWheelingTip)}
                  className={`p-1.5 rounded-full transition-colors ${showWheelingTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showWheelingTip && (
              <div className="text-[11px] md:text-xs text-emerald-800 mb-6 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 leading-relaxed shadow-inner">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                覆盖的前提是所选号码池包含指定数量的开奖号码；仅计算双色球红球或大乐透前区，不涉及蓝球或后区。不保证奖级、奖金或最少注数。过滤可能破坏覆盖，请以生成后的覆盖结果为准。
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {getWheelingModes(type).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => { setWheelingMode(mode.id); setResults([]); setCoverage(null); }}
                  aria-pressed={wheelingMode === mode.id}
                  className={`group relative p-4 rounded-2xl border-2 text-left transition-all ${
                    wheelingMode === mode.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100/50'
                      : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className={`font-black text-sm ${wheelingMode === mode.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {mode.name}
                  </div>
                  <div className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">{mode.desc}</div>
                  {wheelingMode === mode.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          </>}
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                高级过滤 <span className="text-slate-400 text-xs font-normal">(可选)</span>
                <button 
                  onClick={() => setShowFilterTip(!showFilterTip)}
                  className={`p-1.5 rounded-full transition-colors ${showFilterTip ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'}`}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h3>
            </div>
            {showFilterTip && (
              <div className="text-[11px] md:text-xs text-emerald-800 mb-6 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 leading-relaxed shadow-inner">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                和值指选出的红球之和；连号指连续数字。设置条件可按号码特征筛选组合，不代表其中奖概率更高。
              </div>
            )}
            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最小和值</label>
                <input 
                  type="number" 
                  value={conditions.minSum || ''} 
                  onChange={e => { setConditions({...conditions, minSum: parseInt(e.target.value)}); setImportResultCount(null); setDiscarded([]); setResults([]); setCoverage(null); }}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="例: 80"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最大和值</label>
                <input 
                  type="number" 
                  value={conditions.maxSum || ''} 
                  onChange={e => { setConditions({...conditions, maxSum: parseInt(e.target.value)}); setImportResultCount(null); setDiscarded([]); setResults([]); setCoverage(null); }}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="例: 130"
                />
              </div>
              <div className="col-span-2 relative">
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.1em]">最大连号数</label>
                <input 
                  type="number" 
                  value={conditions.maxConsecutive || ''} 
                  onChange={e => { setConditions({...conditions, maxConsecutive: parseInt(e.target.value)}); setImportResultCount(null); setDiscarded([]); setResults([]); setCoverage(null); }}
                  placeholder="例如 3 表示最多允许3连号"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {!importMode && <div role="status" className={`rounded-2xl border p-4 text-sm leading-relaxed ${estimate.allowed ? 'border-emerald-100 bg-emerald-50/80 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <p className="font-black">全复式：{estimate.fullCount.toLocaleString()} 注，{estimate.fullCost.toLocaleString()} 元</p>
            <p className="mt-1">缩水或过滤后的注数及费用尚未计算，上述全复式数值是其上限。按每注 2 元普通投注计算，不含大乐透追加、倍数等附加投注。</p>
            {!estimate.allowed && <p className="mt-2 font-black">{estimate.reason} 为保护计算和页面性能，以全复式上限判断。</p>}
          </div>}

          {isGenerating && <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-800">
            <p className="font-bold">{progress === 1 ? '正在核对最终覆盖情况…' : `正在覆盖开奖情况：${Math.round((progress ?? 0) * 100)}%`}</p>
            <progress className="mt-2 w-full accent-emerald-600" max={1} value={progress ?? 0} aria-label="缩水计算进度" />
            <button type="button" onClick={cancelGeneration} className="mt-3 min-h-11 rounded-xl bg-white px-4 py-2 font-black text-emerald-700 border border-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">取消计算</button>
          </div>}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black rounded-3xl shadow-xl shadow-emerald-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                正在智能缩水计算...
              </>
            ) : (
              <>
                <Calculator className="w-6 h-6" />
                {importMode ? '筛选已导入号码' : '立即缩水生成方案'}
              </>
            )}
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 md:p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-white flex flex-col h-full max-h-[1000px] min-w-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
              生成结果 
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{results.length} 注 · {results.length * 2} 元</span>
            </h3>
            {!importMode && results.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleAddToSelectionAll(e)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  全部加入选号单
                </button>
              </div>
            )}
          </div>

          {(coverage || importResultCount !== null) && <p className="mb-4 text-xs text-slate-500">实际结果按每注 2 元普通投注计算，不含大乐透追加、倍数等附加投注。</p>}
          {!importMode && coverage && (
            <div role="status" className={`mb-4 rounded-2xl border p-4 text-sm leading-relaxed ${coverage.total > 0 && coverage.covered === coverage.total && results.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <p className="font-black">{coverage.total > 0 && coverage.covered === coverage.total && results.length > 0 ? '覆盖完整' : results.length === 0 ? '无结果，无法保证覆盖' : '覆盖不完整，原目标未得到保证'}</p>
              <p className="mt-1">所选号码池包含 {coverage.matches} 个开奖号码时，最终结果至少一注命中 {coverage.guarantee} 个{type === 'SSQ' ? '红球' : '前区号码'}：已覆盖 {coverage.covered} / {coverage.total} 种情况。</p>
              <p className="mt-1">仅计算{type === 'SSQ' ? '红球' : '前区'}，不保证奖级、奖金或最少注数。</p>
            </div>
          )}
          {importMode && importResultCount !== null && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-slate-500">
                导入 {importResultCount} 注，保留 {results.length} 注，剔除 {discarded.length} 注
              </p>
              {discarded.length > 0 && (
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 transition-all hover:bg-rose-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  onClick={() => toast.confirm({ title: '删除筛掉的注数', message: `确定从选号单删除筛掉的 ${discarded.length} 注吗？其中 ${discarded.filter(r => r.isPinned).length} 注已收藏。`, onConfirm: async () => { for (const record of discarded) await storage.removeFromSelection(record.id!); setImportIds(prev => { const next = new Set(prev); discarded.forEach(r => next.delete(r.id!)); return next; }); setDiscarded([]); window.dispatchEvent(new Event('selection-updated')); toast.show('已删除筛掉的号码', 'success'); } })}
                >
                  <Trash2 className="h-4 w-4" />
                  删除筛掉的注数
                </button>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar overscroll-behavior-none">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                <div className="w-24 h-24 bg-slate-50/50 rounded-full flex items-center justify-center shadow-inner">
                  <Calculator className="w-10 h-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-2">Awaiting Analysis</p>
                  <p className="text-sm text-slate-500 font-medium">{(importMode && importResultCount !== null) || coverage ? '没有符合条件的号码' : '在左侧选择号码并设置条件后点击生成'}</p>
                </div>
              </div>
            ) : (
              results.map((r, i) => {
                const redsStr = r.reds.map(n => n.toString().padStart(2, '0')).join(',');
                const bluesStr = r.blues.map(n => n.toString().padStart(2, '0')).join(',');
                const key = `${type}|${redsStr}|${bluesStr}`;
                const isInSelection = inSelectionKeys.has(key);

                return (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50/50 border border-white rounded-2xl transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100 group relative overflow-hidden">
                    {/* 第一行：序号与号码 (单行排列，支持横滑) */}
                    <div className="flex gap-3 items-center min-w-0">
                      <span className="w-5 h-5 rounded-md bg-white shadow-sm text-slate-400 text-[10px] flex-shrink-0 flex items-center justify-center font-black border border-slate-100">
                        {i + 1}
                      </span>

                      <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar pb-0.5">
                        <div className="flex flex-nowrap gap-1.5 items-center">
                          {r.reds.map(n => (
                            <span key={`r${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-red-100 group-hover:scale-105 transition-transform">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                          <div className="w-px h-4 bg-slate-200 mx-0.5 flex-shrink-0"></div>
                          {r.blues.map(n => (
                            <span key={`b${n}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500 text-white flex-shrink-0 flex items-center justify-center text-[10px] md:text-xs font-black shadow-md shadow-blue-100 group-hover:scale-105 transition-transform">
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 分割线 */}
                    <div className="h-px bg-slate-100/50 mx-1"></div>

                    {/* 第二行：操作按钮 */}
                    <div className="flex items-center justify-end gap-2">
                      {!importMode && <button
                        onClick={async (e) => {
                          if (isInSelection) {
                            await storage.removeFromSelectionByContent(type, redsStr, bluesStr);
                            window.dispatchEvent(new Event('selection-updated'));
                            loadExistingStates();
                          } else {
                            triggerFlyToCart(e, 'bg-emerald-500');
                            setTimeout(async () => {
                              await storage.addToSelection({
                                type,
                                reds: redsStr,
                                blues: bluesStr,
                                toolUsed: 'REDUCER'
                              });
                              window.dispatchEvent(new Event('selection-updated'));
                              loadExistingStates();
                            }, 600);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isInSelection ? 'text-emerald-600 bg-emerald-50 shadow-inner' : 'text-white bg-slate-900 hover:bg-slate-800 shadow-lg active:scale-95'}`}
                      >
                        {isInSelection ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isInSelection ? '已加入' : '加入选号单'}
                      </button>}
                    </div>
                  </div>
                );
              })
            )}
            {results.length > 500 && (
              <div className="text-center text-orange-500 py-6 text-xs font-black uppercase tracking-widest">
                Large Result Set · Limited Preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
