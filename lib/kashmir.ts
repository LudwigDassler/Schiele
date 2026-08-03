import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export class KashmirEngine {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
    }

    private async getVibeContext(): Promise<string> {
        if (!supabase) {
            console.warn("[Kashmir] Supabase not configured. Memory offline.");
            return "";
        }

        try {
            const { data, error } = await supabase
                .from('ai_image_cache')
                .select('ai_tags')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error || !data || data.length === 0) return "";

            const recentTags = data
                .map(row => row.ai_tags)
                .filter(Boolean)
                .join(" | ");

            return `\n\nCRITICAL VIBE CONTEXT: To understand the specific aesthetic the user prefers, here are their 5 most recent successful generations from the database: [ ${recentTags} ]. Match this level of artistic depth, irony, or vintage mood if the user's prompt is ambiguous.`;
        } catch (e) {
            console.warn("[Kashmir] Memory retrieval failed:", e);
            return "";
        }
    }

    public async processQuery(rawQuery: string): Promise<string> {
        const query = rawQuery.trim();
        if (!query) return "aesthetic";

        if (!this.apiKey) {
            console.warn("[Kashmir] GROQ_API_KEY is missing. Using fallback.");
            return `${query} aesthetic`.trim();
        }

        const memoryContext = await this.getVibeContext();

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    temperature: 0.4,
                    messages: [
                        {
                            role: "system",
                            content: `You are Kashmir, an elite aesthetic visual archivist engine.
Your ONLY purpose is to take a user's raw search query and transform it into a highly optimized English query for an image search engine.

RULES:
1. NO CONVERSATION. Output ONLY the final search string.
2. CULTURAL CONTEXT: Identify specific bands or phenomena (e.g., "ГрОб", "КиШ"). Do NOT translate them literally. Append "band aesthetic vintage".
3. GENERAL: Translate Russian concepts beautifully to English and append "aesthetic high quality".
4. STOP WORDS: Ignore "хочу", "покажи", "картинка".${memoryContext}`
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
            
            console.log(`[Kashmir] Synthesized with Memory: "${query}" -> "${kashmirResponse}"`);
            return kashmirResponse;

        } catch (error) {
            console.error("[Kashmir] Engine failure:", error);
            return `${query} aesthetic`;
        }
    }
}

export const kashmir = new KashmirEngine();