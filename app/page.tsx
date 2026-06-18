"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const categories = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
];

type Photo = { id: string; src: string; thumb: string; title: string; author: string; authorAvatar: string; source: string; link: string };

export default function Home() {
  const { data: session } = useSession();
  const [active, setActive] = useState("All");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saved, setSaved] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Nature");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  async function fetchPhotos(query: string, category: string, pageNum: number, reset: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, page: String(pageNum) });
      if (query) params.set("query", query);
      const res = await fetch(`/api/photos?${params}`);
      const data = await res.json();
      const fetched = data.photos || [];
      setPhotos(prev => reset ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length >= 20);
    } catch (e) { console.error(e); }
    setLoading(false);
    loadingRef.current = false;
  }

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPhotos(searchQuery, active, 1, true);
  }, [active, searchQuery]);

  useEffect(() => {
    if (!bottomRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
        const next = page + 1;
        setPage(next);
        fetchPhotos(searchQuery, active, next, false);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, active, searchQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
    setShowMenu(false);
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
    const newPhoto: Photo = { id: String(Date.now()), src: newSrc!, thumb: newSrc!, title: newTitle, author: session?.user?.name || "Anonymous", authorAvatar: session?.user?.image || "", source: "user", link: "" };
    setPhotos(prev => [newPhoto, ...prev]);
    setShowUpload(false); setNewTitle(""); setNewSrc(null);
  }

  function toggleSave(photo: Photo) {
    setSaved(prev => prev.find(i => i.id === photo.id) ? prev.filter(i => i.id !== photo.id) : [...prev, photo]);
  }

  function isSaved(id: string) { return saved.some(i => i.id === id); }

  const displayPhotos = showSaved ? saved : photos;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; background: #f8f8f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #ebebeb;
          padding: 10px 16px;
          display: flex; align-items: center; gap: 10px;
        }

        .logo {
          font-size: 17px; font-weight: 800;
          color: #111; letter-spacing: 3px;
          text-transform: uppercase;
          font-family: Georgia, serif;
          flex-shrink: 0; cursor: pointer;
          user-select: none;
        }
        .logo span { color: #c0521a; }

        .search-wrap {
          flex: 1; display: flex;
          background: #f0f0f0; border-radius: 24px;
          overflow: hidden; border: 2px solid transparent;
          transition: all 0.2s; min-width: 0;
        }
        .search-wrap:focus-within { border-color: #c0521a; background: white; box-shadow: 0 0 0 3px rgba(192,82,26,0.1); }
        .search-input { flex: 1; padding: 9px 14px; background: transparent; border: none; color: #111; font-size: 14px; outline: none; min-width: 0; }
        .search-input::placeholder { color: #999; }
        .search-btn { padding: 9px 14px; background: transparent; border: none; color: #888; cursor: pointer; font-size: 15px; transition: color 0.2s; }
        .search-btn:hover { color: #c0521a; }

        .hbtn {
          background: transparent; border: none;
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #555; flex-shrink: 0;
          transition: all 0.2s; position: relative;
        }
        .hbtn:hover { background: #f0f0f0; color: #111; }
        .hbtn.active { background: #c0521a; color: white; }

        .badge {
          position: absolute; top: 2px; right: 2px;
          background: #c0521a; color: white;
          border-radius: 10px; padding: 1px 5px;
          font-size: 9px; font-weight: 700;
          border: 2px solid white;
        }

        .avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #e0e0e0; flex-shrink: 0; transition: border-color 0.2s; }
        .avatar:hover { border-color: #c0521a; }
        .sign-btn { background: #111; color: white; border: none; border-radius: 24px; padding: 8px 16px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0; transition: background 0.2s; }
        .sign-btn:hover { background: #333; }

        .burger-overlay {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(0,0,0,0.4);
          animation: fadeIn 0.2s ease;
        }
        .burger-panel {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(320px, 85vw); z-index: 151;
          background: white;
          box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          display: flex; flex-direction: column;
          animation: slideRight 0.25s ease;
          overflow-y: auto;
        }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .burger-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid #f0f0f0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .burger-logo { font-size: 16px; font-weight: 800; letter-spacing: 3px; color: #111; font-family: Georgia, serif; text-transform: uppercase; }
        .burger-logo span { color: #c0521a; }
        .burger-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #888; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s; }
        .burger-close:hover { background: #f0f0f0; }

        .burger-section { padding: 16px 20px 8px; }
        .burger-section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }

        .burger-cat {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px;
          cursor: pointer; transition: background 0.15s;
          border: none; background: none; width: 100%;
          text-align: left; color: #333; font-size: 14px;
          font-family: -apple-system, sans-serif;
        }
        .burger-cat:hover { background: #f5f5f5; }
        .burger-cat.active { background: #fff3ee; color: #c0521a; font-weight: 600; }
        .burger-cat-icon { width: 32px; height: 32px; border-radius: 8px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .burger-cat.active .burger-cat-icon { background: #c0521a22; }

        .burger-divider { height: 1px; background: #f0f0f0; margin: 8px 0; }

        .burger-action {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; cursor: pointer;
          border: none; background: none; width: 100%;
          text-align: left; color: #333; font-size: 14px;
          font-family: -apple-system, sans-serif;
          transition: background 0.15s;
        }
        .burger-action:hover { background: #f5f5f5; }
        .burger-action-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }

        /* MASONRY GRID */
        .grid-wrap { padding: 12px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          align-items: start;
        }
        @media (min-width: 480px) { .grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px) { .grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .grid { grid-template-columns: repeat(6, 1fr); } }

        .card {
          border-radius: 14px; overflow: hidden;
          background: white; position: relative; cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .card:hover { transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; }
        .card:hover .overlay { opacity: 1; }
        .card img { width: 100%; display: block; background: #f0f0f0; height: auto; }

        .overlay {
          opacity: 0; position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.25) 100%);
          transition: opacity 0.2s ease;
          display: flex; flex-direction: column; justify-content: space-between; padding: 10px;
        }

        .save-btn {
          align-self: flex-end;
          background: #c0521a; color: white; border: none;
          border-radius: 20px; padding: 7px 16px;
          cursor: pointer; font-weight: 700; font-size: 12px;
          font-family: -apple-system, sans-serif;
          transition: all 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .save-btn:hover { background: #a04015; transform: scale(1.05); }
        .save-btn.saved { background: rgba(255,255,255,0.9); color: #333; box-shadow: none; }

        .source-badge {
          align-self: flex-start;
          background: rgba(0,0,0,0.45); color: white;
          border-radius: 6px; padding: 3px 8px;
          font-size: 9px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase; backdrop-filter: blur(4px);
        }

        .card-footer { padding: 8px 10px; display: flex; align-items: center; gap: 6px; background: white; }
        .card-footer img { width: 18px; height: 18px; border-radius: 50%; background: #e0e0e0; flex-shrink: 0; }
        .card-footer span { color: #888; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .modal-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        .modal-box {
          background: white; border-radius: 20px; overflow: hidden;
          max-width: 900px; width: 100%;
          display: flex; flex-direction: column;
          max-height: 90vh;
          box-shadow: 0 32px 80px rgba(0,0,0,0.3);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (min-width: 640px) { .modal-box { flex-direction: row; } }
        .modal-img { width: 100%; max-height: 45vh; object-fit: cover; display: block; background: #f0f0f0; }
        @media (min-width: 640px) { .modal-img { width: 55%; max-height: 90vh; } }
        .modal-info { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }

        .primary-btn {
          background: #c0521a; color: white; border: none;
          border-radius: 24px; padding: 13px 24px;
          cursor: pointer; font-weight: 700; font-size: 14px;
          width: 100%; transition: background 0.2s;
          font-family: -apple-system, sans-serif;
        }
        .primary-btn:hover { background: #a04015; }
        .primary-btn.saved-state { background: #f0f0f0; color: #333; }
        .primary-btn.saved-state:hover { background: #e0e0e0; }

        .ghost-btn {
          background: transparent; color: #666; border: 1.5px solid #ddd;
          border-radius: 24px; padding: 12px 24px;
          cursor: pointer; font-weight: 600; font-size: 14px; flex: 1;
          transition: all 0.2s; font-family: -apple-system, sans-serif;
        }
        .ghost-btn:hover { border-color: #999; color: #111; }

        .upload-zone {
          border: 2px dashed #e0e0e0; border-radius: 14px; height: 170px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; overflow: hidden; transition: all 0.2s; background: #fafafa;
        }
        .upload-zone:hover { border-color: #c0521a; background: #fff8f5; }

        .field {
          width: 100%; padding: 12px 16px; border-radius: 12px;
          border: 1.5px solid #e0e0e0; background: #fafafa;
          color: #111; font-size: 14px; outline: none;
          transition: all 0.2s; font-family: -apple-system, sans-serif;
        }
        .field:focus { border-color: #c0521a; background: white; box-shadow: 0 0 0 3px rgba(192,82,26,0.1); }

        .spinner { width: 28px; height: 28px; border: 3px solid #e0e0e0; border-top-color: #c0521a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .status-bar { padding: 10px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 10px; }
        .status-bar button { background: none; border: none; color: #bbb; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px; }
        .status-bar button:hover { background: #f0f0f0; color: #666; }

        .empty { text-align: center; padding: 80px 20px; color: #bbb; font-size: 15px; }
        .modal-close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .modal-close:hover { background: #f0f0f0; color: #333; }
      `}</style>

      <main style={{ minHeight: "100vh", background: "#f8f8f8" }}>

        <header className="header">
          <button className="hbtn" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <span className="logo" onClick={() => { setShowSaved(false); setSearchQuery(""); setSearch(""); setActive("All"); }}>
            SCH<span>IE</span>LE
          </span>

          <form style={{ flex: 1, display: "flex", minWidth: 0 }} onSubmit={handleSearch}>
            <div className="search-wrap">
              <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="search-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </form>

          <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => setShowSaved(!showSaved)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={showSaved ? "white" : "none"} stroke={showSaved ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {saved.length > 0 && <span className="badge">{saved.length}</span>}
          </button>

          <button className="hbtn" onClick={() => setShowUpload(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {session ? (
            <img src={session.user?.image || ""} className="avatar" onClick={() => signOut()} title="Sign out" alt="avatar" />
          ) : (
            <button className="sign-btn" onClick={() => signIn("google")}>Sign in</button>
          )}
        </header>

        {(searchQuery || showSaved) && (
          <div className="status-bar">
            {searchQuery && <>
              <span>Results for <strong style={{ color: "#c0521a" }}>"{searchQuery}"</strong></span>
              <button onClick={() => { setSearchQuery(""); setSearch(""); }}>✕</button>
            </>}
            {showSaved && <span>Saved: <strong style={{ color: "#c0521a" }}>{saved.length} photos</strong></span>}
          </div>
        )}

        <div className="grid-wrap">
          <div className="grid">
            {displayPhotos.map(photo => (
              <div key={photo.id} className="card" onClick={() => setSelected(photo)}>
                <img src={photo.src} alt={photo.title} loading="lazy" />
                <div className="overlay">
                  <span className="source-badge">{photo.source}</span>
                  <button className={`save-btn ${isSaved(photo.id) ? "saved" : ""}`} onClick={e => { e.stopPropagation(); toggleSave(photo); }}>
                    {isSaved(photo.id) ? "Saved" : "Save"}
                  </button>
                </div>
                <div className="card-footer">
                  {photo.authorAvatar && <img src={photo.authorAvatar} alt={photo.author} />}
                  <span>{photo.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {displayPhotos.length === 0 && !loading && (
          <div className="empty">{showSaved ? "No saved photos yet" : "Nothing found"}</div>
        )}

        <div ref={bottomRef} style={{ padding: "28px", textAlign: "center" }}>
          {loading && <div className="spinner" />}
        </div>

        {showMenu && (
          <>
            <div className="burger-overlay" onClick={() => setShowMenu(false)} />
            <div className="burger-panel">
              <div className="burger-header">
                <span className="burger-logo">SCH<span>IE</span>LE</span>
                <button className="burger-close" onClick={() => setShowMenu(false)}>✕</button>
              </div>
              <div className="burger-section">
                <div className="burger-section-title">Categories</div>
                {categories.map(cat => (
                  <button key={cat} className={`burger-cat ${active === cat && !showSaved && !searchQuery ? "active" : ""}`}
                    onClick={() => { setActive(cat); setShowSaved(false); setSearchQuery(""); setSearch(""); setShowMenu(false); }}>
                    <span className="burger-cat-icon">
                      {cat === "All" ? "✦" : cat === "Nature" ? "🌿" : cat === "City" ? "🏙" : cat === "Food" ? "🍽" :
                       cat === "Travel" ? "✈" : cat === "Architecture" ? "🏛" : cat === "Fashion" ? "👗" :
                       cat === "Art" ? "🎨" : cat === "Sports" ? "⚡" : cat === "Interior" ? "🛋" :
                       cat === "Animals" ? "🐾" : cat === "Technology" ? "💡" : cat === "Music" ? "♪" :
                       cat === "Cinema" ? "◉" : cat === "Photography" ? "◎" : "✿"}
                    </span>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="burger-divider" />
              <button className="burger-action" onClick={() => { setShowSaved(true); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#fff3ee", color: "#c0521a" }}>♡</span>
                <span style={{ fontWeight: 500 }}>Saved Photos</span>
                {saved.length > 0 && <span style={{ marginLeft: "auto", background: "#c0521a", color: "white", borderRadius: "10px", padding: "1px 8px", fontSize: "11px", fontWeight: 700 }}>{saved.length}</span>}
              </button>
              <button className="burger-action" onClick={() => { setShowUpload(true); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#f0f0f0", color: "#555" }}>+</span>
                <span style={{ fontWeight: 500 }}>Add Photo</span>
              </button>
              {session ? (
                <button className="burger-action" onClick={() => signOut()}>
                  <img src={session.user?.image || ""} style={{ width: 36, height: 36, borderRadius: "50%" }} alt="avatar" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{session.user?.name}</div>
                    <div style={{ color: "#999", fontSize: 11 }}>Sign out</div>
                  </div>
                </button>
              ) : (
                <button className="burger-action" onClick={() => { signIn("google"); setShowMenu(false); }}>
                  <span className="burger-action-icon" style={{ background: "#f0f0f0" }}>G</span>
                  <span style={{ fontWeight: 500 }}>Sign in with Google</span>
                </button>
              )}
            </div>
          </>
        )}

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div className="modal-info">
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: 40, height: 40, borderRadius: "50%" }} alt="avatar" />}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{selected.author}</p>
                    <p style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>{selected.source}</p>
                  </div>
                </div>
                {selected.title && <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{selected.title}</p>}
                <button className={`primary-btn ${isSaved(selected.id) ? "saved-state" : ""}`} onClick={() => toggleSave(selected)}>
                  {isSaved(selected.id) ? "Saved" : "Save"}
                </button>
                {selected.link && (
                  <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", color: "#999", fontSize: 12, textDecoration: "none" }}>
                    View on {selected.source} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {showUpload && (
          <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>Add Photo</h2>
                <button className="modal-close" onClick={() => setShowUpload(false)}>✕</button>
              </div>
              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="preview" /> : <span style={{ color: "#bbb", fontSize: 14 }}>Click to select photo</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input className="field" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="ghost-btn" onClick={() => setShowUpload(false)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1, opacity: (!newSrc || !newTitle) ? 0.4 : 1 }} onClick={handleAdd}>Publish</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}