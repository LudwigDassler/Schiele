import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { supabaseRestFetch } from '@/lib/supabaseRest';
import type { Photo } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '30');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    let path = 'images?select=*&limit=' + limit + '&offset=' + offset + '&order=created_at.desc';
    if (category !== 'all') {
      path = path + '&category=eq.' + category;
    }

    const res = await supabaseRestFetch(path);

    if (!res.ok) throw new Error('Supabase error');
    const data = await res.json();

    const photos: Photo[] = data.map((item: any) => ({
      id: item.id,
      src: item.src,
      thumb: item.src,
      title: item.title || item.category,
      author: item.author || 'Schiele',
      authorAvatar: '',
      link: '',
      category: item.category,
    }));

    return NextResponse.json({ 
      photos, 
      source: 'schiele_db',
      hasMore: data.length === limit,
      total: data.length
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return errorResponse('Failed to fetch', 500, { photos: [] });
  }
}
