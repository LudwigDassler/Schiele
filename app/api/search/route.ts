import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
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

    const commonsResults = await searchWikimediaCommons(query);
    
    const photos = [
      ...enriched.map((item: any) => ({
        id: item.id,
        src: item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=c0521a&color=fff&size=400`,
        thumb: item.image || '',
        title: item.title,
        author: 'Wikipedia',
        authorAvatar: '',
        source: 'Wiki',
        link: item.pageUrl,
        description: item.description,
      })),
      ...commonsResults.map((item: any) => ({
        id: `commons_${item.id}`,
        src: item.url,
        thumb: item.thumb,
        title: item.title,
        author: 'Wikimedia Commons',
        authorAvatar: '',
        source: 'Commons',
        link: item.link,
        description: '',
      })),
    ];

    return NextResponse.json({ 
      results: photos,
      source: 'smart_search',
      count: photos.length 
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}

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

async function searchWikimediaCommons(query: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srwhat=image&srlimit=10&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const results = data.query?.search || [];
  return results.map((item: any) => ({
    id: item.pageid,
    title: item.title,
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${item.title.replace(/ /g, '_')}`,
    thumb: `https://commons.wikimedia.org/wiki/Special:FilePath/${item.title.replace(/ /g, '_')}?width=200`,
    link: `https://commons.wikimedia.org/wiki/${item.title.replace(/ /g, '_')}`,
  }));
}