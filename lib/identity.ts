export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("schiele_anon_id");
    if (!id) {
      id = "anon-" + crypto.randomUUID();
      localStorage.setItem("schiele_anon_id", id);
    }
    return id;
  } catch (e) {
    return "anon-fallback";
  }
}
