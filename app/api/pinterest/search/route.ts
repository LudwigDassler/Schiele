import { NextResponse } from 'next/server';

const token = process.env.PINTEREST_ACCESS_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      'https://api.pinterest.com/v5/search/pins?query=' + encodeURIComponent(query) + '&limit=20',
      {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      }
    );

    if (!res.ok) {
      throw new Error('Pinterest API error: ' + res.status);
    }

    const data = await res.json();
    const pins = (data.items || []).map(function(item: any) {
      return {
        id: 'pinterest_' + item.id,
        src: item.media?.images?.originals?.url || '',
        thumb: item.media?.images?.originals?.url || '',
        title: item.title || query,
        author: item.owner?.username || 'Pinterest',
        authorAvatar: item.owner?.profile_image || '',
        source: 'Pinterest',
        link: item.link || '',
      };
    });

    return NextResponse.json({ results: pins, source: 'pinterest' });
  } catch (error) {
    console.error('Pinterest search error:', error);
    return NextResponse.json({ results: [], error: 'Pinterest search failed' }, { status: 500 });
  }
}
