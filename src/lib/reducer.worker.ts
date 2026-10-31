import { generateCombinations, getCoverage, type FilterConditions, type LotteryType, type WheelingMode } from './combinations';

export interface ReducerRequest {
  type: LotteryType;
  reds: number[];
  blues: number[];
  conditions?: FilterConditions;
  mode: WheelingMode;
}

self.onmessage = (event: MessageEvent<ReducerRequest>) => {
  try {
    const { type, reds, blues, conditions, mode } = event.data;
    const results = generateCombinations(type, reds, blues, conditions, mode, fraction => {
      self.postMessage({ kind: 'progress', fraction });
    });
    self.postMessage({ kind: 'coverage' });
    const coverage = getCoverage(type, reds, mode, results);
    self.postMessage({ kind: 'complete', results, coverage });
  } catch (error) {
    self.postMessage({ kind: 'error', message: error instanceof Error ? error.message : '计算失败' });
  }
};
