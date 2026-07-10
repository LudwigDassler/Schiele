"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

const categories = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
];

type Photo = { id: string; src: string; thumb: string; title: string; author: string; authorAvatar: string; source: string; link: string };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState("All");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showShare, setShowShare] = useState<Photo | null>(null);
  const [showSaveToBoard, setShowSaveToBoard] = useState<Photo | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Nature");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    const [pinsRes, boardsRes] = await Promise.all([
      fetch(`/api/pins?user_id=${userId}`),
      fetch(`/api/boards?user_id=${userId}`)
    ]);
    const pinsData = await pinsRes.json();
    const boardsData = await boardsRes.json();
    if (pinsData.pins) setPins(pinsData.pins);
    if (boardsData.boards) setBoards(boardsData.boards);
  }

  // ====== ТОЛЬКО ЭТА ФУНКЦИЯ ИЗМЕНЕНА ======
  // Теперь ходит в /api/myimages вместо /api/photos
  async function fetchPhotos(query: string, category: string, pageNum: number, reset: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        category: category === 'All' ? 'all' : category, 
        limit: '30',
        page: String(pageNum)
      });
      if (query) params.set('query', query);
      
      const res = await fetch(`/api/myimages?${params}`);
      const data = await res.json();
      
      if (data.photos && data.photos.length > 0) {
        setPhotos(prev => reset ? data.photos : [...prev, ...data.photos]);
        setHasMore(data.hasMore);
      } else {
        setPhotos([]);
        setHasMore(false);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
    loadingRef.current = false;
  }

  // ====== ПОИСК ТОЖЕ ЧЕРЕЗ БД ======
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search || search.length < 2) return;
    
    setLoading(true);
    setShowMenu(false);
    setShowSaved(false);
    setShowBoards(false);
    
    try {
      const res = await fetch(`/api/myimages?category=all&limit=50`);
      const data = await res.json();
      
      let searchPhotos = data.photos.filter((p: any) => 
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase()) ||
        p.author?.toLowerCase().includes(search.toLowerCase())
      );
      
      setPhotos(searchPhotos);
      setSearchQuery(search);
      setHasMore(false);
      setActive("All");
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
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
    const newPhoto: Photo = { id: String(Date.now()), src: newSrc!, thumb: newSrc!, title: newTitle, author: user?.email || "Anonymous", authorAvatar: "", source: "user", link: "" };
    setPhotos(prev => [newPhoto, ...prev]);
    setShowUpload(false); setNewTitle(""); setNewSrc(null);
  }

  async function savePin(photo: Photo, boardId?: string) {
    if (!user) { window.location.href = "/auth"; return; }
    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, board_id: boardId || null, source_url: photo.link, source: photo.source, author: photo.author })
    });
    const data = await res.json();
    if (data.pin) setPins(prev => [data.pin, ...prev]);
    setShowSaveToBoard(null); setSelected(null);
  }

  async function createBoard() {
    if (!newBoardName || !user) return;
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, name: newBoardName, description: newBoardDesc })
    });
    const data = await res.json();
    if (data.board) setBoards(prev => [data.board, ...prev]);
    setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false);
  }

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) navigator.share({ title: photo.title, url });
    else {
      navigator.clipboard.writeText(url);
      setShareMsg("Link copied!"); setTimeout(() => setShareMsg(""), 2000);
    }
    setShowShare(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPins([]); setBoards([]);
  }

  const displayPhotos = showSaved
    ? pins.map(p => ({ id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", author: "", authorAvatar: "", source: "", link: p.source_url || "" }))
    : photos;

  const userAvatar = user?.user_metadata?.avatar_url || "";
  const userName = user?.user_metadata?.full_name || user?.email || "";

  useEffect(() => {
    setPage(1); setHasMore(true);
    if (!searchQuery) {
      fetchPhotos('', active, 1, true);
    }
  }, [active, searchQuery]);

  useEffect(() => {
    if (!bottomRef.current || searchQuery) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current && !searchQuery) {
        const next = page + 1;
        setPage(next);
        fetchPhotos('', active, next, false);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, active, searchQuery]);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #f8f8f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

        .header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #ebebeb; padding: 10px 16px; display: flex; align-items: center; gap: 10px; }
        .logo { font-size: 17px; font-weight: 800; color: #111; letter-spacing: 3px; text-transform: uppercase; font-family: Georgia, serif; flex-shrink: 0; cursor: pointer; user-select: none; }
        .logo span { color: #c0521a; }
        .search-wrap { flex: 1; display: flex; background: #f0f0f0; border-radius: 24px; overflow: hidden; border: 2px solid transparent; transition: all 0.2s; min-width: 0; }
        .search-wrap:focus-within { border-color: #c0521a; background: white; box-shadow: 0 0 0 3px rgba(192,82,26,0.1); }
        .search-input { flex: 1; padding: 9px 14px; background: transparent; border: none; color: #111; font-size: 14px; outline: none; min-width: 0; }
        .search-input::placeholder { color: #999; }
        .search-btn { padding: 9px 14px; background: transparent; border: none; color: #888; cursor: pointer; }
        .hbtn { background: transparent; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #555; flex-shrink: 0; transition: all 0.2s; position: relative; }
        .hbtn:hover { background: #f0f0f0; color: #111; }
        .hbtn.active { background: #c0521a; color: white; }
        .badge { position: absolute; top: 2px; right: 2px; background: #c0521a; color: white; border-radius: 10px; padding: 1px 5px; font-size: 9px; font-weight: 700; border: 2px solid white; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #e0e0e0; flex-shrink: 0; object-fit: cover; background: #f0f0f0; }
        .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #e0e0e0; flex-shrink: 0; background: #c0521a; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; }
        .sign-btn { background: #111; color: white; border: none; border-radius: 24px; padding: 8px 16px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0; text-decoration: none; display: flex; align-items: center; }

        .burger-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.4); animation: fadeIn 0.2s ease; }
        .burger-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(320px, 85vw); z-index: 151; background: white; box-shadow: 4px 0 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; animation: slideRight 0.25s ease; overflow-y: auto; }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .burger-header { padding: 20px 20px 16px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
        .burger-logo { font-size: 16px; font-weight: 800; letter-spacing: 3px; color: #111; font-family: Georgia, serif; text-transform: uppercase; }
        .burger-logo span { color: #c0521a; }
        .burger-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #888; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .burger-section { padding: 16px 20px 8px; }
        .burger-section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
        .burger-cat { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; border: none; background: none; width: 100%; text-align: left; color: #333; font-size: 14px; font-family: -apple-system, sans-serif; }
        .burger-cat:hover { background: #f5f5f5; }
        .burger-cat.active { background: #fff3ee; color: #c0521a; font-weight: 600; }
        .burger-cat-dot { width: 8px; height: 8px; border-radius: 50%; background: #ddd; flex-shrink: 0; }
        .burger-cat.active .burger-cat-dot { background: #c0521a; }
        .burger-divider { height: 1px; background: #f0f0f0; margin: 8px 0; }
        .burger-action { display: flex; align-items: center; gap: 12px; padding: 12px 20px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; color: #333; font-size: 14px; font-family: -apple-system, sans-serif; transition: background 0.15s; }
        .burger-action:hover { background: #f5f5f5; }
        .burger-action-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }

        /* MASONRY */
        .grid-wrap { padding: 12px; }
        .masonry { columns: 2; gap: 10px; }
        @media (min-width: 480px) { .masonry { columns: 3; } }
        @media (min-width: 768px) { .masonry { columns: 4; } }
        @media (min-width: 1024px) { .masonry { columns: 5; } }
        @media (min-width: 1280px) { .masonry { columns: 6; } }

        .card { break-inside: avoid; margin-bottom: 10px; border-radius: 14px; overflow: hidden; background: white; position: relative; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .card:hover { transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; }
        .card:hover .overlay { opacity: 1; }
        .card img { width: 100%; display: block; background: #f0f0f0; height: auto; }
        .overlay { opacity: 0; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.3) 100%); transition: opacity 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; }
        .save-btn { align-self: flex-end; background: #c0521a; color: white; border: none; border-radius: 20px; padding: 7px 16px; cursor: pointer; font-weight: 700; font-size: 12px; transition: all 0.15s; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .save-btn:hover { background: #a04015; }
        .save-btn.pinned { background: rgba(255,255,255,0.9); color: #333; box-shadow: none; }
        .card-actions { display: flex; gap: 6px; align-self: flex-start; }
        .card-action-btn { background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .card-action-btn:hover { background: white; transform: scale(1.1); }
        .card-footer { padding: 8px 10px; display: flex; align-items: center; gap: 6px; background: white; }
        .card-footer img { width: 18px; height: 18px; border-radius: 50%; background: #e0e0e0; flex-shrink: 0; }
        .card-footer span { color: #888; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        /* 👇 УБРАЛИ source-dot */

        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.2s ease; }
        .modal-box { background: white; border-radius: 20px; overflow: hidden; max-width: 900px; width: 100%; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 32px 80px rgba(0,0,0,0.3); animation: slideUp 0.25s ease; }
        @media (min-width: 640px) { .modal-box { flex-direction: row; } }
        .modal-img { width: 100%; max-height: 45vh; object-fit: cover; display: block; background: #f0f0f0; }
        @media (min-width: 640px) { .modal-img { width: 55%; max-height: 90vh; } }
        .modal-info { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }

        .primary-btn { background: #c0521a; color: white; border: none; border-radius: 24px; padding: 13px 24px; cursor: pointer; font-weight: 700; font-size: 14px; width: 100%; transition: background 0.2s; font-family: -apple-system, sans-serif; }
        .primary-btn:hover { background: #a04015; }
        .primary-btn.pinned-state { background: #f0f0f0; color: #333; }
        .ghost-btn { background: transparent; color: #666; border: 1.5px solid #ddd; border-radius: 24px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 14px; flex: 1; transition: all 0.2s; font-family: -apple-system, sans-serif; }
        .ghost-btn:hover { border-color: #999; color: #111; }
        .outline-btn { background: transparent; color: #c0521a; border: 1.5px solid #c0521a; border-radius: 24px; padding: 11px 24px; cursor: pointer; font-weight: 600; font-size: 14px; width: 100%; transition: all 0.2s; font-family: -apple-system, sans-serif; }
        .outline-btn:hover { background: #fff3ee; }
        .danger-btn { background: transparent; color: #e53e3e; border: 1.5px solid #e53e3e; border-radius: 24px; padding: 11px 24px; cursor: pointer; font-weight: 600; font-size: 14px; width: 100%; transition: all 0.2s; font-family: -apple-system, sans-serif; }
        .danger-btn:hover { background: #fff5f5; }

        .upload-zone { border: 2px dashed #e0e0e0; border-radius: 14px; height: 170px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; transition: all 0.2s; background: #fafafa; }
        .upload-zone:hover { border-color: #c0521a; background: #fff8f5; }
        .field { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e0e0e0; background: #fafafa; color: #111; font-size: 14px; outline: none; transition: all 0.2s; font-family: -apple-system, sans-serif; }
        .field:focus { border-color: #c0521a; background: white; box-shadow: 0 0 0 3px rgba(192,82,26,0.1); }

        .boards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 480px) { .boards-grid { grid-template-columns: repeat(3, 1fr); } }
        .board-card { border-radius: 12px; overflow: hidden; border: 1.5px solid #e0e0e0; background: #fafafa; }
        .board-cover { height: 80px; background: linear-gradient(135deg, #f0e6dc, #e8d5c4); display: flex; align-items: center; justify-content: center; }
        .board-info { padding: 10px 12px; }
        .board-name { font-size: 13px; font-weight: 600; color: #111; }
        .board-count { font-size: 11px; color: #999; margin-top: 2px; }
        .board-actions { display: flex; gap: 6px; margin-top: 8px; }
        .board-edit-btn { flex: 1; padding: 6px; border-radius: 8px; border: 1px solid #e0e0e0; background: transparent; cursor: pointer; font-size: 11px; color: #666; transition: all 0.2s; }
        .board-edit-btn:hover { border-color: #c0521a; color: #c0521a; }
        .board-del-btn { flex: 1; padding: 6px; border-radius: 8px; border: 1px solid #fcc; background: transparent; cursor: pointer; font-size: 11px; color: #e53e3e; transition: all 0.2s; }
        .board-del-btn:hover { background: #fff5f5; }

        .spinner { width: 28px; height: 28px; border: 3px solid #e0e0e0; border-top-color: #c0521a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-bar { padding: 10px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 10px; }
        .status-bar button { background: none; border: none; color: #bbb; cursor: pointer; font-size: 14px; }
        .empty { text-align: center; padding: 80px 20px; color: #bbb; font-size: 15px; }
        .modal-close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .modal-close:hover { background: #f0f0f0; color: #333; }
        .share-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111; color: white; padding: 10px 20px; border-radius: 24px; font-size: 13px; font-weight: 600; z-index: 300; }
        .pin-tag { display: inline-block; background: #fff3ee; color: #c0521a; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 600; }
      `}</style>

      <main style={{ minHeight: "100vh", background: "#f8f8f8" }}>
        <header className="header">
          <button className="hbtn" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="logo" onClick={() => { setShowSaved(false); setShowBoards(false); setSearchQuery(""); setSearch(""); setActive("All"); }}>SCH<span>IE</span>LE</span>
          <form style={{ flex: 1, display: "flex", minWidth: 0 }} onSubmit={handleSearch}>
            <div className="search-wrap">
              <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="search-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </form>
          <button className={`hbtn ${showBoards ? "active" : ""}`} onClick={() => { setShowBoards(!showBoards); setShowSaved(false); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => { setShowSaved(!showSaved); setShowBoards(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={showSaved ? "white" : "none"} stroke={showSaved ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {pins.length > 0 && <span className="badge">{pins.length}</span>}
          </button>
          <button className="hbtn" onClick={() => setShowUpload(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          {user ? (
            <a href="/profile">
              {userAvatar ? <img src={userAvatar} className="avatar" alt="avatar" /> : <div className="avatar-placeholder">{(userName[0] || "U").toUpperCase()}</div>}
            </a>
          ) : (
            <a href="/auth" className="sign-btn">Sign in</a>
          )}
        </header>

        {(searchQuery || showSaved || showBoards) && (
          <div className="status-bar">
            {searchQuery && <><span>Results for <strong style={{ color: "#c0521a" }}>"{searchQuery}"</strong></span><button onClick={() => { setSearchQuery(""); setSearch(""); }}>✕</button></>}
            {showSaved && <span>Pins: <strong style={{ color: "#c0521a" }}>{pins.length}</strong></span>}
            {showBoards && <span>Boards: <strong style={{ color: "#c0521a" }}>{boards.length}</strong></span>}
          </div>
        )}

        {showBoards && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>My Boards</h2>
              <button className="primary-btn" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setShowNewBoard(true)}>+ New Board</button>
            </div>
            {boards.length === 0
              ? <div className="empty">No boards yet. Create your first!</div>
              : <div className="boards-grid">
                  {boards.map(board => (
                    <div key={board.id} className="board-card">
                      <div className="board-cover">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      </div>
                      <div className="board-info">
                        <div className="board-name">{board.name}</div>
                        {board.description && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{board.description}</div>}
                        <div className="board-count">{pins.filter(p => p.board_id === board.id).length} pins</div>
                        <div className="board-actions">
                          <button className="board-edit-btn" onClick={() => setEditBoard(board)}>Edit</button>
                          <button className="board-del-btn" onClick={() => deleteBoard(board.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {!showBoards && (
          <>
            <div className="grid-wrap">
              <div className="masonry">
                {displayPhotos.map(photo => (
                  <div key={photo.id} className="card" onClick={() => setSelected(photo)}>
                    <img src={photo.src} alt={photo.title} loading="lazy" onError={e => { (e.target as HTMLImageElement).closest(".card")?.remove(); }} />
                    <div className="overlay">
                      <div className="card-actions">
                        <button className="card-action-btn" onClick={e => { e.stopPropagation(); setShowShare(photo); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                      </div>
                      <button className={`save-btn ${isPinned(photo) ? "pinned" : ""}`} onClick={e => { e.stopPropagation(); isPinned(photo) ? null : setShowSaveToBoard(photo); }}>
                        {isPinned(photo) ? "Pinned" : "Save"}
                      </button>
                    </div>
                    <div className="card-footer">
                      {photo.authorAvatar && <img src={photo.authorAvatar} alt={photo.author} onError={e => (e.target as HTMLImageElement).style.display = "none"} />}
                      <span>{photo.author}</span>
                      {/* 👇 УБРАЛИ source-dot */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {displayPhotos.length === 0 && !loading && <div className="empty">{showSaved ? "No pins yet" : "Nothing found"}</div>}
            {!showSaved && <div ref={bottomRef} style={{ padding: "28px", textAlign: "center" }}>{loading && <div className="spinner" />}</div>}
          </>
        )}

        {showMenu && (
          <>
            <div className="burger-overlay" onClick={() => setShowMenu(false)} />
            <div className="burger-panel">
              <div className="burger-header">
                <span className="burger-logo">SCH<span>IE</span>LE</span>
                <button className="burger-close" onClick={() => setShowMenu(false)}>✕</button>
              </div>
              {user && (
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12 }}>
                  {userAvatar ? <img src={userAvatar} style={{ width: 40, height: 40, borderRadius: "50%" }} alt="avatar" /> : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#c0521a", display: "flex", align-items: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>{(userName[0] || "U").toUpperCase()}</div>}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{userName}</div>
                    <a href="/profile" style={{ color: "#999", fontSize: 11, textDecoration: "none" }}>Edit profile</a>
                  </div>
                </div>
              )}
              <div className="burger-section">
                <div className="burger-section-title">Categories</div>
                {categories.map(cat => (
                  <button key={cat} className={`burger-cat ${active === cat && !showSaved && !showBoards && !searchQuery ? "active" : ""}`}
                    onClick={() => { setActive(cat); setShowSaved(false); setShowBoards(false); setSearchQuery(""); setSearch(""); setShowMenu(false); }}>
                    <span className="burger-cat-dot" />{cat}
                  </button>
                ))}
              </div>
              <div className="burger-divider" />
              <button className="burger-action" onClick={() => { setShowBoards(true); setShowSaved(false); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#f0f0f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </span>
                <span style={{ fontWeight: 500 }}>My Boards</span>
                {boards.length > 0 && <span style={{ marginLeft: "auto", background: "#e0e0e0", color: "#555", borderRadius: "10px", padding: "1px 8px", fontSize: "11px" }}>{boards.length}</span>}
              </button>
              <button className="burger-action" onClick={() => { setShowSaved(true); setShowBoards(false); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#fff3ee" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </span>
                <span style={{ fontWeight: 500 }}>Saved Pins</span>
                {pins.length > 0 && <span style={{ marginLeft: "auto", background: "#c0521a", color: "white", borderRadius: "10px", padding: "1px 8px", fontSize: "11px", fontWeight: 700 }}>{pins.length}</span>}
              </button>
              <button className="burger-action" onClick={() => { setShowUpload(true); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#f0f0f0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
                <span style={{ fontWeight: 500 }}>Add Photo</span>
              </button>
              <div className="burger-divider" />
              {user ? (
                <button className="burger-action" onClick={signOut}>
                  <span className="burger-action-icon" style={{ background: "#f0f0f0", color: "#555", fontSize: 14 }}>→</span>
                  <span style={{ fontWeight: 500, color: "#666" }}>Sign out</span>
                </button>
              ) : (
                <a href="/auth" className="burger-action" style={{ textDecoration: "none" }}>
                  <span className="burger-action-icon" style={{ background: "#c0521a", color: "white", fontWeight: 700, fontSize: 14 }}>→</span>
                  <span style={{ fontWeight: 600, color: "#c0521a" }}>Sign In / Register</span>
                </a>
              )}
            </div>
          </>
        )}

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <img src={selected.src} alt={selected.title} className="modal-img" />
              <div className="modal-info">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button className="card-action-btn" style={{ background: "#f0f0f0", width: 36, height: 36 }} onClick={() => { setShowShare(selected); setSelected(null); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div style={{ display: "flex", align-items: "center", gap: 12 }}>
                  {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: 40, height: 40, borderRadius: "50%" }} alt="avatar" onError={e => (e.target as HTMLImageElement).style.display = "none"} />}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{selected.author}</p>
                    <span className="pin-tag">{selected.source}</span>
                  </div>
                </div>
                {selected.title && <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{selected.title}</p>}
                <button className={`primary-btn ${isPinned(selected) ? "pinned-state" : ""}`} onClick={() => isPinned(selected) ? null : setShowSaveToBoard(selected)}>
                  {isPinned(selected) ? "Already pinned" : "Save to board"}
                </button>
                {selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", color: "#999", fontSize: 12, textDecoration: "none" }}>View original ↗</a>}
              </div>
            </div>
          </div>
        )}

        {showSaveToBoard && (
          <div className="modal-backdrop" onClick={() => setShowSaveToBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 14, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Save to board</h2>
                <button className="modal-close" onClick={() => setShowSaveToBoard(null)}>✕</button>
              </div>
              <button className="primary-btn" onClick={() => savePin(showSaveToBoard)}>Save without board</button>
              {boards.length > 0 && <>
                <p style={{ color: "#999", fontSize: 12, textAlign: "center" }}>— or choose a board —</p>
                {boards.map(board => <button key={board.id} className="outline-btn" onClick={() => savePin(showSaveToBoard, board.id)}>{board.name}</button>)}
              </>}
              <button className="ghost-btn" onClick={() => { setShowNewBoard(true); setShowSaveToBoard(null); }}>+ Create new board</button>
            </div>
          </div>
        )}

        {showNewBoard && (
          <div className="modal-backdrop" onClick={() => setShowNewBoard(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>New Board</h2>
                <button className="modal-close" onClick={() => setShowNewBoard(false)}>✕</button>
              </div>
              <input className="field" placeholder="Board name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} />
              <input className="field" placeholder="Description (optional)" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ghost-btn" onClick={() => setShowNewBoard(false)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1, opacity: !newBoardName ? 0.4 : 1 }} onClick={createBoard}>Create</button>
              </div>
            </div>
          </div>
        )}

        {editBoard && (
          <div className="modal-backdrop" onClick={() => setEditBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Board</h2>
                <button className="modal-close" onClick={() => setEditBoard(null)}>✕</button>
              </div>
              <input className="field" placeholder="Board name" value={editBoard.name} onChange={e => setEditBoard({ ...editBoard, name: e.target.value })} />
              <input className="field" placeholder="Description (optional)" value={editBoard.description || ""} onChange={e => setEditBoard({ ...editBoard, description: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ghost-btn" onClick={() => setEditBoard(null)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1 }} onClick={updateBoard}>Save</button>
              </div>
              <button className="danger-btn" onClick={() => { deleteBoard(editBoard.id); setEditBoard(null); }}>Delete board</button>
            </div>
          </div>
        )}

        {showShare && (
          <div className="modal-backdrop" onClick={() => setShowShare(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Share</h2>
                <button className="modal-close" onClick={() => setShowShare(null)}>✕</button>
              </div>
              <img src={showShare.src} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} alt="share" />
              <button className="primary-btn" onClick={() => sharePhoto(showShare)}>Copy link</button>
              {showShare.link && <a href={showShare.link} target="_blank" rel="noopener noreferrer"><button className="outline-btn">View original</button></a>}
            </div>
          </div>
        )}

        {showUpload && (
          <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add Photo</h2>
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

        {shareMsg && <div className="share-toast">{shareMsg}</div>}
      </main>
    </>
  );
}