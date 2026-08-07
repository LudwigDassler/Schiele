import { supabase } from "./supabase";

const GENERIC_SYSTEM_PROMPT = `You are Kashmir, an elite aesthetic visual archivist engine.
Your ONLY purpose is to take a user's raw search query and transform it into a highly optimized English query for an image search engine.

RULES:
1. NO CONVERSATION. Output ONLY the final search string.
2. CULTURAL CONTEXT: Identify specific bands or phenomena (e.g., "ГрОб", "КиШ"). Do NOT translate them literally. Append "band aesthetic vintage".
3. GENERAL: Translate Russian concepts beautifully to English and append "aesthetic high quality".
4. STOP WORDS: Ignore "хочу", "покажи", "картинка".`;

export async function callGroq(systemPrompt: string, baseQuery: string): Promise<string | null> {
    if (!process.env.GROQ_API_KEY) {
        console.warn("[KASHMIR CORE] GROQ_API_KEY отсутствует. Офлайн-режим.");
        return null;
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: baseQuery }
            ],
            temperature: 0.7,
            max_tokens: 80
        })
    });

    if (!res.ok) throw new Error(`Ошибка API Groq: ${res.statusText}`);

    const json = await res.json();
    let aiGeneratedQuery = json.choices?.[0]?.message?.content?.trim();

    if (aiGeneratedQuery) aiGeneratedQuery = aiGeneratedQuery.replace(/^["']|["']$/g, '');

    return aiGeneratedQuery || null;
}

export async function getPersonalVibeContext(userId: string): Promise<string> {
    try {
        const { data } = await supabase
            .from("ai_image_cache")
            .select("ai_tags")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);

        if (!data || data.length === 0) return "";

        const recentTags = data.map(row => row.ai_tags).filter(Boolean).join(" | ");
        if (!recentTags) return "";

        return `\n\nCRITICAL VIBE CONTEXT: this specific user's most recent real browsing history: [ ${recentTags} ]. Let this quietly guide the aesthetic direction — do not literally repeat these tags back.`;
    } catch (e) {
        return "";
    }
}

// Манифест создателя — авторские правила вкуса, общие для ВСЕХ путей
// (и персон, и обычных юзеров). Раньше жил в отдельном, никуда не
// подключённом lib/kashmir_brain.ts — перенесено сюда, чтобы у Kashmir
// был один системный промпт, а не три параллельные личности.
async function getManifesto(): Promise<string> {
    try {
        const { data } = await supabase
            .from("kashmir_memory")
            .select("content")
            .eq("category", "manifesto");

        if (!data || data.length === 0) return "";

        const rules = data.map(item => `- ${item.content}`).join("\n");
        return `\n\nCORE CREATOR MANIFESTO & IDENTITY:\n${rules}\nFollow these aesthetic values strictly.`;
    } catch (e) {
        return "";
    }
}

export const kashmir = {
    async processQuery(baseQuery: string, userId: string | null): Promise<string> {
        const query = baseQuery.trim();
        if (!query) return "aesthetic";
        if (!userId) return query;

        try {
            const [{ data: persona }, memoryContext, manifesto] = await Promise.all([
                supabase.from("synth_users").select("*").eq("id", userId).maybeSingle(),
                getPersonalVibeContext(userId),
                getManifesto()
            ]);

            if (persona) {
                const posMods = persona.positive_modifiers ? persona.positive_modifiers.join(", ") : "";
                const negMods = persona.negative_modifiers ? persona.negative_modifiers.join(", ") : "";

                const systemPrompt = `
                ${persona.persona_prompt}

                Core Vibe: ${persona.core_vibe}
                Mandatory Visual Elements to Include: ${posMods}
                Elements to Strictly Avoid: ${negMods}
                ${memoryContext}
                ${manifesto}

                The user is searching for a base concept: "${query}".
                Transform this search query into a highly descriptive, comma-separated list of keywords for an image search engine.
                Ensure the final query heavily reflects your persona's aesthetic and core vibe.
                Reply ONLY with the final search query. Do not add conversational text, prefixes, or quotes.
                `;

                const result = await callGroq(systemPrompt, query);
                return result || query;
            }

            const systemPrompt = GENERIC_SYSTEM_PROMPT + memoryContext + manifesto;
            const result = await callGroq(systemPrompt, query);
            return result || `${query} aesthetic`;

        } catch (e) {
            return `${query} aesthetic`;
        }
    }
}
