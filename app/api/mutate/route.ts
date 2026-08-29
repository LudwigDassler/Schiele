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
  "clipart", "royalty", "live", "concert", "poster", "credit", "archives", "wp-content"
]);

function extractSemanticCore(input: string): string {
  if (!input) return "";
  
  try {
    // Если это URL, вытаскиваем имя файла
    let text = input.startsWith("http") 
      ? decodeURIComponent(input).split('/').pop()?.split(/[?#]/)[0] || ""
      : input;

    const withoutExt = text.replace(/\.[a-zA-Z0-9]+$/, "");
    
    // БРОНЯ ОТ ХЭШ-ШИЗОФРЕНИИ (но пропускаем осмысленные длинные названия)
    // Убиваем только если это сплошной 16-ричный хэш (a-f, 0-9) без тире
    if (/^[a-f0-9]{10,}$/i.test(withoutExt.replace(/[-_]/g, '')) && !/[g-z]/i.test(withoutExt.replace(/[-_]/g, ''))) {
      return ""; 
    }

    const textOnly = withoutExt
      .replace(/[-_+]/g, " ")
      .replace(/[0-9]+/g, " ")
      .replace(/\b[xX]\b/g, " ");

    const tokens = textOnly.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (tokens.length === 0) return "";

    let startIndex = 0;
    while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) {
      startIndex++;
    }

    let endIndex = tokens.length - 1;
    while (endIndex >= startIndex && LINGUISTIC_NOISE.has(tokens[endIndex])) {
      endIndex--;
    }

    let coreTokens = tokens.slice(startIndex, endIndex + 1);
    if (coreTokens.length === 0) return "";

    // 🔥 ИСПРАВЛЕНИЕ 1: УБИРАЕМ ДУБЛИКАТЫ СЛОВ
    // Превращает "Pink Floyd ... Pink Floyd" в "Pink Floyd"
    const uniqueTokens = Array.from(new Set(coreTokens));

    return uniqueTokens.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  } catch (e) {
    console.error("[SEMANTIC ENGINE ERROR]", e);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl || body.image_url || body.src;
    
    // 🔥 ЗАЩИТА ОТ "БОТЛИВОГО ГАРПУНА": Обрезаем контекст до 100 символов
    const rawAlt = body.altText || body.title || body.context || ""; 
    const altText = rawAlt.slice(0, 100); 

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    let coreSubject = extractSemanticCore(imageUrl);
    
    // 🔥 DOM-ГАРПУН: Если URL слепой, используем alt-текст
    if (!coreSubject && altText) {
      console.log(`[MUTATE] URL слепой. Активирую Гарпун по alt-тексту: "${altText}"`);
      coreSubject = extractSemanticCore(altText); 
    }

    console.log(`[MUTATE] Идентифицирован субъект: "${coreSubject || "СУБЪЕКТ ОТСУТСТВУЕТ (АБСТРАКЦИЯ)"}"`);

    // 2. СКАЧИВАНИЕ КАРТИНКИ (С ЗАЩИТОЙ ОТ ПЕРЕПОЛНЕНИЯ ПАМЯТИ)
    let imageBuffer: ArrayBuffer;
    try {
      const imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(8000)
      });
      
      if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);

      // 🔥 ТИТАНОВЫЙ ЩИТ: Отсекаем картинки тяжелее 5 МБ
      const contentLength = imageRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        throw new Error("Image is too massive (>5MB). Oracle refuses to parse.");
      }

      imageBuffer = await imageRes.arrayBuffer();
    } catch (e: any) {
      console.warn(`[PARSER] Не удалось скачать картинку: ${e.message}. Используем фоллбэк.`);
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic high quality";
      return NextResponse.json({
        query: fallbackVibe,
        smartQuery: fallbackVibe,
        tensor: Array(14).fill(0.5),
        style: "fallback",
        displayVibe: "FALLBACK MODE",
        source: "semantic_only"
      });
    }

    console.log(`[PARSER] Файл захвачен. Байт: ${imageBuffer.byteLength}. Отправка в Оракул...`);

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
      console.warn(`[ORACLE] Ошибка связи с Питонами: ${e.message}. Активируем эвристический фоллбэк.`);
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic high quality";
      return NextResponse.json({
        query: fallbackVibe,
        smartQuery: fallbackVibe,
        tensor: Array(14).fill(0.5),
        style: "fallback",
        displayVibe: "CONNECTION LOST",
        source: "heuristic_fallback"
      });
    }

    const oracleVibe = oracleData.refined_query || oracleData.style || "aesthetic";
    
    const vibeWords = oracleVibe.split(" ").slice(0, 2).join(" ");
    const displayVibe = vibeWords.toUpperCase();

    // 🔥 ИСПРАВЛЕНИЕ 2: ЗАКОН КОРОТКОГО ПОВОДКА
    const gravity = (oracleData.tensor && oracleData.tensor.length > 10) 
      ? oracleData.tensor[10] 
      : 0.5; 

    let finalQuery = oracleVibe;
    if (coreSubject) {
      const subjectWordCount = coreSubject.split(" ").length;

      // Прибиваем гвоздями (кавычками) ТОЛЬКО если гравитация высокая И субъект короткий (до 3 слов)
      if (gravity > 0.6 && subjectWordCount <= 3) {
        finalQuery = `"${coreSubject}" ${oracleVibe}`;
        console.log(`[ORACLE] Высокая гравитация. Короткий субъект (${subjectWordCount} сл.) зафиксирован.`);
      } else {
        // Если гравитация низкая ИЛИ субъект слишком длинный — оставляем мягкий поиск без кавычек
        finalQuery = `${coreSubject} ${oracleVibe}`;
        console.log(`[ORACLE] Гравитация: ${gravity.toFixed(2)}, Слов: ${subjectWordCount}. Мягкое слияние (без кавычек).`);
      }
    }

    console.log(`[MUTATE] Обратная проекция успешна. Запрос: "${finalQuery}"`);

    return NextResponse.json({
      success: true,
      query: finalQuery,
      smartQuery: finalQuery,
      tensor: oracleData.tensor,
      style: oracleData.style,
      displayVibe: displayVibe,
      source: "oracle_math_core"
    });

  } catch (error: any) {
    console.error(`[MUTATE FATAL ERROR]`, error.message);
    return NextResponse.json({ 
      error: error.message, 
      query: "aesthetic vintage", 
      smartQuery: "aesthetic vintage",
      displayVibe: "SYSTEM FAILURE",
      source: "error"
    }, { status: 500 });
  }
}
