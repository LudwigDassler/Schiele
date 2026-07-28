export function checkNsfw(text: string): boolean {
  if (!text) return false;
  let lower = text.toLowerCase();
  
  // 1. Безопасные фразы (False Positives)
  const safePhrases = [
    "nude lipstick", "nude palette", "nude makeup", "nude color", "nude nails", 
    "nude dress", "nude shoes", "nude heels", "nude tone", "nude shade", "nude art",
    "sex pistols", "sexy outfit", "sexy dress", "nude pink", "nude aesthetic"
  ];
  
  // Вырезаем безопасные фразы из текста
  for (const phrase of safePhrases) {
    lower = lower.replace(new RegExp(phrase, 'gi'), '');
  }

  // 2. Английские триггеры (строго по границам слов, чтобы Sussex не блочился из-за sex)
  const engKeywords = ["nsfw", "porn", "nude", "sex", "pussy", "dick", "boobs", "tits", "hentai", "rule34", "xxx"];
  const engRegex = new RegExp(`\\b(${engKeywords.join('|')})\\b`, 'i');
  if (engRegex.test(lower)) return true;

  // 3. Русские триггеры (без строгих границ, так как приставки меняют форму)
  const rusKeywords = ["порно", "пизда", "хуй", "сиськи", "эротика", "голая", "18+", "член", "порнуха"];
  return rusKeywords.some(kw => lower.includes(kw));
}