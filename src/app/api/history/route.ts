import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'ssq';
  const limit = searchParams.get('limit') || '100';

  const apiUrl = `http://api.huiniao.top/interface/home/lotteryHistory?type=${type.toLowerCase()}&pageSize=${limit}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    const data = await res.json();

    if (data.code !== 1) {
      return NextResponse.json({ error: 'Failed to fetch from external API' }, { status: 500 });
    }

    // Transform to the format expected by our frontend
    const history = data.data.data.list.map((item: any) => {
      if (type.toUpperCase() === 'SSQ') {
        return {
          reds: [item.one, item.two, item.three, item.four, item.five, item.six].join(','),
          blues: [item.seven].join(','),
          drawDate: item.day,
          issue: item.code
        };
      } else {
        // DLT
        return {
          reds: [item.one, item.two, item.three, item.four, item.five].join(','),
          blues: [item.six, item.seven].join(','),
          drawDate: item.day,
          issue: item.code
        };
      }
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
