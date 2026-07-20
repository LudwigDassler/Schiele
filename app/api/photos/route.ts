import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { shuffle, dedupeBySrc } from "@/lib/api";
import type { Photo } from "@/lib/types";

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

const categoryMap: Record<string, string> = {
  "All": "photography", "Nature": "nature", "City": "city street",
  "Food": "food cuisine", "Travel": "travel destination", "Architecture": "architecture building",
  "Fashion": "fashion style", "Art": "art painting", "Sports": "sports action",
  "Interior": "interior design", "Animals": "animals wildlife", "Technology": "technology",
  "Music": "music musician", "Cinema": "cinema film", "Photography": "photography portrait", "Beauty": "beauty",
};

const categoryDB: Record<string, string> = {
  "Art": "art", "Music": "music", "Cinema": "cinema", "All": ""
};

async function searchDB(query: string, category: string, page: number): Promise<Photo[]> {
  try {
    const limit = 30;
    const offset = (page - 1) * limit;
    
    let q = supabaseAdmin
      .from("images")
      .select("external_id,src,thumb,title,author,author_avatar,source,link,query,category")
      .range(offset, offset + limit - 1);

    if (query) {
      // Точный поиск по query полю
      q = q.or(`query.ilike.%${query}%,title.ilike.%${query}%,tags.ilike.%${query}%`);
    } else if (category && category !== "All") {
      const dbCat = categoryDB[category];
      if (dbCat) q = q.eq("category", dbCat);
    }

    const { data, error } = await q;
    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.external_id || Math.random().toString(36),
      src: p.src,
      thumb: p.thumb || p.src,
      title: p.title || "",
      author: p.author || "",
      authorAvatar: p.author_avatar || "",
      source: p.source || "",
      link: p.link || "",
    }));
  } catch (e) {
    console.error("DB search error:", e);
    return [];
  }
}

async function fetchUnsplash(query: string, page: number): Promise<Photo[]> {
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&page=${page}&client_id=${UNSPLASH_KEY}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      id: "u_" + p.id, src: p.urls.regular, thumb: p.urls.small,
      title: p.alt_description || query, author: p.user.name,
      authorAvatar: p.user.profile_image.small, source: "unsplash", link: p.links.html,
    }));
  } catch { return []; }
}

async function fetchPexels(query: string, page: number): Promise<Photo[]> {
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}`,
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

async function fetchPixabay(query: string, page: number): Promise<Photo[]> {
  try {
    const res = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=15&page=${page}&image_type=all&safesearch=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((p: any) => ({
      id: "px_" + p.id, src: p.largeImageURL, thumb: p.previewURL,
      title: "", author: p.user,
      authorAvatar: p.userImageURL || "", source: "pixabay", link: p.pageURL,
    }));
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "All";
  const customQuery = searchParams.get("query");
  const page = parseInt(searchParams.get("page") || "1");
  const isSearch = !!customQuery;

  let photos: Photo[] = [];

  if (isSearch) {
    // Поиск: сначала БД, потом внешние API параллельно
    const [dbResults, unsplash, pexels, pixabay] = await Promise.all([
      searchDB(customQuery!, category, page),
      fetchUnsplash(customQuery!, page),
      fetchPexels(customQuery!, page),
      fetchPixabay(customQuery!, page),
    ]);

    // БД идёт первой — она точнее
    const external = shuffle([...unsplash, ...pexels, ...pixabay]);
    photos = [...dbResults, ...external];
  } else {
    // Категория: сначала БД
    const [dbResults, unsplash, pexels, pixabay] = await Promise.all([
      searchDB("", category, page),
      fetchUnsplash(categoryMap[category] || "photography", page),
      fetchPexels(categoryMap[category] || "photography", page),
      fetchPixabay(categoryMap[category] || "photography", page),
    ]);

    photos = [...dbResults, ...shuffle([...unsplash, ...pexels, ...pixabay])];
  }

  // Фильтруем битые ссылки и дубликаты
  const clean = dedupeBySrc(photos);

  return NextResponse.json({ photos: clean });
}
