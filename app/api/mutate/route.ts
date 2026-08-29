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
  "clipart", "royalty", "live", "concert", "poster", "archives", "credit"
]);

function extractSemanticCore(input: string): string {
  if (!input) return "";
  
  try {
    // 1. Если это URL — вытаскиваем имя файла
    let text = input.startsWith("http") 
      ? decodeURIComponent(input).split('/').pop()?.split(/[?#]/)[0] || ""
      : input;

    const withoutExt = text.replace(/\.[a-zA-Z0-9]+$/, "");
    
    // 🔥 ИСПРАВЛЕННАЯ БРОНЯ ОТ ХЭШ-ШИЗОФРЕНИИ
    // Удаляем ТОЛЬКО если это сплошной hex-хэш (a-f + 0-9) без тире.
    // Сначала убираем разделители для проверки.
    const cleanForCheck = withoutExt.replace(/[-_]/g, '');
    
    // Если строка > 10 символов и состоит ТОЛЬКО из hex-символов (0-9, a-f) — это мусорный хэш.
    // Наличие букв g-z автоматически спасает строку (это настоящие слова).
    if (cleanForCheck.length > 10 && /^[a-f0-9]+$/i.test(cleanForCheck)) {
      return ""; 
    }

    // 2. Чистка: убираем разделители, цифры и одиночные 'x'
    const textOnly = withoutExt
      .replace(/[-_+]/g, " ")
      .replace(/[0-9]+/g, " ")
      .replace(/\b[xX]\b/g, " ");

    const tokens = textOnly.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (tokens.length === 0) return "";

    // 3. Откусываем SEO-мусор СЛЕВА
    let startIndex = 0;
    while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) {
      startIndex++;
    }

    // 4. Откусываем SEO-мусор СПРАВА
    let endIndex = tokens.length - 1;
    while (endIndex >= startIndex && LINGUISTIC_NOISE.has(tokens[endIndex])) {
      endIndex--;
    }

    const coreTokens = tokens.slice(startIndex, endIndex + 1);
    if (coreTokens.length === 0) return "";

    // Возвращаем с Заглавной Буквы
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
    
    // 🔥 ЗАЩИТА ОТ "БОТЛИВОГО ГАРПУНА": Обрезаем контекст до 100 символов
    const rawAlt = body.altText || body.title || body.context || ""; 
    const altText = rawAlt.slice(0, 100); 

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    // 1. Пытаемся вытащить субъект из URL (теперь умно)
    let coreSubject = extractSemanticCore(imageUrl);
    
    // 2. DOM-ГАРПУН: Если URL слепой, используем alt-текст
    if (!coreSubject && altText) {
      console.log(`[MUTATE] URL слепой. Активирую Гарпун по alt-тексту: "${altText}"`);
      coreSubject = extractSemanticCore(altText); 
    }

    console.log(`[MUTATE] Идентифицирован субъект: "${coreSubject || "СУБЪЕКТ ОТСУТСТВУЕТ (АБСТРАКЦИЯ)"}"`);

    // 3. СКАЧИВАНИЕ КАРТИНКИ (С ЗАЩИТОЙ ОТ ПЕРЕПОЛНЕНИЯ ПАМЯТИ)
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
    
    // Формируем красивый заголовок для UI (первые 2 слова)
    const vibeWords = oracleVibe.split(" ").slice(0, 2).join(" ");
    const displayVibe = vibeWords.toUpperCase();

    // ФИЗИКА ГРАВИТАЦИИ
    const gravity = (oracleData.tensor && oracleData.tensor.length > 10) 
      ? oracleData.tensor[10] 
      : 0.5; 

    let finalQuery = oracleVibe;
    if (coreSubject) {
      if (gravity > 0.6) {
        // ВЫСОКАЯ ГРАВИТАЦИЯ: Жесткая фиксация субъекта
        finalQuery = `"${coreSubject}" ${oracleVibe}`;
        console.log(`[ORACLE] Высокая гравитация (${gravity.toFixed(2)}). Субъект зафиксирован.`);
      } else {
        // НИЗКАЯ ГРАВИТАЦИЯ: Мягкое слияние
        finalQuery = `${coreSubject} ${oracleVibe}`;
        console.log(`[ORACLE] Низкая гравитация (${gravity.toFixed(2)}). Мягкое слияние.`);
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
