import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'funny';
  const category = searchParams.get('category') || 'memes';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  let results: any[] = [];

  try {
    switch (category) {
      case 'memes':
        results = await fetchMemes(query, page);
        break;
      case 'music':
        results = await fetchLastFM(query, page);
        break;
      default:
        results = await fetchLastFM(query, page);
    }

    return NextResponse.json({ 
      photos: results, 
      source: 'creative',
      hasMore: results.length === limit 
    });

  } catch (error) {
    console.error('Creative API Error:', error);
    return NextResponse.json({ 
      photos: [], 
      error: 'Failed to fetch creative content' 
    }, { status: 500 });
  }
}

// === 1. Imgflip API (мемы, бесплатно без ключа) ===
async function fetchMemes(query: string, page: number) {
  try {
    const res = await fetch('https://api.imgflip.com/get_memes');
    const data = await res.json();
    
    if (!data.success) return [];
    
    let memes = data.data.memes;
    if (query && query !== 'funny') {
      memes = memes.filter((m: any) => 
        m.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    const start = (page - 1) * 20;
    const paginated = memes.slice(start, start + 20);
    
    return paginated.map((m: any) => ({
      id: meme_,
      src: m.url,
      thumb: m.url,
      title: m.name,
      author: 'Imgflip',
      authorAvatar: '',
      source: 'Meme',
      link: https://imgflip.com/meme/,
    }));
  } catch (e) {
    console.error('Imgflip error:', e);
    return [];
  }
}

// === 2. Last.fm API ===
async function fetchLastFM(query: string, page: number) {
  const key = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
  
  if (!key) {
    console.error('❌ Last.fm API key not found!');
    return [];
  }

  try {
    const url = query && query !== 'music'
      ? https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=&api_key=&format=json&limit=20&page=
      : https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=&format=json&limit=20&page=;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const artists = data.results?.artistmatches?.artist || data.artists?.artist || [];
    
    return artists.map((p: any) => ({
      id: lastfm_,
      src: p.image?.[3]?.['#text'] || https://ui-avatars.com/api/?name=&background=c0521a&color=fff,
      thumb: p.image?.[1]?.['#text'] || '',
      title: p.name,
      author: 'Last.fm',
      authorAvatar: '',
      source: 'Music',
      link: p.url || '',
    }));
  } catch (e) {
    console.error('Last.fm error:', e);
    return [];
  }
}
