"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const categories = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
  "Abstract", "Aerial", "Astronomy", "Automotive", "Business",
  "Education", "Family", "Fitness", "Flowers", "Gaming",
  "Health", "History", "Holidays", "Love", "Minimalism",
  "Night", "People", "Religion", "Science", "Space",
  "Street", "Sunset", "Vintage", "Weather", "Wedding",
  "Wildlife", "Work", "Yoga", "Zen"
];

// Соответствие категорий поисковым запросам для Unsplash
const categoryMap: Record<string, string> = {
  "All": "photography",
  "Nature": "nature",
  "City": "city",
  "Food": "food",
  "Travel": "travel",
  "Architecture": "architecture",
  "Fashion": "fashion",
  "Art": "art",
  "Sports": "sport",
  "Interior": "interior",
  "Animals": "animals",
  "Technology": "technology",
  "Music": "music",
  "Cinema": "cinema",
  "Photography": "portrait",
  "Beauty": "beauty",
  "Abstract": "abstract",
  "Aerial": "aerial",
  "Astronomy": "astronomy",
  "Automotive": "car",
  "Business": "business",
  "Education": "education",
  "Family": "family",
  "Fitness": "fitness",
  "Flowers": "flower",
  "Gaming": "gaming",
  "Health": "health",
  "History": "history",
  "Holidays": "christmas",
  "Love": "love",
  "Minimalism": "minimal",
  "Night": "night",
  "People": "people",
  "Religion": "church",
  "Science": "science",
  "Space": "space",
  "Street": "street",
  "Sunset": "sunset",
  "Vintage": "vintage",
  "Weather": "weather",
  "Wedding": "wedding",
  "Wildlife": "wildlife",
  "Work": "work",
  "Yoga": "yoga",
  "Zen": "meditation"
};

type Image = { id: string; src: string; title: string; category: string; author: string; authorAvatar: string };

export default function Home() {
  const { data: session } = useSession();
  const [active, setActive] = useState("All");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Nature");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Функция для загрузки картинок с Unsplash
  async function fetchImages(category: string, pageNum: number, reset: boolean) {
    setLoading(true);
    const query = categoryMap[category] || "photography";
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

    // Проверяем, есть ли ключ
    if (!key) {
      console.error("❌ API ключ Unsplash не найден! Проверь .env.local");
      setLoading(false);
      return;
    }

    try {
      // Прямой запрос к Unsplash API через HTTPS, что решит CORS-проблемы [citation:7]
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${pageNum}&client_id=${key}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!res.ok) {
        throw new Error(`Ошибка API: ${res.status}`);
      }

      const data = await res.json();
      
      // Извлекаем данные, включая авторов (user.name) [citation:1][citation:3]
      const fetched: Image[] = data.results.map((p: any) => ({
        id: p.id,
        src: p.urls.regular,
        title: p.alt_description || category,
        category: category,
        author: p.user?.name || "Unknown", // ВОТ ОТКУДА БЕРУТСЯ ИМЕНА!
        authorAvatar: p.user?.profile_image?.small || "",
      }));

      setImages(prev => reset ? fetched : [...prev, ...fetched]);

    } catch (error) {
      console.error("Ошибка загрузки картинок:", error);
      // Если Unsplash не работает, показываем заглушки, чтобы сайт не был пустым
      const fallback: Image[] = Array.from({ length: 12 }, (_, i) => ({
        id: `fallback_${i}`,
        src: `https://picsum.photos/seed/${category}_${i}_${Date.now()}/400/${300 + Math.random() * 400}`,
        title: category,
        category: category,
        author: "Заглушка", // ВАЖНО: Здесь уже не будет настоящих имен
        authorAvatar: "",
      }));
      setImages(prev => reset ? fallback : [...prev, ...fallback]);
    }
    setLoading(false);
  }

  // При смене категории загружаем новые картинки
  useEffect(() => {
    setPage(1);
    fetchImages(active, 1, true);
  }, [active]);

  // Дозагрузка картинок
  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchImages(active, next, false);
  }

  // ... (остальной код для загрузки своих фото, кнопок, модалок — он не меняется)
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleAdd() {
    if (!newSrc || !newTitle) return;
    const newImg: Image = {
      id: String(Date.now()),
      src: newSrc,
      title: newTitle,
      category: newCategory,
      author: session?.user?.name || "Аноним",
      authorAvatar: session?.user?.image || "",
    };
    setImages(prev => [newImg, ...prev]);
    setShowUpload(false);
    setNewTitle("");
    setNewSrc(null);
  }

  const btnStyle = {
    backgroundColor: "#c0521a", color: "white", border: "none",
    borderRadius: "4px", padding: "10px 22px", cursor: "pointer",
    fontWeight: "bold", letterSpacing: "1px", fontFamily: "Georgia, serif", fontSize: "13px",
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "4px",
    border: "1px solid #3a2e22", backgroundColor: "#1a1612",
    color: "#d4c4a8", fontFamily: "Georgia, serif", fontSize: "13px",
    outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <main style={{ backgroundColor: "#1a1612", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      {/* Шапка */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#0f0d0b", padding: "14px 28px", display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid #3a2e22" }}>
        <span style={{ fontSize: "22px", fontWeight: "bold", color: "#c0521a", letterSpacing: "4px", textTransform: "uppercase" }}>SCHIELE</span>
        <input placeholder="Search inspiration..." style={{ flex: 1, padding: "10px 18px", borderRadius: "4px", border: "1px solid #3a2e22", backgroundColor: "#1a1612", fontSize: "14px", outline: "none", color: "#d4c4a8" }} />
        <button onClick={() => setShowUpload(true)} style={btnStyle}>+ ADD</button>
        {session ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={session.user?.image || ""} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
            <span style={{ color: "#d4c4a8", fontSize: "13px", fontFamily: "Georgia, serif" }}>{session.user?.name}</span>
            <button onClick={() => signOut()} style={{ ...btnStyle, backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060" }}>SIGN OUT</button>
          </div>
        ) : (
          <button onClick={() => signIn("google")} style={{ ...btnStyle, backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060" }}>SIGN IN</button>
        )}
      </header>

      {/* Категории */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "14px 28px", backgroundColor: "#0f0d0b", borderBottom: "1px solid #3a2e22", scrollbarWidth: "thin", scrollbarColor: "#c0521a #0f0d0b" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActive(cat)} style={{
            whiteSpace: "nowrap", padding: "7px 16px", borderRadius: "4px",
            border: active === cat ? "1px solid #c0521a" : "1px solid #3a2e22",
            cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px",
            backgroundColor: active === cat ? "#c0521a" : "transparent",
            color: active === cat ? "white" : "#a08060", transition: "all 0.2s",
            flexShrink: 0,
          }}>{cat}</button>
        ))}
      </div>

      {/* Лента (Masonry) */}
      <div style={{ padding: "24px 28px", columns: "3 300px", gap: "16px" }}>
        {images.map(img => (
          <div key={img.id}
            onMouseEnter={() => setHovered(img.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setSelected(img)}
            style={{
              breakInside: "avoid", marginBottom: "16px", borderRadius: "4px",
              overflow: "hidden", background: "#0f0d0b", position: "relative",
              border: "1px solid #3a2e22", cursor: "pointer",
              transform: hovered === img.id ? "scale(1.02)" : "scale(1)",
              transition: "transform 0.2s",
            }}>
            <img src={img.src} alt={img.title} style={{ width: "100%", display: "block", opacity: hovered === img.id ? 0.85 : 1, transition: "opacity 0.2s" }} />
            {hovered === img.id && (
              <button onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "#c0521a", color: "white", border: "none", borderRadius: "4px", padding: "8px 16px", cursor: "pointer", fontWeight: "bold", fontFamily: "Georgia, serif", fontSize: "12px" }}>SAVE</button>
            )}
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              {img.authorAvatar && <img src={img.authorAvatar} style={{ width: "24px", height: "24px", borderRadius: "50%" }} />}
              <p style={{ color: "#a08060", fontSize: "12px", margin: 0, letterSpacing: "1px" }}>{img.author}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка "Загрузить ещё" */}
      <div style={{ textAlign: "center", padding: "20px" }}>
        <button onClick={loadMore} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>
          {loading ? "LOADING..." : "LOAD MORE"}
        </button>
      </div>

      {/* Модальное окно (просмотр) */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", overflow: "hidden", maxWidth: "900px", width: "100%", display: "flex", maxHeight: "90vh" }}>
            <img src={selected.src} alt={selected.title} style={{ width: "60%", objectFit: "cover", display: "block" }} />
            <div style={{ flex: 1, padding: "32px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <button onClick={() => setSelected(null)} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "#a08060", cursor: "pointer", fontSize: "22px" }}>✕</button>
              <h2 style={{ color: "#d4c4a8", letterSpacing: "2px", margin: 0, textTransform: "uppercase" }}>{selected.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />}
                <p style={{ color: "#a08060", fontSize: "13px", margin: 0 }}>{selected.author}</p>
              </div>
              <p style={{ color: "#6a5040", fontSize: "12px", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>#{selected.category}</p>
              <button style={{ ...btnStyle, marginTop: "auto" }}>SAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно (загрузка фото) */}
      {showUpload && (
        <div onClick={() => setShowUpload(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", padding: "32px", maxWidth: "480px", width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ color: "#d4c4a8", letterSpacing: "2px", margin: 0 }}>ADD PHOTO</h2>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #3a2e22", borderRadius: "4px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#6a5040" }}>Click to select photo</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle}>
              {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowUpload(false)} style={{ ...btnStyle, flex: 1, backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060" }}>CANCEL</button>
              <button onClick={handleAdd} style={{ ...btnStyle, flex: 1, opacity: (!newSrc || !newTitle) ? 0.5 : 1 }}>PUBLISH</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}