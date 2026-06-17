"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const categories = [
  "Всё", "Природа", "Город", "Еда", "Путешествия", "Архитектура",
  "Мода", "Искусство", "Спорт", "Интерьер", "Животные", "Технологии",
  "Музыка", "Кино", "Фотография", "Красота",
];

const categoryMap: Record<string, string> = {
  "Всё": "photography", "Природа": "nature", "Город": "city",
  "Еда": "food", "Путешествия": "travel", "Архитектура": "architecture",
  "Мода": "fashion", "Искусство": "art", "Спорт": "sport",
  "Интерьер": "interior", "Животные": "animals", "Технологии": "technology",
  "Музыка": "music", "Кино": "cinema", "Фотография": "portrait", "Красота": "beauty",
};

type Image = { id: string; src: string; title: string; category: string; author: string; authorAvatar: string };

export default function Home() {
  const { data: session } = useSession();
  const [active, setActive] = useState("Всё");
  const [selected, setSelected] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [saved, setSaved] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Природа");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchImages(query: string, pageNum: number, reset: boolean) {
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${pageNum}&client_id=${key}`);
    const data = await res.json();
    const fetched: Image[] = (data.results || []).map((p: any) => ({
      id: p.id, src: p.urls.regular, title: p.alt_description || query,
      category: active, author: p.user.name, authorAvatar: p.user.profile_image.small,
    }));
    setImages(prev => reset ? fetched : [...prev, ...fetched]);
    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    const q = searchQuery || categoryMap[active] || "photography";
    fetchImages(q, 1, true);
  }, [active, searchQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    const q = searchQuery || categoryMap[active] || "photography";
    fetchImages(q, next, false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleAdd() {
    if (!newSrc || !newTitle) return;
    setImages(prev => [{ id: String(Date.now()), src: newSrc!, title: newTitle, category: newCategory, author: session?.user?.name || "Аноним", authorAvatar: session?.user?.image || "" }, ...prev]);
    setShowUpload(false); setNewTitle(""); setNewSrc(null);
  }

  function toggleSave(img: Image) {
    setSaved(prev => prev.find(i => i.id === img.id) ? prev.filter(i => i.id !== img.id) : [...prev, img]);
  }

  function isSaved(id: string) { return saved.some(i => i.id === id); }

  const btn = (extra?: any) => ({ backgroundColor: "#c0521a", color: "white", border: "none", borderRadius: "4px", padding: "10px 18px", cursor: "pointer", fontWeight: "bold", letterSpacing: "1px", fontFamily: "Georgia, serif", fontSize: "13px", ...extra });
  const inp = { width: "100%", padding: "10px 14px", borderRadius: "4px", border: "1px solid #3a2e22", backgroundColor: "#1a1612", color: "#d4c4a8", fontFamily: "Georgia, serif", fontSize: "13px", outline: "none", boxSizing: "border-box" as const };

  const displayImages = showSaved ? saved : images;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow-x: hidden; }
        .grid { columns: 1; gap: 10px; padding: 10px; }
        @media (min-width: 480px) { .grid { columns: 2; padding: 14px; } }
        @media (min-width: 768px) { .grid { columns: 3; } }
        @media (min-width: 1100px) { .grid { columns: 4; } }
        .card { break-inside: avoid; margin-bottom: 10px; border-radius: 8px; overflow: hidden; background: #0f0d0b; position: relative; border: 1px solid #3a2e22; cursor: pointer; transition: transform 0.2s; }
        .card:hover { transform: scale(1.02); }
        .card:hover .save-btn { opacity: 1; }
        .save-btn { opacity: 0; position: absolute; top: 10px; right: 10px; border: none; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-weight: bold; font-family: Georgia, serif; font-size: 12px; transition: opacity 0.2s; }
        .modal-wrap { display: flex; flex-direction: column; max-height: 90vh; overflow-y: auto; }
        @media (min-width: 640px) { .modal-wrap { flex-direction: row; overflow-y: hidden; } }
        .modal-img { width: 100%; max-height: 50vh; object-fit: cover; }
        @media (min-width: 640px) { .modal-img { width: 55%; max-height: 90vh; } }
        .cats { display: flex; gap: 8px; overflow-x: auto; padding: 10px 12px; scrollbar-width: none; }
        .cats::-webkit-scrollbar { display: none; }
        .search-form { display: flex; flex: 1; min-width: 0; }
        .search-input { flex: 1; padding: 8px 12px; border-radius: 4px 0 0 4px; border: 1px solid #3a2e22; border-right: none; background: #1a1612; color: #d4c4a8; font-size: 13px; outline: none; min-width: 0; }
        .search-btn { padding: 8px 12px; background: #3a2e22; border: 1px solid #3a2e22; color: #a08060; cursor: pointer; border-radius: 0 4px 4px 0; font-size: 13px; }
      `}</style>

      <main style={{ backgroundColor: "#1a1612", minHeight: "100vh", fontFamily: "Georgia, serif", maxWidth: "100vw", overflow: "hidden" }}>

        {/* Шапка */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#0f0d0b", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #3a2e22" }}>
          <span style={{ fontSize: "16px", fontWeight: "bold", color: "#c0521a", letterSpacing: "3px", textTransform: "uppercase", flexShrink: 0 }}>SCHIELE</span>
          
          <form className="search-form" onSubmit={handleSearch}>
            <input className="search-input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" className="search-btn">🔍</button>
          </form>

          <button onClick={() => setShowUpload(true)} style={btn({ padding: "8px 12px", flexShrink: 0 })}>+</button>
          
          <button onClick={() => setShowSaved(!showSaved)} style={btn({ padding: "8px 12px", flexShrink: 0, backgroundColor: showSaved ? "#8a3a12" : "#3a2e22", border: "1px solid #3a2e22" })}>
            🔖 {saved.length}
          </button>

          {session ? (
            <img src={session.user?.image || ""} onClick={() => signOut()} title="Нажмите чтобы выйти" style={{ width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", flexShrink: 0 }} />
          ) : (
            <button onClick={() => signIn("google")} style={btn({ backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060", padding: "8px 10px", flexShrink: 0, fontSize: "11px" })}>ВОЙТИ</button>
          )}
        </header>

        {/* Категории */}
        {!showSaved && (
          <div className="cats" style={{ backgroundColor: "#0f0d0b", borderBottom: "1px solid #3a2e22" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActive(cat); setSearchQuery(""); setSearch(""); }} style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "12px", backgroundColor: active === cat && !searchQuery ? "#c0521a" : "#1a1612", color: active === cat && !searchQuery ? "white" : "#a08060", transition: "all 0.2s" }}>{cat}</button>
            ))}
          </div>
        )}

        {/* Заголовок поиска */}
        {searchQuery && (
          <div style={{ padding: "10px 14px", color: "#a08060", fontSize: "13px", borderBottom: "1px solid #3a2e22" }}>
            Результаты для: <span style={{ color: "#c0521a" }}>"{searchQuery}"</span>
            <button onClick={() => { setSearchQuery(""); setSearch(""); }} style={{ marginLeft: "10px", background: "none", border: "none", color: "#6a5040", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {showSaved && (
          <div style={{ padding: "10px 14px", color: "#a08060", fontSize: "13px", borderBottom: "1px solid #3a2e22" }}>
            Сохранённые фото: <span style={{ color: "#c0521a" }}>{saved.length}</span>
          </div>
        )}

        {/* Лента */}
        <div className="grid">
          {displayImages.map(img => (
            <div key={img.id} className="card" onClick={() => setSelected(img)}>
              <img src={img.src} alt={img.title} style={{ width: "100%", display: "block" }} />
              <button
                className="save-btn"
                onClick={e => { e.stopPropagation(); toggleSave(img); }}
                style={{ backgroundColor: isSaved(img.id) ? "#8a3a12" : "#c0521a", color: "white" }}
              >
                {isSaved(img.id) ? "✓ Сохранено" : "Сохранить"}
              </button>
              <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {img.authorAvatar && <img src={img.authorAvatar} style={{ width: "18px", height: "18px", borderRadius: "50%" }} />}
                <p style={{ color: "#a08060", fontSize: "11px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.author}</p>
              </div>
            </div>
          ))}
        </div>

        {displayImages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6a5040" }}>
            {showSaved ? "Нет сохранённых фото" : "Ничего не найдено"}
          </div>
        )}

        {!showSaved && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <button onClick={loadMore} disabled={loading} style={btn({ opacity: loading ? 0.5 : 1 })}>{loading ? "ЗАГРУЗКА..." : "ЗАГРУЗИТЬ ЕЩЁ"}</button>
          </div>
        )}

        {/* Модальное — просмотр */}
        {selected && (
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
            <div className="modal-wrap" onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", overflow: "hidden", maxWidth: "900px", width: "100%" }}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <button onClick={() => setSelected(null)} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "#a08060", cursor: "pointer", fontSize: "20px" }}>✕</button>
                <h2 style={{ color: "#d4c4a8", margin: 0, textTransform: "uppercase", fontSize: "15px", letterSpacing: "1px" }}>{selected.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: "28px", height: "28px", borderRadius: "50%" }} />}
                  <p style={{ color: "#a08060", fontSize: "13px", margin: 0 }}>{selected.author}</p>
                </div>
                <p style={{ color: "#6a5040", fontSize: "11px", margin: 0, textTransform: "uppercase" }}>#{selected.category}</p>
                <button onClick={() => toggleSave(selected)} style={btn({ backgroundColor: isSaved(selected.id) ? "#8a3a12" : "#c0521a" })}>
                  {isSaved(selected.id) ? "✓ СОХРАНЕНО" : "СОХРАНИТЬ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное — загрузка */}
        {showUpload && (
          <div onClick={() => setShowUpload(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", padding: "20px", maxWidth: "480px", width: "100%", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: "#d4c4a8", margin: 0, fontSize: "15px", letterSpacing: "2px" }}>ДОБАВИТЬ ФОТО</h2>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #3a2e22", borderRadius: "4px", height: "150px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#6a5040", fontSize: "13px" }}>Нажмите чтобы выбрать фото</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inp} />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inp}>
                {categories.filter(c => c !== "Всё").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowUpload(false)} style={btn({ flex: 1, backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060" })}>ОТМЕНА</button>
                <button onClick={handleAdd} style={btn({ flex: 1, opacity: (!newSrc || !newTitle) ? 0.5 : 1 })}>ОПУБЛИКОВАТЬ</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}