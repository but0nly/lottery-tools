import { NextResponse } from 'next/server';

interface ApiHistoryItem {
  one?: unknown; two?: unknown; three?: unknown; four?: unknown;
  five?: unknown; six?: unknown; seven?: unknown; day?: unknown; code?: unknown;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') ?? 'ssq').toUpperCase();
  const limit = searchParams.get('limit') ?? '100';
  if (!['SSQ', 'DLT'].includes(type) || !/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 500) {
    return NextResponse.json({ error: '彩种或样本量无效，样本量须为 1–500 期' }, { status: 400 });
  }

  const apiUrl = `http://api.huiniao.top/interface/home/lotteryHistory?type=${type.toLowerCase()}&pageSize=${limit}`;
  try {
    const res = await fetch(apiUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) throw new Error('upstream failure');
    const data = await res.json();
    const list: unknown = data.data.data.list;
    if (data.code !== 1 || !Array.isArray(list)) throw new Error('invalid response');
    const seen = new Set<string>();
    const history = list.flatMap((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as ApiHistoryItem;
      if (typeof item.code !== 'string' || !/^\d{5,}$/.test(item.code) || seen.has(item.code)) return [];
      const values = [item.one, item.two, item.three, item.four, item.five, item.six, item.seven];
      const redCount = type === 'SSQ' ? 6 : 5;
      const parse = (input: unknown[], max: number) => {
        if (!input.every(v => (typeof v === 'string' && /^\d{1,2}$/.test(v)) || (typeof v === 'number' && Number.isInteger(v)))) return null;
        const numbers = input.map(Number);
        return numbers.every(n => n >= 1 && n <= max) && new Set(numbers).size === numbers.length ? numbers : null;
      };
      const reds = parse(values.slice(0, redCount), type === 'SSQ' ? 33 : 35);
      const blues = parse(values.slice(redCount), type === 'SSQ' ? 16 : 12);
      if (!reds || !blues) return [];
      seen.add(item.code);
      return [{ issue: item.code, reds: reds.join(','), blues: blues.join(','), drawDate: typeof item.day === 'string' ? item.day : null }];
    }).slice(0, Number(limit));
    if (!history.length) return NextResponse.json({ error: '历史数据中没有有效的开奖记录' }, { status: 502 });
    return NextResponse.json({ history, sampleSize: history.length, requestedSize: Number(limit), source: '灰鸟彩票历史接口（HTTP）', updatedAt: new Date().toISOString() });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({ error: timeout ? '历史数据源请求超时，请稍后重试' : '历史数据源暂时不可用，请稍后重试' }, { status: timeout ? 504 : 502 });
  }
}
