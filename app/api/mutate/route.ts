import { NextResponse } from 'next/server';

function extractSubjectFromUrl(url: string): string {
  try {
    const cleanUrl = url.split('?')[0]; 
    const filename = cleanUrl.split('/').pop() || "";
    const subject = filename
      .replace(/\.[^/.]+$/, "") 
      .replace(/[-_]/g, ' ')    
      .trim();
    return subject || "unknown entity";
  } catch {
    return "unknown entity";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Бронебойный перехват URL
    const targetUrl = body.imageUrl || body.image_url || body.url || body.src;

    if (!targetUrl) {
      console.error("[MUTATE API] Ошибка: Фронтенд не прислал URL. Тело запроса:", body);
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    console.log(`[MUTATE] Трансляция пикселей: ${targetUrl}`);

    const oracleUrl = process.env.ORACLE_URL || "https://schiele.onrender.com";
    
    try {
      const oracleRes = await fetch(`${oracleUrl}/api/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: targetUrl, image_url: targetUrl }),
        // ЖДЕМ 30 СЕКУНД: защита от холодного старта Render и долгих загрузок
        signal: AbortSignal.timeout(30000) 
      });

      if (!oracleRes.ok) {
        throw new Error(`Oracle HTTP error: ${oracleRes.status}`);
      }

      const oracleData = await oracleRes.json();
      console.log(`[MUTATE] Успех. Оракул распознал стиль: "${oracleData.style}"`);
      
      return NextResponse.json({ 
        subject: oracleData.style,
        tensor: oracleData.tensor 
      });

    } catch (error: any) {
      console.log(`[MUTATE] Оракул недоступен или сработал таймаут. Фоллбэк. Error: ${error.message}`);
      
      const cleanSubject = extractSubjectFromUrl(targetUrl);
      
      return NextResponse.json({ 
        subject: `${cleanSubject} aesthetic high quality`,
        tensor: [0.5, 0.5, 0.5, 0.5, 0.5] 
      });
    }

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
