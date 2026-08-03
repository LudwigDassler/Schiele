export class KashmirEngine {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
    }

    public async processQuery(rawQuery: string): Promise<string> {
        const query = rawQuery.trim();
        if (!query) return "aesthetic";

        if (!this.apiKey) {
            console.warn("[Kashmir] GROQ_API_KEY is missing. Using fallback.");
            return `${query} aesthetic`.trim();
        }

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    temperature: 0.3,
                    messages: [
                        {
                            role: "system",
                            content: `You are Kashmir, an elite aesthetic visual archivist engine.
Your ONLY purpose is to take a user's raw search query and transform it into a highly optimized English query for an image search engine (like Pinterest).

CRITICAL RULES:
1. NO CONVERSATION. NEVER say "Here is the query" or "I translated it". Output ONLY the final search string.
2. CULTURAL CONTEXT: If the user types specific bands or phenomena (e.g., "ГрОб", "Гражданская оборона", "КиШ", "Led Zeppelin", "Nirvana"), identify them correctly. Do NOT translate them literally. Append "band aesthetic vintage photography". (Example: "ГрОб" -> "Grazhdanskaya Oborona punk band aesthetic").
3. MOVIES/ART: If it's a movie (e.g., "Луна 2112"), output "[English Title] movie aesthetic screencaps".
4. GENERAL: If it's a mood or concept in Russian, translate it beautifully to English and append "aesthetic high quality".
5. STOP WORDS: Ignore words like "хочу", "покажи", "картинка", "find", "show me".

Output nothing but the final query string.`
                        },
                        {
                            role: "user",
                            content: query
                        }
                    ]
                })
            });

            if (!response.ok) return `${query} aesthetic`;

            const data = await response.json();
            let kashmirResponse = data.choices[0].message.content.trim();
            kashmirResponse = kashmirResponse.replace(/["']/g, "");
            
            console.log(`[Kashmir] Synthesized: "${query}" -> "${kashmirResponse}"`);
            return kashmirResponse;

        } catch (error) {
            console.error("[Kashmir] Engine failure:", error);
            return `${query} aesthetic`;
        }
    }
}

export const kashmir = new KashmirEngine();