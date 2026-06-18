import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;

const categoryMap: Record<string, string> = {
  "All": "photography", "Nature": "nature", "City": "city",
  "Food": "food", "Travel": "travel", "Architecture": "architecture",
  "Fashion": "fashion", "Art": "art", "Sports": "sport",
  "Interior": "interior", "Animals": "animals", "Technology": "technology",
  "Music": "music", "Cinema": "cinema", "Photography": "portrait", "Beauty": "beauty",
};

async function fetchUnsplash(query: string, page: number) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&per_page=15&page=${page}&client_id=${UNSPLASH_KEY}`
    );
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      id: `u_${p.id}`,
      src: p.urls.regular,
      thumb: p.urls.small,
      title: p.alt_description || query,
      author: p.user.name,
      authorAvatar: p.user.profile_image.small,
      source: "unsplash",
      link: p.links.html,
    }));
  } catch { return []; }
}

async function fetchPexels(query: string, page: number) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=15&page=${page}`,
      { headers: { Authorization: PEXELS_KEY! } }
    );
    const data = await res.json();
    return (data.photos || []).map((p: any) => ({
      id: `p_${p.id}`,
      src: p.src.large,
      thumb: p.src.medium,
      title: p.alt || query,
      author: p.photographer,
      authorAvatar: "",
      source: "pexels",
      link: p.url,
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

  const [unsplash, pexels] = await Promise.all([
    fetchUnsplash(query, page),
    fetchPexels(query, page),
  ]);

  const mixed = shuffle([...unsplash, ...pexels]);

  return NextResponse.json({ photos: mixed });
}