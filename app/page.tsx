"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const categories = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
];

const categoryMap: Record<string, string> = {
  "All": "photography", "Nature": "nature", "City": "city",
  "Food": "food", "Travel": "travel", "Architecture": "architecture",
  "Fashion": "fashion", "Art": "art", "Sports": "sport",
  "Interior": "interior", "Animals": "animals", "Technology": "technology",
  "Music": "music", "Cinema": "cinema", "Photography": "portrait", "Beauty": "beauty",
};

type Image = { id: string; src: string; title: string; category: string; author: string; authorAvatar: string };

export default function Home() {
  const { data: session } = useSession();
  const [active, setActive] = useState("All");
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
  const [newCategory, setNewCategory] = useState("Nature");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchImages(query: string, pageNum: number, reset: boolean) {
    if (loading) return;
    setLoading(true);
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=20&page=${pageNum}&client_id=${key}`);
      const data = await res.json();
      const fetched: Image[] = (data.results || []).map((p: any) => ({
        id: p.id, src: p.urls.regular, title: p.alt_description || query,
        category: active, author: p.user.name, authorAvatar: p.user.profile_image.small,
      }));
      setImages(prev => reset ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length === 20);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
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
    setImages(prev => [{ id: String(Date.now()), src: newSrc!, title: newTitle, category: newCategory, author: session?.user?.name || "Anonymous", authorAvatar: session?.user?.image || "" }, ...prev]);
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
        body { 
          overflow-x: hidden; 
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .app-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* Masonry Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          padding: 12px 0;
        }

        @media (min-width: 640px) {
          .grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1280px) {
          .grid { grid-template-columns: repeat(5, 1fr); }
        }

        .card {
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #f0f0f0;
        }

        .card:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 10;
        }
        .card:hover .overlay { opacity: 1; }

        .card img {
          width: 100%;
          display: block;
          height: auto;
          background: #f5f5f5;
        }

        .overlay {
          opacity: 0;
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.3) 100%);
          transition: opacity 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px;
        }

        .save-btn {
          align-self: flex-end;
          background: #e60023;
          color: white;
          border: none;
          border-radius: 24px;
          padding: 8px 18px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          font-family: -apple-system, sans-serif;
          transition: background 0.15s ease, transform 0.1s ease;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .save-btn:hover { background: #c0001f; transform: scale(1.04); }
        .save-btn.saved { 
          background: #efefef; 
          color: #111;
          box-shadow: none;
        }
        .save-btn.saved:hover { background: #e0e0e0; }

        .card-author {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: white;
        }
        .card-author img {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          background: #e0e0e0;
        }
        .card-author span {
          color: #666;
          font-size: 11px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== HEADER ===== */
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #ffffff;
          border-bottom: 1px solid #e5e5e5;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 1280px;
          margin: 0 auto;
        }

        /* Логотип — видимый, но не кричащий */
        .logo {
          font-size: 20px;
          font-weight: 700;
          color: #111;
          letter-spacing: 4px;
          text-transform: uppercase;
          font-family: Georgia, serif;
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 8px;
          transition: background 0.2s;
          cursor: pointer;
          background: #f5f5f5;
          border: 1px solid #e8e8e8;
          line-height: 1.2;
        }
        .logo:hover { background: #eeeeee; }

        /* Поиск — компактный */
        .search-wrap {
          flex: 0 1 420px;
          display: flex;
          min-width: 120px;
          background: #efefef;
          border-radius: 24px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: border-color 0.2s, background 0.2s, flex 0.2s;
        }
        .search-wrap:focus-within { 
          border-color: #e60023; 
          background: #ffffff;
          flex: 0 1 480px;
        }

        .search-input {
          flex: 1;
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: #111;
          font-size: 13px;
          outline: none;
          min-width: 60px;
          font-weight: 400;
        }
        .search-input::placeholder { color: #888; }

        .search-btn {
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 15px;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .search-btn:hover { color: #e60023; }

        /* Кнопки-иконки */
        .icon-btn {
          background: transparent;
          border: none;
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #555;
          font-size: 18px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: #f0f0f0; color: #111; }
        .icon-btn.active { background: #e60023; color: white; }
        .icon-btn.active:hover { background: #c0001f; }

        .badge {
          background: #e60023;
          color: white;
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 10px;
          font-weight: 700;
          margin-left: 2px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #e0e0e0;
          flex-shrink: 0;
          transition: border-color 0.2s;
        }
        .avatar:hover { border-color: #e60023; }

        .sign-btn {
          background: transparent;
          border: 1px solid #ddd;
          color: #333;
          border-radius: 24px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: -apple-system, sans-serif;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .sign-btn:hover { 
          border-color: #e60023; 
          color: #e60023;
          background: #fff5f5;
        }

        /* Категории */
        .cats {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 10px 0;
          background: #ffffff;
          border-bottom: 1px solid #f0f0f0;
          scrollbar-width: none;
          max-width: 1280px;
          margin: 0 auto;
          padding-left: 16px;
          padding-right: 16px;
        }
        .cats::-webkit-scrollbar { display: none; }

        .cat-btn {
          white-space: nowrap;
          padding: 6px 18px;
          border-radius: 24px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-family: -apple-system, sans-serif;
          font-weight: 500;
          transition: all 0.2s;
          background: #f0f0f0;
          color: #555;
        }
        .cat-btn.active { background: #111; color: white; }
        .cat-btn:hover { background: #e0e0e0; color: #111; }
        .cat-btn.active:hover { background: #222; }

        /* Модалки */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-inner {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          max-width: 880px;
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 92vh;
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (min-width: 640px) { 
          .modal-inner { flex-direction: row; } 
        }

        .modal-img {
          width: 100%;
          max-height: 45vh;
          object-fit: cover;
          display: block;
          background: #f5f5f5;
        }
        @media (min-width: 640px) { 
          .modal-img { width: 56%; max-height: 92vh; } 
        }

        .modal-info {
          flex: 1;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .primary-btn {
          background: #e60023;
          color: white;
          border: none;
          border-radius: 24px;
          padding: 14px 24px;
          cursor: pointer;
          font-weight: 700;
          font-family: -apple-system, sans-serif;
          font-size: 15px;
          letter-spacing: 0.3px;
          transition: background 0.2s;
          width: 100%;
        }
        .primary-btn:hover { background: #c0001f; }
        .primary-btn.saved-btn { background: #efefef; color: #111; }
        .primary-btn.saved-btn:hover { background: #e0e0e0; }

        .ghost-btn {
          background: transparent;
          color: #555;
          border: 1px solid #ddd;
          border-radius: 24px;
          padding: 13px 24px;
          cursor: pointer;
          font-weight: 600;
          font-family: -apple-system, sans-serif;
          font-size: 14px;
          transition: all 0.2s;
          flex: 1;
        }
        .ghost-btn:hover { border-color: #999; color: #111; background: #f5f5f5; }

        .upload-area {
          border: 2px dashed #ddd;
          border-radius: 16px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s, background 0.2s;
          background: #fafafa;
        }
        .upload-area:hover { border-color: #e60023; background: #fff5f5; }

        .field {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fafafa;
          color: #111;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: -apple-system, sans-serif;
        }
        .field:focus { border-color: #e60023; box-shadow: 0 0 0 3px rgba(230,0,35,0.1); background: #ffffff; }

        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e0e0e0;
          border-top-color: #e60023;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty { text-align: center; padding: 80px 20px; color: #888; font-size: 15px; }
        .modal-close {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 20px;
          transition: color 0.2s;
          padding: 4px;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-close:hover { color: #111; background: #f0f0f0; }
      `}</style>

      <main style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>

        {/* Header */}
        <header className="header">
          <span className="logo">SCHIELE</span>

          <form style={{ flex: 1, display: "flex", minWidth: 0 }} onSubmit={handleSearch}>
            <div className="search-wrap">
              <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="search-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </form>

          <button className={`icon-btn ${showSaved ? "active" : ""}`} onClick={() => setShowSaved(!showSaved)} title="Saved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={showSaved ? "white" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {saved.length > 0 && <span className="badge">{saved.length}</span>}
          </button>

          <button className="icon-btn" onClick={() => setShowUpload(true)} title="Add photo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {session ? (
            <img src={session.user?.image || ""} className="avatar" onClick={() => signOut()} title="Sign out" />
          ) : (
            <button className="sign-btn" onClick={() => signIn("google")}>Sign in</button>
          )}
        </header>

        {/* Categories */}
        {!showSaved && !searchQuery && (
          <div className="cats">
            {categories.map(cat => (
              <button key={cat} className={`cat-btn ${active === cat ? "active" : ""}`} onClick={() => setActive(cat)}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search status */}
        {searchQuery && (
          <div style={{ padding: "12px 16px", color: "#666", fontSize: "13px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: "12px", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
            <span>Results: <span style={{ color: "#e60023", fontWeight: 600 }}>"{searchQuery}"</span></span>
            <button onClick={() => { setSearchQuery(""); setSearch(""); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "50%", transition: "background 0.2s" }}>✕</button>
          </div>
        )}

        {showSaved && (
          <div style={{ padding: "12px 16px", color: "#666", fontSize: "13px", borderBottom: "1px solid #f0f0f0", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
            Saved: <span style={{ color: "#e60023", fontWeight: 600 }}>{saved.length} photos</span>
          </div>
        )}

        {/* Grid */}
        <div className="app-container">
          <div className="grid">
            {displayImages.map(img => (
              <div key={img.id} className="card" onClick={() => setSelected(img)}>
                <img src={img.src} alt={img.title} loading="lazy" />
                <div className="overlay">
                  <div />
                  <button className={`save-btn ${isSaved(img.id) ? "saved" : ""}`} onClick={e => { e.stopPropagation(); toggleSave(img); }}>
                    {isSaved(img.id) ? "Saved" : "Save"}
                  </button>
                </div>
                <div className="card-author">
                  {img.authorAvatar && <img src={img.authorAvatar} alt={img.author} />}
                  <span>{img.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {displayImages.length === 0 && !loading && (
          <div className="empty">{showSaved ? "No saved photos" : "Nothing found"}</div>
        )}

        {/* Infinite scroll */}
        <div ref={bottomRef} style={{ padding: "24px", textAlign: "center" }}>
          {loading && <div className="spinner" />}
        </div>

        {/* Modal - View */}
        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-inner" onClick={e => e.stopPropagation()}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div className="modal-info">
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: "40px", height: "40px", borderRadius: "50%" }} />}
                  <div>
                    <p style={{ color: "#111", fontSize: "14px", fontWeight: 600 }}>{selected.author}</p>
                    <p style={{ color: "#888", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>#{selected.category}</p>
                  </div>
                </div>
                {selected.title && <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6 }}>{selected.title}</p>}
                <button className={`primary-btn ${isSaved(selected.id) ? "saved-btn" : ""}`} onClick={() => toggleSave(selected)}>
                  {isSaved(selected.id) ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Upload */}
        {showUpload && (
          <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ color: "#111", fontSize: "18px", fontWeight: 700 }}>Add Photo</h2>
                <button onClick={() => setShowUpload(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "20px", padding: "4px 8px", borderRadius: "50%", transition: "background 0.2s" }}>✕</button>
              </div>
              <div className="upload-area" onClick={() => fileRef.current?.click()}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#999", fontSize: "14px" }}>Click to select photo</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input className="field" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="ghost-btn" onClick={() => setShowUpload(false)}>Cancel</button>
                <button className="primary-btn" style={{ opacity: (!newSrc || !newTitle) ? 0.4 : 1, cursor: (!newSrc || !newTitle) ? "default" : "pointer" }} onClick={handleAdd}>Publish</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}