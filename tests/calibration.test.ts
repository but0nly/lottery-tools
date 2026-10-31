import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CALIBRATION_DATA } from '../src/lib/calibrated-weights.ts';
import {
  DEFAULT_GAME_THEORY_CONFIG,
  evaluateCombinationCrowding,
} from '../src/lib/combinations.ts';

test('校准数据包含完整元数据、官方来源与样本信息', () => {
  assert.ok(CALIBRATION_DATA.version);
  assert.ok(CALIBRATION_DATA.calibratedAt);
  assert.ok(CALIBRATION_DATA.sampleInfo.totalSamples >= 100);
  assert.ok(CALIBRATION_DATA.sampleInfo.sources.length >= 2);
  assert.ok(CALIBRATION_DATA.sampleInfo.dateRange);
  assert.ok(CALIBRATION_DATA.sampleInfo.rSquared > 0);
});

test('回归诊断包含系数、标准误、置信区间与显著性标识', () => {
  assert.ok(CALIBRATION_DATA.diagnostics.length >= 6);

  for (const diag of CALIBRATION_DATA.diagnostics) {
    assert.ok(diag.feature);
    assert.equal(typeof diag.beta, 'number');
    assert.equal(typeof diag.se, 'number');
    assert.equal(typeof diag.tStat, 'number');
    assert.equal(typeof diag.pValue, 'number');
    assert.equal(typeof diag.multiplier, 'number');
    assert.equal(diag.ci95.length, 2);
    assert.equal(typeof diag.significant, 'boolean');
  }

  // 月份偏好（1-12）在官方真实开奖数据中呈现显著正向拥挤（p < 0.05）
  const monthDiag = CALIBRATION_DATA.diagnostics.find(d => d.feature === 'monthCount');
  assert.ok(monthDiag);
  assert.ok(monthDiag.beta > 0);
  assert.ok(monthDiag.pValue < 0.05);
  assert.equal(monthDiag.significant, true);

  // 不显著的特征（置信区间跨过 0）必须如实标注为 false，绝不夸大效果
  const blueLargeDiag = CALIBRATION_DATA.diagnostics.find(d => d.feature === 'blueLarge');
  if (blueLargeDiag) {
    assert.ok(blueLargeDiag.ci95[0] <= 0 && blueLargeDiag.ci95[1] >= 0);
    assert.equal(blueLargeDiag.significant, false);
  }
});

test('DEFAULT_GAME_THEORY_CONFIG 采用官方中奖数据校准后的权重', () => {
  assert.equal(
    DEFAULT_GAME_THEORY_CONFIG.monthPenalty,
    CALIBRATION_DATA.calibratedConfig.monthPenalty
  );
  assert.equal(
    DEFAULT_GAME_THEORY_CONFIG.luckyPenalty,
    CALIBRATION_DATA.calibratedConfig.luckyPenalty
  );
  assert.ok(DEFAULT_GAME_THEORY_CONFIG.monthPenalty > 0);
});

test('evaluateCombinationCrowding 支持校准权重且允许用户手动覆盖', () => {
  const reds = [1, 2, 3, 4, 5, 6];
  const blues = [1];

  // 默认使用校准权重
  const defaultDiag = evaluateCombinationCrowding('SSQ', reds, blues);
  assert.ok(defaultDiag.coldnessScore >= 15 && defaultDiag.coldnessScore <= 99);

  // 用户手动覆盖权重
  const customConfig = {
    ...DEFAULT_GAME_THEORY_CONFIG,
    monthPenalty: 0.9,
  };
  const customDiag = evaluateCombinationCrowding('SSQ', reds, blues, customConfig);
  // 加大惩罚后拥挤惩罚值增加、冷门分数降低
  assert.ok(customDiag.crowdingPenalty > defaultDiag.crowdingPenalty);
  assert.ok(customDiag.coldnessScore <= defaultDiag.coldnessScore);
});
