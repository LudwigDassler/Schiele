import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { pinterestFetch } from '@/lib/pinterest';
import type { Photo } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await pinterestFetch('search/pins?query=' + encodeURIComponent(query) + '&limit=20');
    const pins: Photo[] = (data.items || []).map(function(item: any) {
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
    return errorResponse('Pinterest search failed', 500, { results: [] });
  }
}
