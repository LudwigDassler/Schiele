// Shared helper for calling the Pinterest v5 API with the access token and
// bearer auth header that were duplicated across the pinterest routes.
const PINTEREST_BASE = "https://api.pinterest.com/v5";
const token = process.env.PINTEREST_ACCESS_TOKEN;

// `path` is everything after the API version, e.g. `boards` or
// `search/pins?query=cats`. Throws on non-OK responses so callers can handle
// failures uniformly.
export async function pinterestFetch(path: string) {
  const res = await fetch(`${PINTEREST_BASE}/${path}`, {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (!res.ok) {
    throw new Error("Pinterest API error: " + res.status);
  }

  return res.json();
}
