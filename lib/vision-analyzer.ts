import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface VisualAnalysis {
  description: string;
  tags: string[];
  colors: string[];
  style: string;
  mood: string;
  contains_text: boolean;
  text_content?: string | null;
}

export async function analyzeImageWithNvidia(imageUrl: string): Promise<VisualAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.VISION_MODEL || "nvidia/nemotron-nano-12b-v2-vl:free";

  if (!apiKey) {
    console.warn("[Vision] OpenRouter API key missing. Skipping analysis.");
    return null;
  }

  try {
    const prompt = `You are an expert visual archivist for a music and art discovery engine. 
    Analyze the provided image deeply. 
    
    CRITICAL INSTRUCTIONS:
    1. TEXT DETECTION: If the image contains ANY text (band names, album titles, slogans), you MUST extract it accurately into 'text_content' and set 'contains_text' to true.
    2. STYLE & MOOD: Define the artistic style and emotional mood.
    3. COLORS: Extract the top 3-5 dominant hex colors.
    4. TAGS: Generate keywords including extracted text, genre, era, and visual elements.

    Return ONLY a valid JSON object. No markdown.
    Structure:
    {
      "description": "Detailed description",
      "tags": ["keywords"],
      "colors": ["#HEX1", "#HEX2"],
      "style": "Style Name",
      "mood": "Mood Name",
      "contains_text": true/false,
      "text_content": "Exact text or null"
    }`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Schiele Vision Analyzer"
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }],
        response_format: { type: "json_object" },
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Vision] OpenRouter API Error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "");
    if (cleanJson.startsWith("```")) cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "");

    return JSON.parse(cleanJson) as VisualAnalysis;

  } catch (error) {
    console.error("[Vision] Analysis failed:", error);
    return null;
  }
}

export async function saveVisualAnalysis(imageId: string | number, analysis: VisualAnalysis) {
  try {
    const enrichedTags = analysis.contains_text && analysis.text_content
      ? [analysis.text_content.toLowerCase(), ...analysis.tags]
      : analysis.tags;

    const { error } = await supabase
      .from('images')
      .update({
        visual_tags: enrichedTags,
        image_description: analysis.description,
        color_palette: analysis.colors,
        core_vibe: analysis.style
      })
      .eq('id', imageId);

    if (error) throw error;
    console.log(`[Vision] Saved analysis for image ${imageId}`);
  } catch (error) {
    console.error("[Vision] Failed to save analysis:", error);
  }
}
