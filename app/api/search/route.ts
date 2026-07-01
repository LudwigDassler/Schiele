import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@xenova/transformers";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://kefdjxsmyarwfqqkfgcx.supabase.co"; 
const SUPABASE_KEY = "sb_secret_2UZY3PLCKoIznRnZoCoPDg_wsv6lYp7"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let extractor: any = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";

  try {
    const { data: pins, error } = await supabase.from("pins").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!query.trim()) return NextResponse.json({ pins: pins.slice(0, 30) });

    if (!extractor) {
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }

    const queryResult = await extractor(query, { pooling: "mean", normalize: true });
    const queryVector = Array.from(queryResult.data) as number[];

    const scoredPins = await Promise.all(
      pins.map(async (pin: any) => {
        const brand = (pin.brand || "").toLowerCase();
        const category = (pin.category || "").toLowerCase();
        const description = (pin.description || "").toLowerCase();
        const textToEmbed = `${brand} ${category} ${description}`;

        // 1. ѕровер€ем точное совпадение слов (“екстовый буст)
        const isExactMatch = description.includes(query) || brand.includes(query) || category.includes(query);

        // 2. —читаем векторное сходство
        const pinResult = await extractor(textToEmbed, { pooling: "mean", normalize: true });
        const pinVector = Array.from(pinResult.data) as number[];
        let similarity = cosineSimilarity(queryVector, pinVector);

        // ≈сли есть точное совпадение букв Ч искусственно задираем вес в топ
        if (isExactMatch) similarity += 0.5;

        return { ...pin, similarity };
      })
    );

    // —ортируем и отсекаем весь €вный бред (порог теперь выше, так как у точных совпадений вес > 0.8)
    const sortedPins = scoredPins
      .sort((a, b) => b.similarity - a.similarity)
      .filter(pin => pin.similarity > 0.45);

    return NextResponse.json({ pins: sortedPins });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
