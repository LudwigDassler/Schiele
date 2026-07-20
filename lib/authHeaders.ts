import { supabase } from "./supabase";

export async function authHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
