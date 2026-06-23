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
      case 'art':
        results = await fetchArt(query, page);
        break;
      case 'music':
        results = await fetchMusic(query, page);
        break;
      case 'celebrities':
        results = await fetchCelebrities(query, page);
        break;
      case 'history':
        results = await fetchHistory(query, page);
        break;
      case 'movies':
        results = await fetchMovies(query, page);
        break;
      default:
        results = await fetchAll(query, page);
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
    
    // Сортировка и фильтрация
    let memes = data.data.memes;
    if (query && query !== 'funny') {
      memes = memes.filter((m: any) => 
        m.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Пагинация
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

// === 2. Reddit API (мемы, искусство, музыка) ===
async function fetchReddit(subreddit: string, query: string, page: number) {
  const subreddits = {
    memes: 'memes',
    art: 'art',
    music: 'WeAreTheMusicMakers',
    history: 'HistoryPorn',
    movies: 'MoviePosterPorn'
  };
  
  const target = subreddits[query as keyof typeof subreddits] || subreddit;
  const url = https://www.reddit.com/r//hot.json?limit=100;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Schiele/1.0' }
    });
    const data = await res.json();
    
    if (!data.data?.children) return [];
    
    const posts = data.data.children
      .filter((p: any) => p.data.post_hint === 'image')
      .slice((page - 1) * 20, page * 20);
    
    return posts.map((p: any) => ({
      id: eddit_,
      src: p.data.url,
      thumb: p.data.url,
      title: p.data.title,
      author: p.data.author,
      authorAvatar: '',
      source: /,
      link: https://reddit.com,
    }));
  } catch (e) {
    console.error('Reddit error:', e);
    return [];
  }
}

// === 3. TMDB (актёры, фильмы) ===
async function fetchMovies(query: string, page: number) {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) return [];
  
  try {
    const url = query && query !== 'movies'
      ? https://api.themoviedb.org/3/search/person?query=&page=&api_key=
      : https://api.themoviedb.org/3/person/popular?page=&api_key=;
    
    const res = await fetch(url);
    const data = await res.json();
    
    return (data.results || []).map((p: any) => ({
      id: 	mdb_,
      src: p.profile_path 
        ? https://image.tmdb.org/t/p/w500
        : https://ui-avatars.com/api/?name=&background=c0521a&color=fff,
      thumb: p.profile_path 
        ? https://image.tmdb.org/t/p/w200
        : '',
      title: p.name,
      author: p.known_for?.map((k: any) => k.title || k.name).join(', ') || 'Actor',
      authorAvatar: '',
      source: 'TMDB',
      link: https://www.themoviedb.org/person/,
    }));
  } catch (e) {
    console.error('TMDB error:', e);
    return [];
  }
}

// === 4. Last.fm (музыканты) ===
async function fetchMusic(query: string, page: number) {
  const key = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
  if (!key) return [];
  
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

// === 5. Met Museum (искусство) ===
async function fetchArt(query: string, page: number) {
  try {
    const searchUrl = query && query !== 'art'
      ? https://collectionapi.metmuseum.org/public/collection/v1/search?q=&hasImages=true
      : https://collectionapi.metmuseum.org/public/collection/v1/search?q=*&hasImages=true;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) return [];
    
    const start = (page - 1) * 20;
    const ids = searchData.objectIDs.slice(start, start + 20);
    
    const objects = await Promise.all(
      ids.map(async (id: number) => {
        const res = await fetch(https://collectionapi.metmuseum.org/public/collection/v1/objects/);
        return res.json();
      })
    );
    
    return objects
      .filter((o: any) => o.primaryImageSmall)
      .map((o: any) => ({
        id: met_,
        src: o.primaryImageSmall,
        thumb: o.primaryImageSmall,
        title: o.title || o.objectName || 'Artwork',
        author: o.artistDisplayName || 'Unknown Artist',
        authorAvatar: '',
        source: 'Met Museum',
        link: o.objectURL || '',
      }));
  } catch (e) {
    console.error('Met Museum error:', e);
    return [];
  }
}

// === 6. Wikimedia Commons (исторические фото) ===
async function fetchHistory(query: string, page: number) {
  try {
    const searchQuery = query && query !== 'history' ? query : 'history portrait';
    const url = https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=&srwhat=image&srlimit=20&sroffset=&format=json&origin=*;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.query?.search) return [];
    
    return data.query.search.map((p: any) => ({
      id: wiki_,
      src: https://commons.wikimedia.org/wiki/Special:FilePath/,
      thumb: https://commons.wikimedia.org/wiki/Special:FilePath/?width=200,
      title: p.title.replace(/_/g, ' '),
      author: 'Wikimedia Commons',
      authorAvatar: '',
      source: 'History',
      link: https://commons.wikimedia.org/wiki/,
    }));
  } catch (e) {
    console.error('Wikimedia error:', e);
    return [];
  }
}

// === 7. Rijksmuseum (нидерландское искусство) ===
async function fetchArtHistory(query: string, page: number) {
  const key = process.env.NEXT_PUBLIC_RIJKSMUSEUM_API_KEY;
  if (!key) return [];
  
  try {
    const url = query && query !== 'art'
      ? https://www.rijksmuseum.nl/api/nl/collection?key=&q=&imgonly=true&ps=20&p=
      : https://www.rijksmuseum.nl/api/nl/collection?key=&imgonly=true&ps=20&p=;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.artObjects) return [];
    
    return data.artObjects.map((o: any) => ({
      id: ijks_,
      src: o.webImage?.url || o.headerImage?.url || '',
      thumb: o.webImage?.url || o.headerImage?.url || '',
      title: o.title,
      author: o.principalOrFirstMaker || 'Unknown Artist',
      authorAvatar: '',
      source: 'Rijksmuseum',
      link: o.links?.web || '',
    }));
  } catch (e) {
    console.error('Rijksmuseum error:', e);
    return [];
  }
}

// Универсальная функция, собирающая всё вместе
async function fetchAll(query: string, page: number) {
  const sources = await Promise.all([
    fetchMemes(query, page),
    fetchReddit('memes', 'memes', page),
    fetchReddit('art', 'art', page),
    fetchReddit('music', 'music', page),
    fetchMovies(query, page),
    fetchMusic(query, page),
    fetchArt(query, page),
    fetchHistory(query, page),
  ]);
  
  // Перемешиваем и возвращаем
  const all = sources.flat();
  return all.sort(() => Math.random() - 0.5).slice(0, 20);
}
