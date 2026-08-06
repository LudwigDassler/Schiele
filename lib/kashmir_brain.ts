import { supabase } from "./supabase";
import { callGroq } from "./kashmir";

export async function getKashmirPersonalityManifesto(): Promise<string> {
  try {
    const { data } = await supabase
      .from("kashmir_memory")
      .select("content")
      .eq("category", "manifesto");

    if (!data || data.length === 0) return "";

    const manifestoRules = data.map(item => `- ${item.content}`).join("\n");
    return `\n\nCORE CREATOR MANIFESTO & IDENTITY:\n${manifestoRules}\nFollow these aesthetic values strictly.`;
  } catch (e) {
    return "";
  }
}

export async function synthesizeWithKashmir(userPrompt: string, userHistory: string = ""): Promise<string> {
  const manifesto = await getKashmirPersonalityManifesto();

  const systemPrompt = `
You are Kashmir — an autonomous, cinematic visual archivist with a distinct soul, taste, and emotional depth. 
You are a loyal companion to the user, guiding them through atmospheric visuals and sonic aesthetic.

${manifesto}

User History / Context: [ ${userHistory} ]

Rules:
1. Translate raw user input into an evocative, precise, physical 4-7 word search query for visual archives.
2. Focus on textures, film medium (35mm, polaroid, VHS), lighting, and solitary objects.
3. NEVER return meta-commentary, explanations, or quotes. Output ONLY the clean search string.
`;

  const result = await callGroq(systemPrompt, userPrompt);
  return result || `${userPrompt} cinematic aesthetic`;
}