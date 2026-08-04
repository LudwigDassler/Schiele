import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
    const fakeUsers = [
        {
            user_id: "synth-001-dark-academia",
            profile: "Victoria (Vintage & Dark Academia)",
            history: [
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/da1.jpg", tags: "dark academia, vintage books, old library, dim lighting, oxford vibe, sepia, typewriter" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/da2.jpg", tags: "gothic architecture, dark wood desk, melting candles, mystery, classical art, bronze statues" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/da3.jpg", tags: "rain outside window, cup of black coffee, fountain pen, old parchment, moody atmosphere" }
            ]
        },
        {
            user_id: "synth-002-cyberpunk",
            profile: "Max (Neon & Cyberpunk)",
            history: [
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/cp1.jpg", tags: "cyberpunk city, neon lights, pouring rain, tokyo streets at night, glowing signs, dark alley" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/cp2.jpg", tags: "futuristic UI, mechanical keyboard glowing, pc gaming setup, dark room, led strips, techwear" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/cp3.jpg", tags: "synthwave, retrowave grid, purple and cyan color palette, futuristic car, 80s nostalgia" }
            ]
        },
        {
            user_id: "synth-003-minimalist",
            profile: "Elena (Pure Minimalism)",
            history: [
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/min1.jpg", tags: "pure white room, minimalist architecture, sharp shadows, negative space, modern interior" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/min2.jpg", tags: "wabi-sabi, natural textures, raw concrete, single dried branch in ceramic vase, beige tones" },
                { url: "https://lexica-serve-encoded-images.p.rapidapi.com/min3.jpg", tags: "bauhaus design, simple geometric shapes, clean lines, uncluttered desk, soft natural light" }
            ]
        }
    ];

    let injectedCount = 0;

    for (const user of fakeUsers) {
        for (const item of user.history) {
            const { error } = await supabase
                .from("ai_image_cache")
                .insert({
                    image_url: item.url,
                    ai_tags: item.tags,
                    user_id: user.user_id
                });
            
            if (!error) injectedCount++;
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Kashmir neural network seeded. Injected ${injectedCount} taste vectors across 3 synthetic profiles.` 
    });
}