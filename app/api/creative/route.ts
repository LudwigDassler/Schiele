import { NextResponse } from 'next/server';
import { avatarUrl, errorResponse } from '@/lib/api';
import type { Photo } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'funny';
  const category = searchParams.get('category') || 'memes';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  let results: Photo[] = [];

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
    return errorResponse('Failed to fetch creative content', 500, { photos: [] });
  }
}

// === Imgflip API (мемы) ===
async function fetchMemes(query: string, page: number): Promise<Photo[]> {
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
      id: `meme_${m.id}`,
      src: m.url,
      thumb: m.url,
      title: m.name,
      author: 'Imgflip',
      authorAvatar: '',
      source: 'Meme',
      link: `https://imgflip.com/meme/${m.id}`,
    }));
  } catch (e) {
    console.error('Imgflip error:', e);
    return [];
  }
}

// === Last.fm API ===
async function fetchLastFM(query: string, page: number): Promise<Photo[]> {
  const key = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
  
  if (!key) {
    console.error('❌ Last.fm API key not found!');
    return [];
  }

  try {
    const url = query && query !== 'music'
      ? `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${key}&format=json&limit=20&page=${page}`
      : `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${key}&format=json&limit=20&page=${page}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const artists = data.results?.artistmatches?.artist || data.artists?.artist || [];
    
    return artists.map((p: any) => ({
      id: `lastfm_${p.mbid || p.name}`,
      src: p.image?.[3]?.['#text'] || avatarUrl(p.name),
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
