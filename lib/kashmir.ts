import { supabase } from "./supabase";

export const kashmir = {
    async processQuery(baseQuery: string, userId: string | null) {
        if (!userId) return baseQuery;
        
        try {
            console.log(`[KASHMIR CORE] Запрашиваем профиль юзера: ${userId}`);
            
            // 1. Достаем профиль персоны из нашей новой таблицы
            const { data: persona, error } = await supabase
                .from("synth_users")
                .select("*")
                .eq("id", userId)
                .single();
                
            if (error || !persona) {
                console.warn(`[KASHMIR CORE] Профиль ${userId} не найден. Откат к базовому запросу.`);
                return baseQuery;
            }

            console.log(`[KASHMIR CORE] Личность активирована: ${persona.name} (${persona.role})`);

            // 2. Формируем мощный промпт для Llama 3 с учетом всех модификаторов
            const posMods = persona.positive_modifiers ? persona.positive_modifiers.join(", ") : "";
            const negMods = persona.negative_modifiers ? persona.negative_modifiers.join(", ") : "";

            const systemPrompt = `
            ${persona.persona_prompt}
            
            Core Vibe: ${persona.core_vibe}
            Mandatory Visual Elements to Include: ${posMods}
            Elements to Strictly Avoid: ${negMods}
            
            The user is searching for a base concept: "${baseQuery}".
            Transform this search query into a highly descriptive, comma-separated list of keywords for an image search engine. 
            Ensure the final query heavily reflects your persona's aesthetic and core vibe.
            Reply ONLY with the final search query. Do not add conversational text, prefixes, or quotes.
            `;

            // 3. Стучимся в Groq (Llama 3)
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
            
            if (aiGeneratedQuery) {
                // Предохранитель: срезаем случайные кавычки, которые ИИ иногда оставляет в начале или конце
                aiGeneratedQuery = aiGeneratedQuery.replace(/^["']|["']$/g, '');
            }
            
            console.log(`[KASHMIR CORE] Llama 3 сгенерировала запрос: "${aiGeneratedQuery}"`);
            return aiGeneratedQuery || baseQuery;

        } catch (e) {
            console.error("[KASHMIR CORE FATAL ERROR]:", e);
            return baseQuery; // При падении всегда возвращаем то, что было
        }
    }
}
