import { getPortfolioPayoutDistribution, type PayoutDistributionOptions } from './payout';

self.onmessage = (event: MessageEvent<PayoutDistributionOptions>) => {
  try {
    const result = getPortfolioPayoutDistribution(event.data);
    self.postMessage({ kind: 'complete', result });
  } catch (error) {
    self.postMessage({ kind: 'error', message: error instanceof Error ? error.message : '计算回报分布失败' });
  }
};
