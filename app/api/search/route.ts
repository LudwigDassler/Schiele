import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// === ПОИСК В SUPABASE ===
async function searchSupabase(query: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/images?title=ilike.%${encodeURIComponent(query)}%&select=*`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.map((item: any) => ({
      id: item.id,
      src: item.src,
      thumb: item.src,
      title: item.title,
      author: item.author || 'Schiele DB',
      authorAvatar: '',
      source: 'Schiele',
      link: '',
      description: `Category: ${item.category}`,
    }));
  } catch {
    return [];
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ WIKIPEDIA ===
async function searchWikipedia(query: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=15`;
  const res = await fetch(url);
  const data = await res.json();
  return data.query?.search || [];
}

async function getWikipediaDetails(pageId: number) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&pithumbsize=400&pageids=${pageId}&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query?.pages || {};
  return pages[pageId] || null;
}

// === ГЛАВНАЯ ФУНКЦИЯ ===
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Ищем в Supabase
    const supabaseResults = await searchSupabase(query);
    
    // 2. Ищем в Wikipedia
    const wikiResults = await searchWikipedia(query);
    const enriched = await Promise.all(
      wikiResults.slice(0, 10).map(async (item: any) => {
        const details = await getWikipediaDetails(item.pageid);
        return {
          id: `wiki_${item.pageid}`,
          title: item.title,
          description: details?.extract || '',
          image: details?.thumbnail?.source || '',
          pageUrl: `https://en.wikipedia.org/?curid=${item.pageid}`,
          source: 'Wikipedia',
        };
      })
    );

    const wikiPhotos = enriched.map((item: any) => ({
      id: item.id,
      src: item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=c0521a&color=fff&size=400`,
      thumb: item.image || '',
      title: item.title,
      author: 'Wikipedia',
      authorAvatar: '',
      source: 'Wiki',
      link: item.pageUrl,
      description: item.description,
    }));

    // 3. Объединяем результаты
    const results = [...supabaseResults, ...wikiPhotos];

    return NextResponse.json({
      results,
      source: 'smart_search',
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}