import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30'), 1), 100);
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
  const offset = (page - 1) * limit;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ photos: [], error: 'Not configured' }, { status: 500 });
  }

  try {
    let url = SUPABASE_URL + '/rest/v1/images?select=*&limit=' + limit + '&offset=' + offset + '&order=created_at.desc';
    if (category !== 'all') {
      url = url + '&category=eq.' + encodeURIComponent(category);
    }

    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
      },
    });

    if (!res.ok) throw new Error('Supabase error');
    const data = await res.json();

    const photos = data.map((item: any) => ({
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
    return NextResponse.json({ photos: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
