import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const LINGUISTIC_NOISE = new Set([
  "hd", "4k", "8k", "hq", "high", "quality", "resolution", "1080p", "fullhd",
  "wallpaper", "wallpapers", "background", "backgrounds", "desktop", "mobile",
  "image", "images", "photo", "photos", "pic", "picture", "pictures", "screen",
  "art", "artwork", "vector", "svg", "png", "jpg", "jpeg", "comp", "render",
  "free", "download", "stock", "gallery", "music", "bands", "promo", "official",
  "clipart", "royalty", "live", "concert", "poster", "bing", "th", "oip", "id"
]);

const CLEANUP_REGEX = /\b(wallpaper|hd|4k|image|photo|pic|picture|download|free|vector|stock|source|desktop|background|pinterest|preview|aesthetic|artifact)\b/gi;
const CONSONANT_CLUSTER_REGEX = /[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZБВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬ]{6,}/;
const HASH_REGEX = new RegExp("^(?=.*[a-zA-Zа-яА-ЯёЁ])(?=.*\\d)[a-zA-Zа-яА-ЯёЁ\\d]{4,}(?![\\s\\S])");

function cleanAnchorTitle(rawTitle: string): string {
  if (!rawTitle || rawTitle === "Aesthetic Artifact" || rawTitle === "Aesthetic") return "";
  const clean = rawTitle
    .replace(/[\uE000\uE001]/g, "")
    .replace(/http\S+|www\S+/g, "")
    .replace(/\.(jpg|jpeg|png|webp|gif|mp4|avif)\b/gi, "")
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/[-_]/g, " ")
    .replace(CLEANUP_REGEX, "")
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, " ");

  const validWords: string[] = [];
  for (const word of clean.split(/\s+/)) {
    if (!word) continue;
    if (word.length > 15 || HASH_REGEX.test(word) || CONSONANT_CLUSTER_REGEX.test(word)) continue;
    if (word.length === 1 && !["a", "i", "о", "у", "а", "я", "и", "к", "в", "с"].includes(word.toLowerCase())) continue;
    validWords.push(word);
  }
  const finalAnchor = validWords.slice(0, 6).join(" ").trim();
  return finalAnchor.length <= 2 ? "" : finalAnchor;
}

function extractSemanticCore(input: string): string {
  if (!input) return "";
  try {
    if (input.startsWith("http") && /(bing\.com\/th|gstatic\.com|pinimg\.com|unsplash\.com)/i.test(input)) {
      return "";
    }

    const text = input.startsWith("http")
      ? decodeURIComponent(input).split("/").pop()?.split(/[?#]/)[0] || ""
      : input;

    const withoutExt = text.replace(/\.[a-zA-Z0-9]+(?![\s\S])/, "");
    const stripped = withoutExt.replace(/[-_]/g, "");

    const isHexHash = /^[a-f0-9]{8,}(?![\s\S])/i.test(stripped);
    const isAlnumHash = /^[a-z0-9]{12,}(?![\s\S])/i.test(stripped) && /\d/.test(stripped);
    if (isHexHash || isAlnumHash) {
      return "";
    }

    const textOnly = withoutExt
      .replace(/[-_+]/g, " ")
      .replace(/[0-9]+/g, " ")
      .replace(/\b[xX]\b/g, " ");

    const tokens = textOnly.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (tokens.length === 0) return "";

    let startIndex = 0;
    while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) startIndex++;

    let endIndex = tokens.length - 1;
    while (endIndex >= startIndex && LINGUISTIC_NOISE.has(tokens[endIndex])) endIndex--;

    const coreTokens = tokens.slice(startIndex, endIndex + 1).filter((w) => !LINGUISTIC_NOISE.has(w));
    if (coreTokens.length === 0) return "";

    const uniqueTokens = Array.from(new Set(coreTokens));
    return uniqueTokens.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } catch {
    return "";
  }
}

function clip(val: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, val));
}

function extract32dConsciousnessTensor(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const offset = Math.min(256, Math.floor(bytes.length * 0.05));
  const step = Math.max(1, Math.floor((bytes.length - offset) / 16384));

  const samples: number[] = [];
  for (let i = offset; i < bytes.length && samples.length < 16384; i += step) {
    samples.push(bytes[i]);
  }
  const n = Math.max(samples.length, 1);

  const hist = new Float64Array(256);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    sum += v;
    hist[v]++;
  }
  const mean = sum / n;
  const luminance = clip(mean / 255.0);

  let shannonEntropy = 0;
  for (let i = 0; i < 256; i++) {
    if (hist[i] > 0) {
      const p = hist[i] / n;
      shannonEntropy -= p * Math.log2(p);
    }
  }
  const entropyNorm = clip(shannonEntropy / 8.0);

  let lapSum = 0;
  let lapSqSum = 0;
  let edgeCount = 0;
  let grainSum = 0;
  let centerEdgeMass = 0;
  let totalEdgeMass = 1e-5;

  for (let i = 2; i < n - 2; i++) {
    const lap = samples[i - 1] - 2 * samples[i] + samples[i + 1];
    lapSum += lap;
    lapSqSum += lap * lap;

    const grad = Math.abs(samples[i + 1] - samples[i - 1]);
    if (grad > 45) edgeCount++;
    totalEdgeMass += grad;

    const normPos = (i / n) - 0.5;
    const gauss = Math.exp(-(normPos * normPos) / 0.08);
    centerEdgeMass += grad * gauss;

    const blur5 = (samples[i - 2] + samples[i - 1] + samples[i] + samples[i + 1] + samples[i + 2]) / 5.0;
    grainSum += Math.abs(samples[i] - blur5);
  }

  const lapMean = lapSum / Math.max(n - 4, 1);
  const laplacianVar = Math.max(0, lapSqSum / Math.max(n - 4, 1) - lapMean * lapMean) / 15.0;

  const tension = clip((edgeCount / n) * 2.5);
  const depth = clip(1.0 - laplacianVar / 800.0);
  const gestalt = clip((centerEdgeMass / totalEdgeMass) * 1.3);
  const grain = clip((grainSum / n) / 28.0);

  const sorted = [...samples].sort((a, b) => a - b);
  const p4 = sorted[Math.floor(n * 0.04)] || 0;
  const fftRhythm = clip((tension * 0.6) + (grain * 0.4));
  const chronos = clip((p4 / 255.0) * 2.2 + fftRhythm * 0.4);

  let stdSum = 0;
  for (let i = 0; i < n; i++) stdSum += (samples[i] - mean) ** 2;
  const stdDev = Math.sqrt(stdSum / n);
  const harmonics = clip(1.0 - stdDev / 95.0);
  const pinkNoise = clip((1.0 - tension) * 0.7 + depth * 0.3);

  const tensor = new Array(32).fill(0);
  tensor[0] = Number(luminance.toFixed(4));
  tensor[2] = Number(entropyNorm.toFixed(4));
  tensor[4] = Number(tension.toFixed(4));
  tensor[8] = Number(depth.toFixed(4));
  tensor[10] = Number(clip((gestalt + tension) / 2).toFixed(4));
  tensor[11] = Number(chronos.toFixed(4));
  tensor[12] = Number(gestalt.toFixed(4));
  tensor[13] = Number(harmonics.toFixed(4));
  tensor[15] = Number(grain.toFixed(4));
  tensor[28] = Number(pinkNoise.toFixed(4));

  return { tensor, shannonEntropy, laplacianVar };
}

function parseVector(v: any): number[] {
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === "string") {
    return v.replace(/[\[\]]/g, "").split(",").map((x) => parseFloat(x.trim())).filter((x) => !isNaN(x));
  }
  return [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const FALLBACK_ARCHETYPES = [
  { alias: "NOCTURNAL MONOLITH", vec: [0.2, 0, 0.7, 0, 0.6, 0, 0, 0, 0.7, 0, 0.6, 0.5, 0.7, 0.5, 0, 0.6] },
  { alias: "ACID EXPRESSIONISM", vec: [0.5, 0, 0.9, 0, 0.8, 0, 0, 0, 0.3, 0, 0.8, 0.7, 0.6, 0.3, 0, 0.8] },
  { alias: "LIMINAL ARCHIVE", vec: [0.4, 0, 0.5, 0, 0.3, 0, 0, 0, 0.8, 0, 0.5, 0.8, 0.5, 0.8, 0, 0.7] },
  { alias: "BRUTALIST PHANTOM", vec: [0.3, 0, 0.6, 0, 0.9, 0, 0, 0, 0.5, 0, 0.7, 0.4, 0.8, 0.6, 0, 0.5] },
  { alias: "ETHEREAL DECAY", vec: [0.7, 0, 0.4, 0, 0.2, 0, 0, 0, 0.9, 0, 0.4, 0.6, 0.4, 0.9, 0, 0.4] }
];

async function synthesizeQueryFromDb(tensor: number[], rawTitle: string, contextText: string) {
  const anchor = cleanAnchorTitle(rawTitle);
  const words = Array.from(new Set((contextText || "").toLowerCase().match(/[a-zа-яё]{3,}/gi) || []));
  const semanticTensor = [0.4, 0.5, 0.5, 0.3, 0.6];

  try {
    if (words.length > 0) {
      const { data: ontoRows } = await supabase
        .from("semantic_ontology")
        .select("axis, weight")
        .in("word", words);

      if (ontoRows && ontoRows.length > 0) {
        const axisMap: Record<string, number> = { IDEATIONAL: 0, SENSATE: 1, DREAD: 2, EUPHORIA: 3, NOSTALGIA: 4 };
        const sums = [0, 0, 0, 0, 0];
        for (const r of ontoRows) {
          const idx = axisMap[r.axis];
          if (idx !== undefined) sums[idx] += Number(r.weight || 0);
        }
        for (let i = 0; i < 5; i++) {
          if (sums[i] > 0) semanticTensor[i] = clip((sums[i] / Math.max(words.length, 1)) * 15.0);
        }
      }
    }
  } catch {}

  const [ideational, , dread, euphoria, nostalgia] = semanticTensor;
  const luminance = tensor[0], entropy = tensor[2], tension = tensor[4], depth = tensor[8];
  const chronos = tensor[11], gestalt = tensor[12], harmonics = tensor[13], grain = tensor[15], pinkNoise = tensor[28];

  let dominantAlias = "NOCTURNAL MONOLITH";
  let resonancePct = 91;

  try {
    const { data: archRows } = await supabase.from("archetypes").select("alias, vector_32d").limit(100);
    if (archRows && archRows.length > 0) {
      let bestSim = -1;
      for (const row of archRows) {
        const vec = parseVector(row.vector_32d);
        const sim = cosineSimilarity(tensor, vec);
        if (sim > bestSim) {
          bestSim = sim;
          dominantAlias = row.alias;
        }
      }
      resonancePct = Math.round(clip(bestSim * 100, 86, 99));
    } else {
      let bestSim = -1;
      for (const item of FALLBACK_ARCHETYPES) {
        const sim = cosineSimilarity(tensor.slice(0, 16), item.vec);
        if (sim > bestSim) {
          bestSim = sim;
          dominantAlias = item.alias;
        }
      }
      resonancePct = Math.round(clip(bestSim * 100, 87, 98));
    }
  } catch {}

  const stateVec = [luminance, entropy, pinkNoise, dread, euphoria];
  const formVec = [tension, depth, gestalt, dread, ideational];
  const mediumVec = [chronos, grain, harmonics, dread, nostalgia];

  let bestState = entropy > 0.6 ? "grunge dark" : "ethereal moody";
  let bestForm = tension > 0.5 ? "brutalist geometry" : "minimalist composition";
  let bestMedium = grain > 0.4 ? "35mm film grain vintage" : "cinematic photography";

  try {
    const { data: lexRows } = await supabase.from("lexicon_matrix").select("category, phrase, vector_5d").limit(300);
    if (lexRows && lexRows.length > 0) {
      let maxS = -1, maxF = -1, maxM = -1;
      for (const row of lexRows) {
        const v = parseVector(row.vector_5d);
        if (row.category === "STATE") {
          const s = cosineSimilarity(stateVec, v);
          if (s > maxS) { maxS = s; bestState = row.phrase; }
        } else if (row.category === "FORM") {
          const s = cosineSimilarity(formVec, v);
          if (s > maxF) { maxF = s; bestForm = row.phrase; }
        } else if (row.category === "MEDIUM") {
          const s = cosineSimilarity(mediumVec, v);
          if (s > maxM) { maxM = s; bestMedium = row.phrase; }
        }
      }
    }
  } catch {}

  const isCyrillicAnchor = /[а-яА-ЯёЁ]/.test(anchor);
  let finalQuery = "";

  if (anchor) {
    finalQuery = isCyrillicAnchor ? (anchor + " архив фото") : (anchor + " " + bestMedium);
  } else {
    const stopWords = new Set(["and", "the", "with", "from", "unknown", "anomaly"]);
    const rawWords = (dominantAlias.toLowerCase() + " " + bestState + " " + bestForm)
      .split(/\s+/)
      .filter((w) => w && !stopWords.has(w.toLowerCase()));
    finalQuery = Array.from(new Set(rawWords)).slice(0, 6).join(" ");
  }

  return {
    smartQuery: finalQuery.trim(),
    displayVibe: "RESONANCE: " + dominantAlias,
    resonanceScore: resonancePct,
    archetype: dominantAlias,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl || body.image_url || body.src;
    const rawAlt = body.altText || body.title || body.context || "";
    const altText = rawAlt.slice(0, 120);

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const titleAnchor = cleanAnchorTitle(altText);
    const urlSubject = extractSemanticCore(imageUrl);
    const coreSubject = titleAnchor || urlSubject;

    let imageBuffer: ArrayBuffer | null = null;
    try {
      const imageRes = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (imageRes.ok) {
        const contentLength = imageRes.headers.get("content-length");
        if (!contentLength || parseInt(contentLength, 10) <= 5 * 1024 * 1024) {
          imageBuffer = await imageRes.arrayBuffer();
        }
      }
    } catch {}

    const { tensor } = imageBuffer
      ? extract32dConsciousnessTensor(imageBuffer)
      : { tensor: [0.35, 0, 0.65, 0, 0.55, 0, 0, 0, 0.7, 0, 0.6, 0.5, 0.65, 0.6, 0, 0.5, ...new Array(16).fill(0)] };

    const result = await synthesizeQueryFromDb(tensor, coreSubject, altText || coreSubject);

    console.log("[ORACLE 12.0 NATIVE] Vibe: " + result.displayVibe + " -> Query: " + result.smartQuery);

    return NextResponse.json({
      success: true,
      status: "success",
      query: result.smartQuery,
      smartQuery: result.smartQuery,
      tensor,
      style: result.archetype,
      archetype: result.archetype,
      resonanceScore: result.resonanceScore,
      displayVibe: result.displayVibe,
      source: "oracle_math_core",
    });
  } catch (error: any) {
    console.error("[MUTATE ERROR]", error.message);
    return NextResponse.json({
      success: true,
      query: "dark cinematic photography",
      smartQuery: "dark cinematic photography",
      displayVibe: "RESONANCE: NOCTURNAL MONOLITH",
      resonanceScore: 89,
      source: "oracle_fallback",
    });
  }
}
