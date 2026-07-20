// Direct Supabase REST access used by routes that read the public `images`
// table without the JS client. Centralizes the base URL, publishable key and
// auth headers that were previously duplicated across routes.
const SUPABASE_REST_URL = "https://kefdjxsmyarwfqqkfgcx.supabase.co";
const SUPABASE_REST_KEY = "sb_publishable_DHa5G0bhPLWJWNrACLVEUw_2GZS4BMc";

// `path` is everything after `/rest/v1/`, e.g. `images?select=*&limit=30`.
export function supabaseRestFetch(path: string) {
  return fetch(`${SUPABASE_REST_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_REST_KEY,
      Authorization: `Bearer ${SUPABASE_REST_KEY}`,
    },
  });
}
