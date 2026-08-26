export const maxDuration = 60; // Даем серверу время на парсинг и холодный старт Оракула

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.image_url || body.imageUrl || body.url || body.src;
    let rawTitle = body.title || body.concept || "";

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is strictly required" }, { status: 400 });
    }

    // ==========================================
    // 1. ЛИНГВИСТИКА И ЗАЩИТА ОТ МУСОРА
    // ==========================================
    if (!rawTitle && imageUrl) {
      const filename = imageUrl.split('/').pop() || "";
      // Ловушка для хэшей Pinterest и CDN (если длинно и нет разделителей - это мусор)
      if (filename.length > 18 && !filename.includes('-') && !filename.includes('_')) {
        rawTitle = ""; 
      } else {
        rawTitle = filename;
      }
    }

    // Очищаем от цифр, расширений и параметров
    let cleanTitle = rawTitle
        .split('?')[0]
        .replace(/[-_]/g, ' ')          
        .replace(/\d+/g, '')            
        .replace(/\.jpg|\.png|\.jpeg|\.webp/i, '') 
        .replace(/\s+/g, ' ')           
        .trim();

    // Если осталось одно длинное несвязное слово - удаляем
    if (cleanTitle.length > 15 && !cleanTitle.includes(' ')) {
      cleanTitle = "";
    }

    console.log(`[MUTATE] Трансляция пикселей: ${imageUrl}`);
    console.log(`[MUTATE] Идентифицирован субъект: "${cleanTitle || 'СУБЪЕКТ ОТСУТСТВУЕТ'}"`);

    // ==========================================
    // 2. БИНАРНЫЙ ПАРСИНГ И МАТЕМАТИКА
    // ==========================================
    let baseVibe = "aesthetic"; 
    let tensor = [0.5, 0.5, 0.5, 0.5, 0.5]; 

    try {
      const imageRes = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!imageRes.ok) throw new Error(`Сайт отклонил запрос: ${imageRes.status}`);

      // 🔥 ПРОВЕРКА: Это точно картинка?
      const contentType = imageRes.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Ссылка ведет не на изображение (${contentType})`);
      }

      const arrayBuffer = await imageRes.arrayBuffer();
      console.log(`[PARSER] Файл захвачен (${Math.round(arrayBuffer.byteLength / 1024)}KB). Инъекция в Оракул...`);

  // Разрываем Уробороса: жестко направляем поток в Python-мозг
const oracleUrl = "https://schiele.onrender.com";
      
      // 🔥 УВЕЛИЧЕН ТАЙМАУТ: 50 сек на случай холодного старта Render
      const oracleResponse = await fetch(`${oracleUrl}/api/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arrayBuffer,
        signal: AbortSignal.timeout(50000) 
      });

      if (oracleResponse.ok) {
        const data = await oracleResponse.json();
        if (data.style) baseVibe = data.style;
        // Проверка валидности тензора
        if (Array.isArray(data.tensor) && data.tensor.length === 5) {
          tensor = data.tensor;
        }
        console.log(`[ORACLE] Математика отработала. Стиль: ${baseVibe}`);
      } else {
        const errText = await oracleResponse.text().catch(() => "Unknown");
        console.warn(`[ORACLE] Ошибка HTTP ${oracleResponse.status}: ${errText}`);
      }
    } catch (e: any) {
      console.warn(`[MUTATE] Сбой сети или Оракула. Фоллбэк активирован: ${e.message}`);
    }

    // ==========================================
    // 3. СБОРКА И ВОЗВРАТ
    // ==========================================
    const smartQuery = cleanTitle ? `${cleanTitle} ${baseVibe}` : `${baseVibe} vintage high quality`;

    console.log(`[MUTATE] Обратная проекция: "${smartQuery}"`);

    return NextResponse.json({
      success: true,
      smartQuery: smartQuery,
      displayVibe: baseVibe.toUpperCase(),
      tensor: tensor,
      source: "oracle"
    });

  } catch (error: any) {
    console.error("[MUTATE CRITICAL ERROR]", error);
    return NextResponse.json({ 
      error: "Mutation failed", 
      smartQuery: "aesthetic vintage high quality", 
      displayVibe: "SYSTEM ERROR",
      tensor: [0.5, 0.5, 0.5, 0.5, 0.5]
    }, { status: 500 });
  }
}
