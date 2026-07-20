import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Photo } from "./types";

// ── Supabase (server-side) ──────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// ── External image providers ────────────────────────────────────────────
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

export const CATEGORIES = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
] as const;

export type Category = (typeof CATEGORIES)[number];

const categoryQueryMap: Record<string, string> = {
  All: "photography", Nature: "nature", City: "city street",
  Food: "food cuisine", Travel: "travel destination", Architecture: "architecture building",
  Fashion: "fashion style", Art: "art painting", Sports: "sports action",
  Interior: "interior design", Animals: "animals wildlife", Technology: "technology",
  Music: "music musician", Cinema: "cinema film", Photography: "photography portrait", Beauty: "beauty",
};

const categoryDBMap: Record<string, string> = {
  Art: "art", Music: "music", Cinema: "cinema", All: "",
};

export const PER_PROVIDER = 15;

// ── Helpers ─────────────────────────────────────────────────────────────
function isValidImage(src: unknown): src is string {
  return typeof src === "string" && /^https?:\/\//.test(src);
}

type RawRow = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

// ── Providers ───────────────────────────────────────────────────────────
async function searchDB(query: string, category: string, page: number): Promise<Photo[]> {
  if (!supabase) return [];
  try {
    const offset = (page - 1) * 30;
    let q = supabase
      .from("images")
      .select("external_id,src,thumb,title,author,author_avatar,source,link,query,category")
      .range(offset, offset + 29);

    if (query) {
      const like = `%${query}%`;
      q = q.or(`query.ilike.${like},title.ilike.${like},tags.ilike.${like}`);
    } else if (category && category !== "All") {
      const dbCat = categoryDBMap[category];
      if (dbCat) q = q.eq("category", dbCat);
    }

    const { data, error } = await q;
    if (error || !data) return [];

    return (data as RawRow[]).map((p) => ({
      id: str(p.external_id) || `db_${str(p.src)}`,
      src: str(p.src),
      thumb: str(p.thumb) || str(p.src),
      title: str(p.title),
      author: str(p.author),
      authorAvatar: str(p.author_avatar),
      source: str(p.source) || "Schiele",
      link: str(p.link),
    }));
  } catch {
    return [];
  }
}

async function fetchUnsplash(query: string, page: number): Promise<Photo[]> {
  if (!UNSPLASH_KEY) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${PER_PROVIDER}&page=${page}&client_id=${UNSPLASH_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: RawRow) => {
      const urls = (p.urls || {}) as RawRow;
      const user = (p.user || {}) as RawRow;
      const links = (p.links || {}) as RawRow;
      const avatar = (user.profile_image || {}) as RawRow;
      return {
        id: "u_" + str(p.id),
        src: str(urls.regular),
        thumb: str(urls.small),
        title: str(p.alt_description) || query,
        author: str(user.name),
        authorAvatar: str(avatar.small),
        source: "Unsplash",
        link: str(links.html),
      };
    });
  } catch {
    return [];
  }
}

async function fetchPexels(query: string, page: number): Promise<Photo[]> {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_PROVIDER}&page=${page}`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p: RawRow) => {
      const src = (p.src || {}) as RawRow;
      return {
        id: "p_" + str(p.id),
        src: str(src.large),
        thumb: str(src.medium),
        title: str(p.alt) || query,
        author: str(p.photographer),
        authorAvatar: "",
        source: "Pexels",
        link: str(p.url),
      };
    });
  } catch {
    return [];
  }
}

async function fetchPixabay(query: string, page: number): Promise<Photo[]> {
  if (!PIXABAY_KEY) return [];
  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${PER_PROVIDER}&page=${page}&image_type=all&safesearch=true`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((p: RawRow) => ({
      id: "px_" + str(p.id),
      src: str(p.largeImageURL),
      thumb: str(p.previewURL),
      title: str(p.tags),
      author: str(p.user),
      authorAvatar: str(p.userImageURL),
      source: "Pixabay",
      link: str(p.pageURL),
    }));
  } catch {
    return [];
  }
}

// ── Relevance ranking ───────────────────────────────────────────────────
function relevanceScore(photo: Photo, terms: string[]): number {
  if (terms.length === 0) return 0;
  const haystack = `${photo.title} ${photo.author} ${photo.source}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term)) score += 2;
    if (photo.title.toLowerCase().startsWith(term)) score += 1;
  }
  return score;
}

function dedupeAndRank(groups: Photo[][], query: string): Photo[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const seenSrc = new Set<string>();
  const seenId = new Set<string>();
  const result: Photo[] = [];

  // Keep provider priority (DB first) as the stable base order, then rank
  // external results within their group by relevance to the query.
  groups.forEach((group, groupIndex) => {
    const ranked =
      terms.length > 0 && groupIndex > 0
        ? [...group].sort((a, b) => relevanceScore(b, terms) - relevanceScore(a, terms))
        : group;

    for (const original of ranked) {
      if (!isValidImage(original.src)) continue;
      if (seenSrc.has(original.src)) continue;
      const photo = seenId.has(original.id)
        ? { ...original, id: `${original.id}_${result.length}` }
        : original;
      seenSrc.add(photo.src);
      seenId.add(photo.id);
      result.push(photo);
    }
  });

  return result;
}

// ── Public API ──────────────────────────────────────────────────────────
export type SearchArgs = {
  query?: string;
  category?: string;
  page?: number;
};

export async function searchPhotos({ query = "", category = "All", page = 1 }: SearchArgs): Promise<Photo[]> {
  const isSearch = query.trim().length > 0;
  const externalQuery = isSearch ? query : categoryQueryMap[category] || "photography";

  const [db, unsplash, pexels, pixabay] = await Promise.all([
    searchDB(isSearch ? query : "", category, page),
    fetchUnsplash(externalQuery, page),
    fetchPexels(externalQuery, page),
    fetchPixabay(externalQuery, page),
  ]);

  // DB first (most relevant to Schiele), then external providers ranked by relevance.
  return dedupeAndRank([db, unsplash, pexels, pixabay], isSearch ? query : "");
}
