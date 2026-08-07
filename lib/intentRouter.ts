// Роутер намерений Kashmir.
//
// Идея: не гонять КАЖДЫЙ поисковый запрос через Groq. Сухие фактические
// запросы (название альбома, дата релиза, состав группы) летят напрямую
// в Bing без творческой обработки — быстро и бесплатно. Только запросы
// с признаками "вайба" будят личность Kashmir.
//
// Сознательно НЕ нейронка: классификатор нужен именно для того, чтобы
// избежать сетевого похода на простых запросах. Вызывать ради этого ещё
// одну LLM — значит платить тем же временем и деньгами, которые пытаемся
// сэкономить, просто в два конца вместо одного.

const FACT_SIGNALS = [
  /\b(релиз|альбом|дискограф|трек-?лист|дата выход|когда вышел|состав группы|биограф)\b/i,
  /\b(release date|tracklist|discography|album|lineup|wikipedia)\b/i,
  /\b(19|20)\d{2}\b/, // года почти всегда означают фактический поиск
  /^".+"$/, // запрос в кавычках — явное намерение точного совпадения
];

const VIBE_SIGNALS = [
  /\b(вайб|настроен|атмосфер|мрачн|уютн|меланхол|ностальг|туман|закат|заброшен|эстетик)\b/i,
  /\b(vibe|mood|atmospheric|melancholic|liminal|dreamy|aesthetic|cinematic)\b/i,
];

export type Intent = "fast" | "kashmir";

export function classifyIntent(query: string): Intent {
  const q = query.trim();
  if (!q) return "fast";

  let score = 0;
  if (FACT_SIGNALS.some((rx) => rx.test(q))) score -= 2;
  if (VIBE_SIGNALS.some((rx) => rx.test(q))) score += 2;

  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 2) score -= 1; // короткое — обычно имя/сущность
  if (wordCount >= 6) score += 1; // длинное описательное — обычно вайб

  // Ничья уходит в дешёвую сторону: цена ошибки "не разбудили Kashmir" —
  // копейки, цена ошибки "Kashmir переписал точный запрос" — релевантность.
  return score > 0 ? "kashmir" : "fast";
}
