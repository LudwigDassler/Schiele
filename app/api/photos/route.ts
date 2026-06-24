import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const LASTFM_KEY = process.env.LASTFM_API_KEY;

const categoryMap: Record<string, string> = {
  "All": "photography", "Nature": "nature", "City": "city",
  "Food": "food", "Travel": "travel", "Architecture": "architecture",
  "Fashion": "fashion", "Art": "art", "Sports": "sport",
  "Interior": "interior", "Animals": "animals", "Technology": "technology",
  "Music": "music", "Cinema": "cinema", "Photography": "portrait", "Beauty": "beauty",
};

async function fetchUnsplash(query: string, page: number) {
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&page=${page}&client_id=${UNSPLASH_KEY}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      id: "u_" + p.id, src: p.urls.regular, thumb: p.urls.small,
      title: p.alt_description || query, author: p.user.name,
      authorAvatar: p.user.profile_image.small, source: "unsplash", link: p.links.html,
    }));
  } catch { return []; }
}

async function fetchPexels(query: string, page: number) {
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&page=${page}`,
      { headers: { Authorization: PEXELS_KEY! } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p: any) => ({
      id: "p_" + p.id, src: p.src.large, thumb: p.src.medium,
      title: p.alt || query, author: p.photographer,
      authorAvatar: "", source: "pexels", link: p.url,
    }));
  } catch { return []; }
}

async function fetchPixabay(query: string, page: number) {
  try {
    const res = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=10&page=${page}&image_type=photo&safesearch=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((p: any) => ({
      id: "px_" + p.id, src: p.largeImageURL, thumb: p.previewURL,
      title: p.tags || query, author: p.user,
      authorAvatar: p.userImageURL || "", source: "pixabay", link: p.pageURL,
    }));
  } catch { return []; }
}

async function fetchLastFm(query: string) {
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=6`);
    if (!res.ok) return [];
    const data = await res.json();
    const artists = data.results?.artistmatches?.artist || [];
    const results = [];
    for (const artist of artists.slice(0, 4)) {
      if (artist.image && artist.image[3] && artist.image[3]["#text"] && !artist.image[3]["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")) {
        results.push({
          id: "lfm_" + artist.mbid + "_" + Math.random(),
          src: artist.image[3]["#text"],
          thumb: artist.image[1]["#text"],
          title: artist.name,
          author: "Last.fm",
          authorAvatar: "",
          source: "last.fm",
          link: artist.url,
        });
      }
    }
    return results;
  } catch { return []; }
}

async function fetchMetMuseum(query: string) {
  try {
    const searchRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&limit=6`);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids = (searchData.objectIDs || []).slice(0, 6);
    const objects = await Promise.all(
      ids.map((id: number) => fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then(r => r.json()).catch(() => null))
    );
    return objects.filter(o => o && o.primaryImage).map((o: any) => ({
      id: "met_" + o.objectID,
      src: o.primaryImage,
      thumb: o.primaryImageSmall || o.primaryImage,
      title: o.title || query,
      author: o.artistDisplayName || "The Met Museum",
      authorAvatar: "",
      source: "met museum",
      link: o.objectURL,
    }));
  } catch { return []; }
}

async function fetchWikimedia(query: string) {
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=6&prop=pageimages&piprop=original&format=json&origin=*`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as any[];
    return pages.filter(p => p.original?.source).map((p: any) => ({
      id: "wiki_" + p.pageid,
      src: p.original.source,
      thumb: p.thumbnail?.source || p.original.source,
      title: p.title,
      author: "Wikipedia",
      authorAvatar: "",
      source: "wikimedia",
      link: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
    }));
  } catch { return []; }
}

async function fetchImgflip(query: string) {
  try {
    const res = await fetch("https://api.imgflip.com/get_memes");
    if (!res.ok) return [];
    const data = await res.json();
    const memes = (data.data?.memes || [])
      .filter((m: any) => m.name.toLowerCase().includes(query.toLowerCase()) || query === "memes" || query === "photography")
      .slice(0, 4);
    return memes.map((m: any) => ({
      id: "meme_" + m.id,
      src: m.url,
      thumb: m.url,
      title: m.name,
      author: "Imgflip",
      authorAvatar: "",
      source: "meme",
      link: `https://imgflip.com/memetemplates`,
    }));
  } catch { return []; }
}

function shuffle(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "All";
  const query = searchParams.get("query") || categoryMap[category] || "photography";
  const page = parseInt(searchParams.get("page") || "1");
  const isSearch = !!searchParams.get("query");

  const sources = [
    fetchUnsplash(query, page),
    fetchPexels(query, page),
    fetchPixabay(query, page),
    fetchMetMuseum(query),
    fetchWikimedia(query),
  ];

  if (category === "Music" || isSearch) sources.push(fetchLastFm(query));
  if (category === "All" || isSearch) sources.push(fetchImgflip(query));

  const results = await Promise.all(sources);
  const mixed = shuffle(results.flat().filter(Boolean));

  return NextResponse.json({ photos: mixed });
}