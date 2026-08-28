import { NextResponse } from "next/server";

// ==========================================
// SEMANTIC ENGINE: УБИЙЦА МУСОРА В URL
// ==========================================
const LINGUISTIC_NOISE = new Set([
  "hd", "4k", "8k", "hq", "high", "quality", "resolution", "1080p", "fullhd",
  "wallpaper", "wallpapers", "background", "backgrounds", "desktop", "mobile", 
  "image", "images", "photo", "photos", "pic", "picture", "pictures", "screen",
  "art", "artwork", "vector", "svg", "png", "jpg", "jpeg", "comp", "render",
  "free", "download", "stock", "gallery", "music", "bands", "promo", "official",
  "clipart", "royalty", "live", "concert", "poster"
]);

function extractSemanticCore(imageUrl: string): string {
  try {
    // 1. Декодируем %20 в нормальные пробелы (спасает "Pink Floyd")
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // 2. Вытаскиваем имя файла, отбрасывая параметры после ? или #
    const filename = decodedUrl.split('/').pop()?.split(/[?#]/)[0] || "";
    
    // 3. Удаляем расширение файла
    const withoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, "");
    
    // 4. БРОНЯ ОТ ХЭШ-ШИЗОФРЕНИИ (Pinterest, CDN)
    if (/^[a-f0-9]{10,}$/i.test(withoutExt) || /^[a-zA-Z0-9_-]{15,}$/.test(withoutExt)) {
      return "";
    }

    // 5. Чистка: убираем разделители, цифры и 'x'
    const textOnly = withoutExt
      .replace(/[-_+]/g, " ")
      .replace(/[0-9]+/g, " ")
      .replace(/\b[xX]\b/g, " ");

    const tokens = textOnly.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (tokens.length === 0) return "";

    // 6-7. Откусываем SEO-мусор слева и справа
    let startIndex = 0;
    while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) {
      startIndex++;
    }

    let endIndex = tokens.length - 1;
    while (endIndex >= startIndex && LINGUISTIC_NOISE.has(tokens[endIndex])) {
      endIndex--;
    }

    const coreTokens = tokens.slice(startIndex, endIndex + 1);
    if (coreTokens.length === 0) return "";

    return coreTokens.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  } catch (e) {
    console.error("[SEMANTIC ENGINE ERROR]", e);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl || body.image_url || body.src;
    
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    // 🔥 1. ВЫЧИСЛЯЕМ КРИСТАЛЬНЫЙ СУБЪЕКТ
    const coreSubject = extractSemanticCore(imageUrl);
    console.log(`[MUTATE] Идентифицирован субъект: "${coreSubject || "СУБЪЕКТ ОТСУТСТВУЕТ"}"`);

    // 2. СКАЧИВАЕМ КАРТИНКУ
    let imageBuffer: ArrayBuffer;
    try {
      const imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(8000)
      });
      if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);
      imageBuffer = await imageRes.arrayBuffer();
    } catch (e: any) {
      console.warn(`[PARSER] Не удалось скачать картинку: ${e.message}. Фоллбэк.`);
      return NextResponse.json({
        query: coreSubject || "aesthetic vintage",
        tensor: Array(14).fill(0.5),
        style: "unknown",
        displayVibe: "AESTHETIC VINTAGE",
        source: "semantic_only"
      });
    }

    // 3. ОТПРАВЛЯЕМ В ПИТОН
    const ORACLE_URL = process.env.ORACLE_URL || "https://kashmir-oracle.onrender.com/api/mutate";
    
    let oracleData: any;
    try {
      const oracleRes = await fetch(ORACLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: imageBuffer,
        signal: AbortSignal.timeout(15000)
      });

      if (!oracleRes.ok) throw new Error(`Oracle HTTP ${oracleRes.status}`);
      
      oracleData = await oracleRes.json();
      if (oracleData.status === "error") throw new Error(oracleData.message || "Oracle logic error");

    } catch (e: any) {
      console.warn(`[ORACLE] Ошибка связи: ${e.message}. Фоллбэк.`);
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic high quality";
      return NextResponse.json({
        query: fallbackVibe,
        tensor: Array(14).fill(0.5),
        style: "fallback",
        displayVibe: "AESTHETIC FALLBACK",
        source: "heuristic_fallback"
      });
    }

    // 4. СИНТЕЗ ЗАПРОСА И ВИЗУАЛИЗАЦИЯ
    const oracleVibe = oracleData.refined_query || oracleData.style || "aesthetic";
    
    // 🔥 НОВАЯ ЛОГИКА DISPLAY VIBE
    // Берем первые 2 слова из "заклинания" для красивого заголовка
    const vibeWords = (oracleData.refined_query || "aesthetic").split(" ").slice(0, 2).join(" ");
    const displayVibe = vibeWords.toUpperCase(); 

    // Физика гравитации
    const gravity = (oracleData.tensor && oracleData.tensor.length > 10) 
      ? oracleData.tensor[10] 
      : 0.5; 

    let finalQuery = oracleVibe;

    if (coreSubject) {
      if (gravity > 0.6) {
        finalQuery = `"${coreSubject}" ${oracleVibe}`;
        console.log(`[ORACLE] Высокая гравитация (${gravity.toFixed(2)}). Субъект зафиксирован.`);
      } else {
        finalQuery = `${coreSubject} ${oracleVibe}`;
        console.log(`[ORACLE] Низкая гравитация (${gravity.toFixed(2)}). Мягкое слияние.`);
      }
    }

    console.log(`[MUTATE] Обратная проекция: "${finalQuery}" | Vibe: "${displayVibe}"`);

    return NextResponse.json({
      success: true,
      query: finalQuery,
      smartQuery: finalQuery,
      tensor: oracleData.tensor,
      style: oracleData.style,
      displayVibe: displayVibe, // Теперь это "NEON GLOWING" вместо просто "NEON"
      source: "oracle_math_core"
    });

  } catch (error: any) {
    console.error(`[MUTATE FATAL ERROR]`, error.message);
    return NextResponse.json({ 
      error: error.message, 
      query: "aesthetic vintage", 
      smartQuery: "aesthetic vintage",
      displayVibe: "SYSTEM ERROR",
      tensor: Array(14).fill(0.5)
    }, { status: 500 });
  }
}
