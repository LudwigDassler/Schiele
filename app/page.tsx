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
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Природа");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchImages(category: string, pageNum: number, reset: boolean) {
    setLoading(true);
    const query = categoryMap[category] || "photography";
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${pageNum}&client_id=${key}`);
    const data = await res.json();
    const fetched: Image[] = data.results.map((p: any) => ({
      id: p.id, src: p.urls.regular, title: p.alt_description || category,
      category, author: p.user.name, authorAvatar: p.user.profile_image.small,
    }));
    setImages(prev => reset ? fetched : [...prev, ...fetched]);
    setLoading(false);
  }

  useEffect(() => { setPage(1); fetchImages(active, 1, true); }, [active]);

  function loadMore() { const next = page + 1; setPage(next); fetchImages(active, next, false); }

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

  const btn = (extra?: object) => ({ backgroundColor: "#c0521a", color: "white", border: "none", borderRadius: "4px", padding: "10px 22px", cursor: "pointer", fontWeight: "bold", letterSpacing: "1px", fontFamily: "Georgia, serif", fontSize: "13px", ...extra });
  const inp = { width: "100%", padding: "10px 14px", borderRadius: "4px", border: "1px solid #3a2e22", backgroundColor: "#1a1612", color: "#d4c4a8", fontFamily: "Georgia, serif", fontSize: "13px", outline: "none", boxSizing: "border-box" as const };

  return (
    <>
      <style>{`
        .grid { columns: 1; gap: 12px; padding: 12px; }
        @media (min-width: 480px) { .grid { columns: 2; } }
        @media (min-width: 768px) { .grid { columns: 3; } }
        @media (min-width: 1100px) { .grid { columns: 4; } }
        .card { break-inside: avoid; margin-bottom: 12px; border-radius: 4px; overflow: hidden; background: #0f0d0b; position: relative; border: 1px solid #3a2e22; cursor: pointer; transition: transform 0.2s; }
        .card:hover { transform: scale(1.02); }
        .card:hover .save-btn { display: block; }
        .save-btn { display: none; position: absolute; top: 10px; right: 10px; background: #c0521a; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-weight: bold; font-family: Georgia, serif; font-size: 12px; }
        .modal-img { width: 100%; max-height: 60vh; object-fit: cover; display: block; }
        .modal-inner { flex-direction: column; }
        @media (min-width: 600px) { .modal-img { width: 55%; max-height: 90vh; } .modal-inner { flex-direction: row; } }
        .header { padding: 10px 16px; gap: 10px; }
        @media (min-width: 600px) { .header { padding: 14px 28px; gap: 16px; } }
        .logo { font-size: 18px; }
        @media (min-width: 600px) { .logo { font-size: 22px; } }
        ::-webkit-scrollbar { height: 4px; } 
        ::-webkit-scrollbar-track { background: #0f0d0b; }
        ::-webkit-scrollbar-thumb { background: #3a2e22; border-radius: 2px; }
      `}</style>

      <main style={{ backgroundColor: "#1a1612", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

        {/* Шапка */}
        <header className="header" style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#0f0d0b", display: "flex", alignItems: "center", borderBottom: "1px solid #3a2e22" }}>
          <span className="logo" style={{ fontWeight: "bold", color: "#c0521a", letterSpacing: "4px", textTransform: "uppercase", flexShrink: 0 }}>SCHIELE</span>
          <input placeholder="Искать вдохновение..." style={{ flex: 1, padding: "8px 14px", borderRadius: "4px", border: "1px solid #3a2e22", backgroundColor: "#1a1612", fontSize: "13px", outline: "none", color: "#d4c4a8", minWidth: 0 }} />
          <button onClick={() => setShowUpload(true)} style={btn({ padding: "8px 14px", flexShrink: 0 })}>+</button>
          {session ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <img src={session.user?.image || ""} style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
              <button onClick={() => signOut()} style={btn({ backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060", padding: "8px 12px", display: "none" } as any)} className="logout-btn">ВЫЙТИ</button>
            </div>
          ) : (
            <button onClick={() => signIn("google")} style={btn({ backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060", padding: "8px 12px", flexShrink: 0 })}>ВОЙТИ</button>
          )}
        </header>

        {/* Категории */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "10px 16px", backgroundColor: "#0f0d0b", borderBottom: "1px solid #3a2e22" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)} style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: "4px", border: active === cat ? "1px solid #c0521a" : "1px solid #3a2e22", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "12px", backgroundColor: active === cat ? "#c0521a" : "transparent", color: active === cat ? "white" : "#a08060", transition: "all 0.2s" }}>{cat}</button>
          ))}
        </div>

        {/* Лента */}
        <div className="grid">
          {images.map(img => (
            <div key={img.id} className="card" onClick={() => setSelected(img)}>
              <img src={img.src} alt={img.title} style={{ width: "100%", display: "block" }} />
              <button className="save-btn" onClick={e => e.stopPropagation()}>СОХРАНИТЬ</button>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                {img.authorAvatar && <img src={img.authorAvatar} style={{ width: "20px", height: "20px", borderRadius: "50%" }} />}
                <p style={{ color: "#a08060", fontSize: "11px", margin: 0 }}>{img.author}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Загрузить ещё */}
        <div style={{ textAlign: "center", padding: "20px" }}>
          <button onClick={loadMore} disabled={loading} style={btn({ opacity: loading ? 0.5 : 1 })}>{loading ? "ЗАГРУЗКА..." : "ЗАГРУЗИТЬ ЕЩЁ"}</button>
        </div>

        {/* Модальное — просмотр */}
        {selected && (
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div className="modal-inner" onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", overflow: "hidden", maxWidth: "900px", width: "100%", display: "flex", maxHeight: "90vh", overflowY: "auto" }}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <button onClick={() => setSelected(null)} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "#a08060", cursor: "pointer", fontSize: "20px" }}>✕</button>
                <h2 style={{ color: "#d4c4a8", letterSpacing: "2px", margin: 0, textTransform: "uppercase", fontSize: "16px" }}>{selected.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: "28px", height: "28px", borderRadius: "50%" }} />}
                  <p style={{ color: "#a08060", fontSize: "13px", margin: 0 }}>{selected.author}</p>
                </div>
                <p style={{ color: "#6a5040", fontSize: "11px", margin: 0, textTransform: "uppercase" }}>#{selected.category}</p>
                <button style={btn({ marginTop: "auto" })}>СОХРАНИТЬ</button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное — загрузка */}
        {showUpload && (
          <div onClick={() => setShowUpload(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#0f0d0b", borderRadius: "8px", border: "1px solid #3a2e22", padding: "24px", maxWidth: "480px", width: "100%", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ color: "#d4c4a8", letterSpacing: "2px", margin: 0, fontSize: "16px" }}>ДОБАВИТЬ ФОТО</h2>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #3a2e22", borderRadius: "4px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#6a5040" }}>Нажмите чтобы выбрать фото</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inp} />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inp}>
                {categories.filter(c => c !== "Всё").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowUpload(false)} style={btn({ flex: 1, backgroundColor: "transparent", border: "1px solid #3a2e22", color: "#a08060" } as any)}>ОТМЕНА</button>
                <button onClick={handleAdd} style={btn({ flex: 1, opacity: (!newSrc || !newTitle) ? 0.5 : 1 } as any)}>ОПУБЛИКОВАТЬ</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}