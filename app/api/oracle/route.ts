import { NextResponse } from "next/server";

const ORACLE_SYSTEM_PROMPT = `You are an elite audio-visual synesthesia AI.
The user gives you a song track or artist. Your job is to hallucinate its exact physical, cinematic equivalent.

Create a "visual_query" using this HYBRID FORMULA:
[1 Solitary/Surreal Object or Subject] + [Lighting/Environment] + [Camera Medium/Film Stock].

CRITICAL RULES FOR "visual_query":
1. NEVER use the band name, artist name, or song title.
2. NEVER use abstract words (sad, energetic, fast, happy).
3. ONLY use concrete, physical, tactile nouns and cinematography terms (e.g., "cracked neon tube", "dense fog", "35mm heavy grain", "macro photography", "VHS glitch").
4. Keep it under 7 words. It must work perfectly in an image search engine.

ANIMATION RULES (Physics of the waveform):
- bpm_speed: seconds per wave cycle. Slow/Ambient/Doom = 4.0 to 5.0. Average pop/rock = 2.5 to 3.0. Fast/Aggressive = 1.0 to 1.5.
- amplitude: height of the wave. Calm/Acoustic = 0.2 to 0.4. Heavy/Epic = 0.7 to 0.9. Extreme/Distorted = 1.1 to 1.4.
- is_erratic: true ONLY if the song is extremely aggressive, metal, glitchy, or chaotic (triggers strobe effects).

Respond ONLY in valid JSON format:
{
  "track_name": "Artist - Song Title (Cleaned)",
  "visual_query": "hybrid search query here",
  "bpm_speed": 1.5,
  "amplitude": 1.2,
  "is_erratic": true
}`;

export async function POST(req: Request) {
  try {
    const { trackInput } = await req.json();

    if (!trackInput || trackInput.trim().length === 0) {
      return NextResponse.json({ error: "No track provided" }, { status: 400 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: ORACLE_SYSTEM_PROMPT },
          { role: "user", content: trackInput }
        ],
        temperature: 0.6, // Чуть больше свободы для интересных визуальных ассоциаций
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Oracle API Error:", error);
    return NextResponse.json({ error: "Failed to process sonic input" }, { status: 500 });
  }
}
