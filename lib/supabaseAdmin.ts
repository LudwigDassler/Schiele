import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the secret key. Never import this from a
// client component — it would expose the secret key and fail at load time.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Make sure a profile row exists for a user before inserting related content.
export async function ensureProfile(userId: string) {
  await supabaseAdmin.from("profiles").upsert({ id: userId }, { onConflict: "id" });
}
