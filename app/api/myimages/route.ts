import { NextResponse } from 'next/server';

const SUPABASE_URL = "https://kefdjxsmyarwfqqkfgcx.supabase.co";
const SUPABASE_KEY = "sb_publishable_DHa5G0bhPLWJWNrACLVEUw_2GZS4BMc";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '30');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  try {
    let url = SUPABASE_URL + '/rest/v1/images?select=*&limit=' + limit + '&offset=' + offset + '&order=created_at.desc';
    if (category !== 'all') {
      url = url + '&category=eq.' + category;
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
