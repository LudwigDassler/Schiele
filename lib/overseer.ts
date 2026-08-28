// lib/overseer.ts
// Байесовская Гильотина + Семантический Очиститель (Semantic Cleaver)

const TRUSTED_DOMAINS = [
  "pinterest.com", "tumblr.com", "behance.net", 
  "artstation.com", "flickr.com", "deviantart.com", 
  "unsplash.com", "pxhere.com", "wallhaven.cc", "reddit.com"
];

const TRASH_DOMAINS = [
  "shutterstock.com", "istockphoto.com", "alamy.com", 
  "123rf.com", "vectorstock.com", "dreamstime.com", 
  "depositphotos.com", "gettyimages.com", "freepik.com",
  "pngtree.com", "cleanpng.com"
];

const SEO_NOISE_REGEX = /(hd|4k|8k|download|free|stock|wallpaper|vector|clipart)/i;
const HONEST_FORMATS_REGEX = /\.(png|webp)$/i; 
const VECTOR_TRAP_REGEX = /\.(eps|ai|svg)$/i;  

// ==========================================
// СЛОВАРЬ ЛИНГВИСТИЧЕСКОГО МУСОРА ДЛЯ ОЧИСТКИ ТАЙТЛОВ
// ==========================================
const LINGUISTIC_NOISE = new Set([
  "hd", "4k", "8k", "hq", "high", "quality", "resolution", "1080p", "fullhd",
  "wallpaper", "wallpapers", "background", "backgrounds", "desktop", "mobile", 
  "image", "images", "photo", "photos", "pic", "picture", "pictures", "screen",
  "art", "artwork", "vector", "svg", "png", "jpg", "jpeg", "comp", "render",
  "free", "download", "stock", "gallery", "music", "bands", "promo", "official",
  "clipart", "royalty"
]);

export interface ArtifactMetrics {
  prior: number;
  likelihood: number;
  entropyPenalty: number;
  finalScore: number;
}

function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const freq: Record<string, number> = {};
  
  for (let i = 0; i < len; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Семантический хирург: вырезает суть из грязного названия
function purifyTitle(rawTitle: string): string {
  if (!rawTitle) return "Aesthetic";

  // 1. Убиваем суффиксы после разделителей (обычно это названия сайтов вроде " | Pinterest")
  let cleanStr = rawTitle.split(/\||—| - | ~ /)[0].trim();

  // 2. Убираем спецсимволы и цифры, оставляя только текст
  cleanStr = cleanStr.replace(/[-_+,]/g, " ").replace(/[0-9]+/g, " ");
  
  // 3. Токенизируем
  const tokens = cleanStr.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (tokens.length === 0) return "Aesthetic";

  // 4. Откусываем SEO-мусор СЛЕВА (Префиксы)
  let startIndex = 0;
  while (startIndex < tokens.length && LINGUISTIC_NOISE.has(tokens[startIndex])) {
    startIndex++;
  }

  // 5. Откусываем SEO-мусор СПРАВА (Суффиксы)
  let endIndex = tokens.length - 1;
  while (endIndex >= startIndex && LINGUISTIC_NOISE.has(tokens[endIndex])) {
    endIndex--;
  }

  const coreTokens = tokens.slice(startIndex, endIndex + 1);
  if (coreTokens.length === 0) return "Aesthetic";

  // Возвращаем с заглавной буквы для красоты
  return coreTokens.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function bayesianGuillotine(artifacts: any[]): any[] {
  const POSTERIOR_THRESHOLD = 0.30;

  // Используем reduce, чтобы одновременно фильтровать мусор и мутировать (очищать) выживших
  return artifacts.reduce((survivors: any[], artifact) => {
    const url = artifact.link || artifact.src || "";
    const lowerUrl = url.toLowerCase();
    const rawTitle = artifact.title || "";
    const lowerTitle = rawTitle.toLowerCase();
    
    const metrics: ArtifactMetrics = {
      prior: 0.5,
      likelihood: 0.8,
      entropyPenalty: 1.0,
      finalScore: 0
    };

    // ФАКТОР 1: PRIOR
    const domainMatch = lowerUrl.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    const baseDomain = domainMatch ? domainMatch[1] : "";

    if (TRUSTED_DOMAINS.some(d => baseDomain.includes(d))) {
      metrics.prior = 0.9; 
      metrics.likelihood = 0.9; 
    } else if (TRASH_DOMAINS.some(d => baseDomain.includes(d))) {
      metrics.prior = 0.1; 
      metrics.likelihood = 0.1;
    } else if (baseDomain.includes('blogspot') || baseDomain.includes('wordpress')) {
      metrics.prior = 0.6; 
    }

    // ФАКТОР 2: LIKELIHOOD
    if (metrics.prior >= 0.9) {
      if (VECTOR_TRAP_REGEX.test(lowerUrl)) metrics.likelihood = 0.2; 
    } else {
      if (SEO_NOISE_REGEX.test(lowerTitle) || SEO_NOISE_REGEX.test(lowerUrl)) {
        metrics.likelihood = 0.2; 
      }
      if (HONEST_FORMATS_REGEX.test(lowerUrl)) {
        metrics.likelihood = Math.min(1.0, metrics.likelihood + 0.2);
      }
      if (VECTOR_TRAP_REGEX.test(lowerUrl)) {
        metrics.likelihood = 0.1;
      }
    }

    // ФАКТОР 3: ENTROPY
    const urlEntropy = calculateShannonEntropy(baseDomain.split('.')[0]);
    if (urlEntropy > 3.8) {
      metrics.entropyPenalty = 0.5; 
    }

    // СУД
    metrics.finalScore = metrics.prior * metrics.likelihood * metrics.entropyPenalty;

    if (process.env.NODE_ENV === 'development' && metrics.finalScore < POSTERIOR_THRESHOLD) {
      console.log(`[GUILLOTINE] ❌ Казнь: ${baseDomain} | Score: ${metrics.finalScore.toFixed(3)}`);
    }

    // ЕСЛИ ВЫЖИЛ — ОЧИЩАЕМ И ПУСКАЕМ В ЛЕНТУ
    if (metrics.finalScore >= POSTERIOR_THRESHOLD) {
      // Подменяем грязный тайтл на кристально чистый
      const aestheticTitle = purifyTitle(rawTitle);
      
      survivors.push({
        ...artifact,
        title: aestheticTitle // Передаем на фронт красоту
      });
    }

    return survivors;
  }, []);
}
