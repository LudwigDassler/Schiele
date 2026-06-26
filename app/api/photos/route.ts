import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const LASTFM_KEY = process.env.LASTFM_API_KEY;

const categoryMap: Record<string, string> = {
  "All": "photography", "Nature": "nature", "City": "city street",
  "Food": "food cuisine", "Travel": "travel destination", "Architecture": "architecture building",
  "Fashion": "fashion style", "Art": "artwork painting", "Sports": "sports action",
  "Interior": "interior design", "Animals": "animals wildlife", "Technology": "technology digital",
  "Music": "music musician", "Cinema": "cinema film movie", "Photography": "photography portrait", "Beauty": "beauty makeup",
};

async function fetchUnsplash(query: string, page: number) {
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}&client_id=${UNSPLASH_KEY}`);
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
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}`,
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
    const res = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&image_type=all&safesearch=true`);
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
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=10`);
    if (!res.ok) return [];
    const data = await res.json();
    const artists = data.results?.artistmatches?.artist || [];
    const results = [];
    for (const artist of artists) {
      if (artist.image?.[3]?.["#text"] && !artist.image[3]["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")) {
        results.push({
          id: "lfm_" + artist.mbid + "_" + Math.random(),
          src: artist.image[3]["#text"], thumb: artist.image[1]["#text"],
          title: artist.name, author: "Last.fm",
          authorAvatar: "", source: "last.fm", link: artist.url,
        });
      }
    }
    return results;
  } catch { return []; }
}

async function fetchMetMuseum(query: string) {
  try {
    const searchRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids = (searchData.objectIDs || []).slice(0, 15);
    const objects = await Promise.all(
      ids.map((id: number) => fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then(r => r.json()).catch(() => null))
    );
    return objects.filter(o => o?.primaryImage).map((o: any) => ({
      id: "met_" + o.objectID, src: o.primaryImage,
      thumb: o.primaryImageSmall || o.primaryImage,
      title: o.title || query, author: o.artistDisplayName || "The Met",
      authorAvatar: "", source: "met museum", link: o.objectURL,
    }));
  } catch { return []; }
}

async function fetchWikipedia(query: string) {
  try {
    const results = [];

    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      if (summary.thumbnail?.source) {
        results.push({
          id: "wiki_main_" + summary.pageid,
          src: summary.originalimage?.source || summary.thumbnail.source,
          thumb: summary.thumbnail.source,
          title: summary.title,
          author: summary.description || "Wikipedia",
          authorAvatar: "", source: "wikipedia",
          link: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        });
      }
    }

    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=15&prop=pageimages|pageterms&piprop=original|thumbnail&pilimit=15&format=json&origin=*`);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = Object.values(searchData.query?.pages || {}) as any[];
      for (const page of pages) {
        if (page.original?.source || page.thumbnail?.source) {
          results.push({
            id: "wiki_" + page.pageid,
            src: page.original?.source || page.thumbnail.source,
            thumb: page.thumbnail?.source || page.original?.source,
            title: page.title,
            author: page.terms?.description?.[0] || "Wikipedia",
            authorAvatar: "", source: "wikipedia",
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          });
        }
      }
    }

    const commonsRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`);
    if (commonsRes.ok) {
      const commonsData = await commonsRes.json();
      const pages = Object.values(commonsData.query?.pages || {}) as any[];
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (info?.url && !info.url.endsWith(".svg") && !info.url.endsWith(".ogg") && !info.url.endsWith(".ogv") && !info.url.endsWith(".webm") && !info.url.endsWith(".pdf")) {
          results.push({
            id: "commons_" + page.pageid,
            src: info.url, thumb: info.thumburl || info.url,
            title: info.extmetadata?.ObjectName?.value || page.title.replace("File:", ""),
            author: info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, "") || "Wikimedia",
            authorAvatar: "", source: "wikimedia",
            link: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
          });
        }
      }
    }

    return results;
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
  const customQuery = searchParams.get("query");
  const query = customQuery || categoryMap[category] || "photography";
  const page = parseInt(searchParams.get("page") || "1");
  const isSearch = !!customQuery;

  const sources: Promise<any[]>[] = [
    fetchUnsplash(query, page),
    fetchPexels(query, page),
    fetchPixabay(query, page),
  ];

  if (isSearch) {
    sources.push(fetchWikipedia(query));
    sources.push(fetchLastFm(query));
    sources.push(fetchMetMuseum(query));
  } else if (category === "Art") {
    sources.push(fetchMetMuseum(query));
    sources.push(fetchWikipedia(query));
  } else if (category === "Music") {
    sources.push(fetchLastFm(query));
  }

  const results = await Promise.all(sources);
  const mixed = shuffle(results.flat().filter(p => p?.src && p.src.startsWith("http")));

  return NextResponse.json({ photos: mixed });
}