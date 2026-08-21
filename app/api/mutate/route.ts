import { NextResponse } from 'next/server';

// ==========================================
// 🕸 ЯДРО: WIKIDATA KNOWLEDGE GRAPH PARSER
// ==========================================

const COMMON_STOP_WORDS = new Set([
  'human', 'male', 'female', 'work', 'image', 'file', 'common', 
  'wikimedia', 'instance', 'property', 'item', 'country', 'world'
]);

async function fetchWikidataContext(entityName: string) {
  try {
    // 1. Поиск сущности (получаем Q-ID)
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entityName)}&language=en&format=json&limit=1`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.search || searchData.search.length === 0) return null;
    
    const entityId = searchData.search[0].id;
    console.log(`[GRAPH] Found entity: ${entityId} (${entityName})`);

    // 2. Получаем полные данные сущности
    const detailsUrl = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    const entity = detailsData.entities[entityId];
    if (!entity) return null;

    // 3. Сбор Q-кодов из ключевых свойств
    const qIdsToFetch = new Set<string>();
    
    const extractQIds = (propertyCode: string) => {
      if (entity.claims[propertyCode]) {
        entity.claims[propertyCode].forEach((claim: any) => {
          const id = claim.mainsnak?.datavalue?.value?.id;
          if (id && !qIdsToFetch.has(id)) qIdsToFetch.add(id);
        });
      }
    };

    extractQIds('P31');  // Instance of
    extractQIds('P106'); // Occupation
    extractQIds('P136'); // Genre
    extractQIds('P178'); // Developer
    extractQIds('P577'); // Publication date

    const tags = new Set<string>();
    tags.add(entityName.toLowerCase());

    // 4. ПАКЕТНЫЙ ЗАПРОС ЛЕЙБЛОВ
    if (qIdsToFetch.size > 0) {
      const qIdsString = Array.from(qIdsToFetch).join('|');
      const labelsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qIdsString}&props=labels&languages=en&format=json`;
      const labelsRes = await fetch(labelsUrl);
      const labelsData = await labelsRes.json();

      Object.values(labelsData.entities).forEach((qEntity: any) => {
        const label = qEntity.labels?.en?.value?.toLowerCase();
        if (label && !COMMON_STOP_WORDS.has(label) && label.length > 2) {
          tags.add(label);
        }
      });
    }

    // 5. FALLBACK: Википедия для "вкуса"
    if (tags.size < 3) {
      try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entityName)}`;
        const wikiRes = await fetch(wikiUrl);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const descWords = (wikiData.extract || "").split(/\s+/).slice(0, 15);
          descWords.forEach((w: string) => {
            const clean = w.replace(/[^a-z]/gi, '').toLowerCase();
            if (clean.length > 3 && !COMMON_STOP_WORDS.has(clean)) tags.add(clean);
          });
        }
      } catch (e) { 
        console.error("[WIKI SUMMARY ERROR]", e);
      }
    }

    return Array.from(tags);

  } catch (error) {
    console.error("[WIKIDATA ERROR]", error);
    return null;
  }
}

// ==========================================
// 🧠 ЛОГИКА СИНТЕЗА ВАЙБА
// ==========================================

function generateVibeFromTags(title: string, tags: string[] | null) {
  const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();

  if (!tags || tags.length === 0) {
    return {
      searchQuery: `${cleanTitle} aesthetic high quality`,
      displayVibe: "UNKNOWN RESONANCE"
    };
  }

  const lowerTags = tags.map(t => t.toLowerCase());
  
  const isMusic = lowerTags.some(t => ['rock', 'jazz', 'punk', 'music', 'band', 'guitarist', 'singer', 'electronic', 'hip hop'].some(g => t.includes(g)));
  const isScience = lowerTags.some(t => ['physicist', 'scientist', 'mathematics', 'astronomy', 'chemistry'].some(s => t.includes(s)));
  const isCinema = lowerTags.some(t => ['film', 'actor', 'director', 'movie', 'cinema'].some(c => t.includes(c)));
  const isArt = lowerTags.some(t => ['painter', 'artist', 'sculptor', 'art movement'].some(a => t.includes(a)));

  let coreConcept = "";
  let styleSuffix = "aesthetic"; 

  if (isMusic) {
    coreConcept = lowerTags.find(t => ['rock', 'jazz', 'punk', 'metal', 'electronic'].includes(t)) || "music";
    styleSuffix = "vintage concert photography poster";
  } else if (isScience) {
    coreConcept = "science history";
    styleSuffix = "vintage portrait archive";
  } else if (isCinema) {
    coreConcept = "cinema";
    styleSuffix = "film still cinematography";
  } else if (isArt) {
    coreConcept = lowerTags.find(t => t.includes('art') || t.includes('ism')) || "art";
    styleSuffix = "masterpiece gallery texture";
  }

  const queryParts = [cleanTitle];
  if (coreConcept) queryParts.push(coreConcept);
  
  const uniqueTags = lowerTags.filter(t => 
    t !== cleanTitle.toLowerCase() && 
    t !== coreConcept && 
    !COMMON_STOP_WORDS.has(t) &&
    t.length > 4
  ).slice(0, 2);
  
  queryParts.push(...uniqueTags);
  queryParts.push(styleSuffix);

  const searchQuery = queryParts.join(' ').trim();

  const vibeWords = [];
  if (isMusic) vibeWords.push("SONIC");
  else if (isScience) vibeWords.push("ATOMIC");
  else if (isCinema) vibeWords.push("CINEMATIC");
  else if (isArt) vibeWords.push("AESTHETIC");
  else vibeWords.push("VISUAL");

  if (coreConcept && coreConcept !== "music" && coreConcept !== "science" && coreConcept !== "cinema") {
    vibeWords.push(coreConcept.split(' ')[0].toUpperCase());
  } else {
    vibeWords.push("RESONANCE");
  }

  const displayVibe = vibeWords.join(' ');

  return { searchQuery, displayVibe };
}

// ==========================================
// 🚀 API ROUTE
// ==========================================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_url, title } = body;

    // Если ты передаешь concept (в старом коде), проверяем и его
    const targetTitle = title || body.concept || (image_url ? image_url.split('/').pop() : "");

    if (!targetTitle) {
      return NextResponse.json({ error: "Title or Image URL required" }, { status: 400 });
    }

    console.log(`[MUTATE] Starting Knowledge Graph extraction for: "${targetTitle}"`);

    let tags = null;
    if (targetTitle && targetTitle.length > 2) {
       tags = await fetchWikidataContext(targetTitle);
       if (tags) {
         console.log(`[MUTATE] Wikidata found tags:`, tags);
       }
    }

    const result = generateVibeFromTags(targetTitle, tags);

    console.log(`[MUTATE] Generated -> Query: "${result.searchQuery}", Display: "${result.displayVibe}"`);

    return NextResponse.json({
      success: true,
      smartQuery: result.searchQuery,
      displayVibe: result.displayVibe,
      source: tags ? 'wikidata' : 'fallback-heuristic'
    });

  } catch (error: any) {
    console.error("[MUTATE CRITICAL ERROR]", error);
    return NextResponse.json({ 
      error: "Mutation failed", 
      smartQuery: "aesthetic vintage high quality", 
      displayVibe: "SYSTEM ERROR" 
    }, { status: 500 });
  }
}
