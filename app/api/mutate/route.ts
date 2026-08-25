import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Извлекаем URL, системный title и concept (кристально чистый оригинальный запрос)
    const { image_url, title, concept } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is strictly required for Tensor Mutation" }, { status: 400 });
    }

    // ==========================================
    // 1. ИЕРАРХИЯ ПАМЯТИ
    // Если фронтенд передал изначальный запрос (concept), он становится абсолютным приоритетом.
    // Если его нет, пытаемся вытащить смысл из title или хотя бы из URL.
    // ==========================================
    let rawSubject = concept || title || image_url.split('/').pop() || "";

    // ==========================================
    // 2. ГИЛЬОТИНА ДЛЯ SEO-МУСОРА И ХЭШЕЙ
    // Порядок критически важен для правильного парсинга слипшихся строк
    // ==========================================
    let cleanSubject = rawSubject
        .replace(/[-_]/g, ' ') // 1. Дефисы и подчеркивания в пробелы
        .replace(/\.(jpg|jpeg|png|webp|gif)/gi, '') // 2. Уничтожаем расширения
        .replace(/[0-9a-fA-F]{10,}/g, ' ') // 3. Вырезаем крипто-хэши до обработки цифр
        .replace(/\d+/g, ' ') // 4. Цифры в пробелы (чтобы "1080xN" распалось на " " и "xN")
        .replace(/\b(original|movie|film|poster|hd|hq|hqdefault|maxresdefault|wallpaper|size|large|il|xn|hotj|buy|shop)\b/gi, ' ') // 5. Точечный расстрел SEO-спама
        .replace(/\s+/g, ' ') // 6. Схлопываем образовавшиеся пустоты
        .trim();

  // ==========================================
    // 3. СЕМАНТИЧЕСКИЙ ДЕДУПЛИКАТОР
    // ==========================================
    if (cleanSubject) {
        // Явно указываем TypeScript, что w - это строка (w: string)
        const words = String(cleanSubject).split(' ').filter((w: string) => w.length > 1); 
        const uniqueWords = [...new Set(words.map((w: string) => w.toLowerCase()))];
        cleanSubject = uniqueWords.join(' ');
    }

    // Если после всех зачисток осталась пустота, отдаем управление чистой математике
    if (cleanSubject.length < 3) {
      cleanSubject = "";
    }

    console.log(`[MUTATE] Трансляция пикселей: ${image_url}`);
    console.log(`[MUTATE] Кристаллизованный субъект: "${cleanSubject || 'АБСТРАКТНАЯ МАТЕМАТИКА'}"`);

    // ==========================================
    // 4. ТРАНСЛЯЦИЯ В ТЕНЗОРНОЕ ПРОСТРАНСТВО (ОРАКУЛ)
    // ==========================================
    try {
      const oracleResponse = await fetch('https://kashmir-oracle.onrender.com/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: image_url, title: cleanSubject }),
        signal: AbortSignal.timeout(6000) // 6 секунд таймаута для тяжелых визуальных артефактов
      });

      if (oracleResponse.ok) {
        const data = await oracleResponse.json();
        return NextResponse.json(data);
      } else {
        throw new Error(`Oracle HTTP error: ${oracleResponse.status}`);
      }
    } catch (oracleError) {
      console.warn("[MUTATE] Оракул недоступен или сработал таймаут. Активация эвристического фоллбэка.", oracleError);
      // МЯГКИЙ ФОЛЛБЭК: Фронтенд не падает, а генерирует запрос на лету
      const fallbackQuery = cleanSubject ? `${cleanSubject} aesthetic high quality` : "aesthetic vintage high quality";
      return NextResponse.json({ 
        success: true, 
        smartQuery: fallbackQuery, 
        displayVibe: "RESONANCE: FALLBACK", 
        source: "heuristic" 
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Mutation failed" }, { status: 500 });
  }
}
