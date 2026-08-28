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
    
    // 🔥 ЭТАП 2: ЗАЩИТА ОТ ХЭШЕЙ (Pinterest/CDN мусор)
    // Если имя файла - это просто длинная строка из букв и цифр без пробелов
    if (/^[a-f0-9]{10,}$/i.test(withoutExt) || /^[a-zA-Z0-9_-]{15,}$/.test(withoutExt)) {
      return ""; // Это машинный идентификатор, а не смысл. Убиваем.
    }

    // 4. Чистка: убираем разделители, ВСЕ цифры и одиночные 'x' (спасает от "2048x2048")
    const textOnly = withoutExt
      .replace(/[-_+]/g, " ")       // Заменяем разделители на пробелы
      .replace(/[0-9]+/g, " ")      // Удаляем все цифры (годы, размеры)
      .replace(/\b[xX]\b/g, " ");   // Удаляем оставшиеся одиночные 'x'

    const tokens = textOnly.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (tokens.length === 0) return "";

    // 5. Откусываем SEO-мусор СЛЕВА (Префиксы)
    let startIndex = 0;
    while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) {
      startIndex++;
    }

    // 6. Откусываем SEO-мусор СПРАВА (Суффиксы)
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
    
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    // 🔥 1. ВЫЧИСЛЯЕМ КРИСТАЛЬНЫЙ СУБЪЕКТ (Локально, мгновенно)
    const coreSubject = extractSemanticCore(imageUrl);
    console.log(`[MUTATE] Идентифицирован субъект: "${coreSubject || "СУБЪЕКТ ОТСУТСТВУЕТ"}"`);

    // 2. СКАЧИВАЕМ КАРТИНКУ ДЛЯ ОРАКУЛА (С таймаутом!)
    let imageBuffer: ArrayBuffer;
    try {
      const imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(8000) // 8 секунд на скачивание
      });
      if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);
      imageBuffer = await imageRes.arrayBuffer();
    } catch (e: any) {
      console.warn(`[PARSER] Не удалось скачать картинку для анализа: ${e.message}. Используем фоллбэк.`);
      // Если картинка не скачалась, возвращаем хотя бы чистый субъект
      return NextResponse.json({
        success: true,
        query: coreSubject ? `${coreSubject} aesthetic vintage` : "aesthetic vintage high quality",
        smartQuery: coreSubject ? `${coreSubject} aesthetic vintage` : "aesthetic vintage high quality",
        tensor: [0.5, 0.5, 0.5, 0.5, 0.5],
        style: "unknown",
        displayVibe: coreSubject ? coreSubject.toUpperCase() : "AESTHETIC",
        source: "semantic_only"
      });
    }

    console.log(`[PARSER] Файл захвачен. Байт: ${imageBuffer.byteLength}. Отправка в Оракул...`);

    // 3. ОТПРАВЛЯЕМ В ПИТОН (С таймаутом!)
    const ORACLE_URL = process.env.ORACLE_URL || "https://kashmir-oracle.onrender.com/api/mutate";
    
    let oracleData: any;
    try {
      const oracleRes = await fetch(ORACLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: imageBuffer,
        signal: AbortSignal.timeout(15000) // 15 секунд на расчеты (холодный старт)
      });

      if (!oracleRes.ok) throw new Error(`Oracle HTTP ${oracleRes.status}`);
      
      oracleData = await oracleRes.json();
      if (oracleData.status === "error") throw new Error(oracleData.message || "Oracle logic error");

    } catch (e: any) {
      console.warn(`[ORACLE] Ошибка связи с Питонами: ${e.message}. Активируем эвристический фоллбэк.`);
      
      // Фоллбэк: просто возвращаем субъект + дефолтный стиль
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic high quality";
      return NextResponse.json({
        success: true,
        query: fallbackVibe,
        smartQuery: fallbackVibe,
        tensor: [0.5, 0.5, 0.5, 0.5, 0.5],
        style: "fallback",
        displayVibe: "HEURISTIC MODE",
        source: "heuristic_fallback"
      });
    }

    // 4. СШИВАЕМ ФИНАЛЬНЫЙ ЗАПРОС
    // Приоритет: refined_query (умный) > style (простой) > "aesthetic"
    const oracleVibe = oracleData.refined_query || oracleData.style || "aesthetic";
    
    // Логика сборки: "Субъект" + "Стиль/Описание"
    // Пример: "Pink Floyd" + "cinematic chaotic aesthetic" -> "Pink Floyd cinematic chaotic aesthetic"
    const finalQuery = coreSubject ? `${coreSubject} ${oracleVibe}` : oracleVibe;

    console.log(`[ORACLE] Математика отработала. Стиль: ${oracleData.style}, Тензор: ${JSON.stringify(oracleData.tensor)}`);
    console.log(`[MUTATE] Обратная проекция успешна. Запрос: "${finalQuery}"`);

    return NextResponse.json({
      success: true,
      query: finalQuery,          // Для совместимости
      smartQuery: finalQuery,     // Дубль
      tensor: oracleData.tensor,
      style: oracleData.style,
      displayVibe: (oracleData.style || "UNKNOWN").toUpperCase(), // Для UI
      source: "oracle_math_core"
    });

  } catch (error: any) {
    console.error(`[MUTATE FATAL ERROR]`, error.message);
    return NextResponse.json({ 
      error: error.message, 
      query: "aesthetic vintage", 
      smartQuery: "aesthetic vintage",
      displayVibe: "SYSTEM ERROR"
    }, { status: 500 });
  }
}
