import { NextResponse } from 'next/server';

const token = process.env.PINTEREST_ACCESS_TOKEN;

export async function GET() {
  try {
    const res = await fetch('https://api.pinterest.com/v5/boards', {
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    });

    if (!res.ok) {
      throw new Error('Pinterest API error: ' + res.status);
    }

    const data = await res.json();
    const boards = (data.items || []).map(function(item: any) {
      return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        pin_count: item.pin_count || 0,
        cover: item.media?.images?.originals?.url || '',
      };
    });

    return NextResponse.json({ boards: boards, source: 'pinterest' });
  } catch (error) {
    console.error('Pinterest boards error:', error);
    return NextResponse.json({ boards: [], error: 'Failed to fetch boards' }, { status: 500 });
  }
}
