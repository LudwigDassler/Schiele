import { NextResponse } from "next/server";
import Tesseract from 'tesseract.js';

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

function extractSemanticCore(input: string): string {
  if (!input) return "";
  
  try {
    let text = input.startsWith("http") 
      ? decodeURIComponent(input).split('/').pop()?.split(/[?#]/)[0] || ""
      : input;

    const withoutExt = text.replace(/\.[a-zA-Z0-9]+$/, "");
    
    // БРОНЯ ОТ ХЭШ-ШИЗОФРЕНИИ
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

    const coreTokens = tokens.slice(startIndex, endIndex + 1);
    if (coreTokens.length === 0) return "";

    // Убиваем дубликаты слов (например: Pink Floyd ... Pink Floyd)
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
    
    // DOM-ГАРПУН
    const rawAlt = body.altText || body.title || body.context || ""; 
    const altText = rawAlt.slice(0, 100); 

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);

    // 1. ИЗВЛЕКАЕМ БАЗОВЫЙ СУБЪЕКТ
    let coreSubject = extractSemanticCore(imageUrl);
    if (!coreSubject && altText) {
      console.log(`[MUTATE] URL слепой. Активирую Гарпун по alt: "${altText}"`);
      coreSubject = extractSemanticCore(altText); 
    }

    // 2. СКАЧИВАНИЕ (С ТИТАНОВЫМ ЩИТОМ НА 5 МБ)
    let imageBuffer: ArrayBuffer;
    try {
      const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
      if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);

      const contentLength = imageRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        throw new Error("Image > 5MB. Oracle refuses to parse.");
      }
      imageBuffer = await imageRes.arrayBuffer();
    } catch (e: any) {
      console.warn(`[PARSER] Скачивание не удалось: ${e.message}. Фоллбэк.`);
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic";
      return NextResponse.json({
        query: fallbackVibe, smartQuery: fallbackVibe,
        tensor: Array(14).fill(0.5), style: "fallback",
        displayVibe: "FALLBACK MODE", source: "semantic_only"
      });
    }

    console.log(`[PARSER] Файл захвачен. Байт: ${imageBuffer.byteLength}. Параллельный запуск OCR и Оракула...`);

    // ==========================================
    // 3. ПАРАЛЛЕЛЬНОЕ ВЫПОЛНЕНИЕ: OCR (Node) + TENSOR (Python)
    // ==========================================
    
    // ПОТОК А: Распознавание текста (Tesseract.js)
    const ocrPromise = Tesseract.recognize(Buffer.from(imageBuffer), 'eng')
      .then(({ data: { text } }) => {
        const cleanText = text.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const words = cleanText.split(' ').filter(w => w.length > 2).slice(0, 3);
        if (words.length === 0) return "";
        const readText = words.map(w => w.charAt(0).toUpperCase() + w.toLowerCase().slice(1)).join(" ");
        console.log(`[OCR] Символический Глаз прочитал: "${readText}"`);
        return readText;
      })
      .catch(e => {
        console.warn("[OCR ERROR] Сбой распознавания:", e.message);
        return "";
      });

    // ПОТОК Б: Математика Оракула (Python)
    const ORACLE_URL = process.env.ORACLE_URL || "https://kashmir-oracle.onrender.com/api/mutate";
    const oraclePromise = fetch(ORACLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: imageBuffer,
      signal: AbortSignal.timeout(15000)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    // Дожидаемся обоих процессов
    let ocrText = "";
    let oracleData: any = null;

    try {
      const results = await Promise.allSettled([ocrPromise, oraclePromise]);
      ocrText = results[0].status === 'fulfilled' ? results[0].value : "";
      
      if (results[1].status === 'fulfilled') {
        oracleData = results[1].value;
        if (oracleData.status === "error") throw new Error(oracleData.message);
      } else {
        throw new Error(results[1].reason);
      }
    } catch (e: any) {
      console.warn(`[ORACLE] Ошибка Питона: ${e.message}. Фоллбэк.`);
      const fallbackVibe = coreSubject ? `${coreSubject} aesthetic` : "vintage aesthetic";
      return NextResponse.json({
        query: fallbackVibe, smartQuery: fallbackVibe,
        tensor: Array(14).fill(0.5), style: "fallback",
        displayVibe: "CONNECTION LOST", source: "heuristic_fallback"
      });
    }

    // ==========================================
    // 4. СИНТЕЗ ФИНАЛЬНОГО ЗАПРОСА
    // ==========================================
    const oracleVibe = oracleData.refined_query || oracleData.style || "aesthetic";
    const displayVibe = oracleVibe.split(" ").slice(0, 2).join(" ").toUpperCase();
    
    // Гравитация (защита от падения старого API)
    const gravity = (oracleData.tensor && oracleData.tensor.length > 10) ? oracleData.tensor[10] : 0.5; 

    // 🔥 АБСОЛЮТНЫЙ ЯКОРЬ: Семантика -> Гарпун -> Прочитанный Текст
    const finalSubject = coreSubject || ocrText;

    let finalQuery = oracleVibe;
    if (finalSubject) {
      const subjectWordCount = finalSubject.split(" ").length;

      // Прибиваем гвоздями ТОЛЬКО короткие субъекты при высокой гравитации
      if (gravity > 0.6 && subjectWordCount <= 3) {
        finalQuery = `"${finalSubject}" ${oracleVibe}`;
        console.log(`[ORACLE] Высокая гравитация. Зафиксирован субъект: "${finalSubject}"`);
      } else {
        finalQuery = `${finalSubject} ${oracleVibe}`;
        console.log(`[ORACLE] Гравитация: ${gravity.toFixed(2)}, Слов: ${subjectWordCount}. Мягкое слияние.`);
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
      query: "aesthetic vintage", smartQuery: "aesthetic vintage",
      displayVibe: "SYSTEM FAILURE", source: "error"
    }, { status: 500 });
  }
}
