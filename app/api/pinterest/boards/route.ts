import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { pinterestFetch } from '@/lib/pinterest';

export async function GET() {
  try {
    const data = await pinterestFetch('boards');
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
    return errorResponse('Failed to fetch boards', 500, { boards: [] });
  }
}
