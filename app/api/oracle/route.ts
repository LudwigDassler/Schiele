import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { trackInput } = await req.json();

    if (!trackInput || trackInput.trim().length === 0) {
      return NextResponse.json({ error: "No track provided" }, { status: 400 });
    }

    const systemPrompt = `
      You are an expert audio-visual synesthesia engine for an aesthetic archive.
      The user will give you a song name or lyrics. 
      Your job is to translate the SONIC ATMOSPHERE of this song into strict parameters.

      Rules for "visual_query" (Crucial for image scraping):
      1. ONLY physical objects, cinematography terms, textures, lighting, and camera mediums.
      2. NEVER use abstract words (e.g., "sad", "energetic", "fast", "beautiful").
      3. NEVER include the name of the band, artist, or song.
      4. Auto-assign the correct camera medium based on the genre (e.g., "35mm film heavy grain" for 70s rock, "vhs glitch digital artifact" for 90s techno, "high contrast polaroid" for post-punk, "liminal space flash photography" for ambient).
      5. Keep it under 8 words.

      Rules for "bpm_speed" and "amplitude":
      - bpm_speed: seconds per wave cycle. Slow/Doom/Ambient = 4.0 to 5.0. Average pop/rock = 2.5 to 3.0. Fast/Erratic = 1.0 to 1.5.
      - amplitude: height of the wave. Calm/Acoustic = 0.2 to 0.4. Heavy/Epic = 0.7 to 0.9. Extreme/Distorted = 1.1 to 1.4.
      - is_erratic: boolean. True ONLY if the song is extremely aggressive, glitchy, or has a chaotic breakdown.

      Respond ONLY in valid JSON format:
      {
        "track_name": "Formatted Name (Artist - Song)",
        "visual_query": "search query here",
        "bpm_speed": 1.5,
        "amplitude": 1.2,
        "is_erratic": true
      }
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trackInput }
        ],
        temperature: 0.3, 
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
