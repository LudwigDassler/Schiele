"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Природа");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchImages(query: string, pageNum: number, reset: boolean) {
    if (loading) return;
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${pageNum}&client_id=${key}`);
    const data = await res.json();
    const fetched: Image[] = (data.results || []).map((p: any) => ({
      id: p.id, src: p.urls.regular, title: p.alt_description || query,
      category: active, author: p.user.name, authorAvatar: p.user.profile_image.small,
    }));
    setImages(prev => reset ? fetched : [...prev, ...fetched]);
    setHasMore(fetched.length === 20);
    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    const q = searchQuery || categoryMap[active] || "photography";
    fetchImages(q, 1, true);
  }, [active, searchQuery]);

  useEffect(() => {
    if (!bottomRef.current) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        const q = searchQuery || categoryMap[active] || "photography";
        fetchImages(q, next, false);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, active, searchQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
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

  const displayImages = showSaved ? saved : images;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #111; }

        .grid {
          columns: 2;
          gap: 8px;
          padding: 8px;
        }
        @media (min-width: 640px) { .grid { columns: 3; gap: 12px; padding: 12px; } }
        @media (min-width: 900px) { .grid { columns: 4; } }
        @media (min-width: 1200px) { .grid { columns: 5; } }

        .card {
          break-inside: avoid;
          margin-bottom: 8px;
          border-radius: 12px;
          overflow: hidden;
          background: #1a1a1a;
          position: relative;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        @media (min-width: 640px) { .card { margin-bottom: 12px; border-radius: 16px; } }
        .card:hover { transform: scale(1.02); }
        .card:hover .overlay { opacity: 1; }

        .overlay {
          opacity: 0;
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%);
          transition: opacity 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px;
        }

        .save-btn {
          align-self: flex-end;
          background: #c0521a;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 6px 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          font-family: -apple-system, sans-serif;
          transition: background 0.2s;
        }
        .save-btn:hover { background: #a04015; }
        .save-btn.saved { background: #333; }

        .card-author {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #0a0a0a;
          border-bottom: 1px solid #222;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo {
          font-size: 15px;
          font-weight: 800;
          color: #c0521a;
          letter-spacing: 4px;
          text-transform: uppercase;
          font-family: Georgia, serif;
          flex-shrink: 0;
        }
        @media (min-width: 640px) { .logo { font-size: 18px; } }

        .search-wrap {
          flex: 1;
          display: flex;
          min-width: 0;
          background: #1a1a1a;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #2a2a2a;
        }
        .search-wrap:focus-within { border-color: #c0521a; }

        .search-input {
          flex: 1;
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: #e0d0c0;
          font-size: 13px;
          outline: none;
          min-width: 0;
        }
        .search-input::placeholder { color: #555; }

        .search-btn {
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 13px;
          flex-shrink: 0;
        }
        .search-btn:hover { color: #c0521a; }

        .icon-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #888;
          font-size: 15px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .icon-btn:hover { border-color: #c0521a; color: #c0521a; }
        .icon-btn.active { background: #c0521a; border-color: #c0521a; color: white; }

        .cats {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 8px 12px;
          background: #0a0a0a;
          border-bottom: 1px solid #1a1a1a;
          scrollbar-width: none;
        }
        .cats::-webkit-scrollbar { display: none; }

        .cat-btn {
          white-space: nowrap;
          padding: 5px 14px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-family: -apple-system, sans-serif;
          font-weight: 500;
          transition: all 0.2s;
          background: #1a1a1a;
          color: #666;
        }
        .cat-btn.active { background: #c0521a; color: white; }
        .cat-btn:hover { color: #aaa; }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .modal-inner {
          background: #111;
          border-radius: 16px;
          overflow: hidden;
          max-width: 880px;
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 92vh;
        }
        @media (min-width: 640px) { .modal-inner { flex-direction: row; } }

        .modal-img {
          width: 100%;
          max-height: 45vh;
          object-fit: cover;
          display: block;
        }
        @media (min-width: 640px) { .modal-img { width: 56%; max-height: 92vh; } }

        .modal-info {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
        }

        .primary-btn {
          background: #c0521a;
          color: white;
          border: none;
          border-radius: 24px;
          padding: 12px 24px;
          cursor: pointer;
          font-weight: 700;
          font-family: -apple-system, sans-serif;
          font-size: 14px;
          letter-spacing: 0.5px;
          transition: background 0.2s;
          width: 100%;
        }
        .primary-btn:hover { background: #a04015; }
        .primary-btn.saved-btn { background: #2a2a2a; }

        .ghost-btn {
          background: transparent;
          color: #888;
          border: 1px solid #2a2a2a;
          border-radius: 24px;
          padding: 11px 24px;
          cursor: pointer;
          font-weight: 600;
          font-family: -apple-system, sans-serif;
          font-size: 14px;
          transition: all 0.2s;
          flex: 1;
        }
        .ghost-btn:hover { border-color: #555; color: #aaa; }

        .upload-area {
          border: 2px dashed #2a2a2a;
          border-radius: 12px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .upload-area:hover { border-color: #c0521a; }

        .field {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid #2a2a2a;
          background: #1a1a1a;
          color: #e0d0c0;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .field:focus { border-color: #c0521a; }

        .spinner {
          width: 24px; height: 24px;
          border: 2px solid #2a2a2a;
          border-top-color: #c0521a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .avatar { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid #2a2a2a; flex-shrink: 0; }
        .sign-btn { background: transparent; border: 1px solid #2a2a2a; color: #888; border-radius: 20px; padding: 6px 12px; cursor: pointer; font-size: 11px; font-family: -apple-system, sans-serif; flex-shrink: 0; transition: all 0.2s; }
        .sign-btn:hover { border-color: #c0521a; color: #c0521a; }

        .empty { text-align: center; padding: 80px 20px; color: #444; font-size: 14px; }
        .badge { background: #c0521a; color: white; border-radius: 10px; padding: 1px 6px; font-size: 10px; font-weight: 700; margin-left: 2px; }
      `}</style>

      <main style={{ backgroundColor: "#111", minHeight: "100vh", fontFamily: "-apple-system, sans-serif" }}>

        {/* Шапка */}
        <header className="header">
          <span className="logo">S</span>

          <form style={{ flex: 1, display: "flex", minWidth: 0 }} onSubmit={handleSearch}>
            <div className="search-wrap">
              <input className="search-input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="search-btn">⌕</button>
            </div>
          </form>

          <button className={`icon-btn ${showSaved ? "active" : ""}`} onClick={() => setShowSaved(!showSaved)} title="Сохранённые">
            ♡{saved.length > 0 && <span className="badge">{saved.length}</span>}
          </button>

          <button className="icon-btn" onClick={() => setShowUpload(true)} title="Добавить фото">+</button>

          {session ? (
            <img src={session.user?.image || ""} className="avatar" onClick={() => signOut()} title="Выйти" />
          ) : (
            <button className="sign-btn" onClick={() => signIn("google")}>Войти</button>
          )}
        </header>

        {/* Категории */}
        {!showSaved && !searchQuery && (
          <div className="cats">
            {categories.map(cat => (
              <button key={cat} className={`cat-btn ${active === cat ? "active" : ""}`} onClick={() => setActive(cat)}>{cat}</button>
            ))}
          </div>
        )}

        {/* Статус поиска */}
        {searchQuery && (
          <div style={{ padding: "10px 14px", color: "#666", fontSize: "12px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Результаты: <span style={{ color: "#c0521a" }}>"{searchQuery}"</span></span>
            <button onClick={() => { setSearchQuery(""); setSearch(""); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
        )}

        {showSaved && (
          <div style={{ padding: "10px 14px", color: "#666", fontSize: "12px", borderBottom: "1px solid #1a1a1a" }}>
            Сохранено: <span style={{ color: "#c0521a" }}>{saved.length} фото</span>
          </div>
        )}

        {/* Лента */}
        <div className="grid">
          {displayImages.map(img => (
            <div key={img.id} className="card" onClick={() => setSelected(img)}>
              <img src={img.src} alt={img.title} style={{ width: "100%", display: "block" }} loading="lazy" />
              <div className="overlay">
                <div />
                <button className={`save-btn ${isSaved(img.id) ? "saved" : ""}`} onClick={e => { e.stopPropagation(); toggleSave(img); }}>
                  {isSaved(img.id) ? "Сохранено" : "Сохранить"}
                </button>
              </div>
              <div className="card-author">
                {img.authorAvatar && <img src={img.authorAvatar} style={{ width: "16px", height: "16px", borderRadius: "50%" }} />}
                <span style={{ color: "#555", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.author}</span>
              </div>
            </div>
          ))}
        </div>

        {displayImages.length === 0 && !loading && (
          <div className="empty">{showSaved ? "Нет сохранённых фото" : "Ничего не найдено"}</div>
        )}

        {/* Бесконечная прокрутка */}
        <div ref={bottomRef} style={{ padding: "20px", textAlign: "center" }}>
          {loading && <div className="spinner" />}
        </div>

        {/* Модальное — просмотр */}
        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-inner" onClick={e => e.stopPropagation()}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div className="modal-info">
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px" }}>✕</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: "36px", height: "36px", borderRadius: "50%" }} />}
                  <div>
                    <p style={{ color: "#e0d0c0", fontSize: "13px", fontWeight: 600 }}>{selected.author}</p>
                    <p style={{ color: "#444", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>#{selected.category}</p>
                  </div>
                </div>
                {selected.title && <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.5 }}>{selected.title}</p>}
                <button className={`primary-btn ${isSaved(selected.id) ? "saved-btn" : ""}`} onClick={() => toggleSave(selected)}>
                  {isSaved(selected.id) ? "Сохранено" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное — загрузка */}
        {showUpload && (
          <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "16px", padding: "24px", maxWidth: "440px", width: "100%", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ color: "#e0d0c0", fontSize: "16px", fontWeight: 700 }}>Добавить фото</h2>
                <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px" }}>✕</button>
              </div>
              <div className="upload-area" onClick={() => fileRef.current?.click()}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#444", fontSize: "13px" }}>Нажмите чтобы выбрать фото</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input className="field" placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.filter(c => c !== "Всё").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="ghost-btn" onClick={() => setShowUpload(false)}>Отмена</button>
                <button className="primary-btn" style={{ opacity: (!newSrc || !newTitle) ? 0.4 : 1 }} onClick={handleAdd}>Опубликовать</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}