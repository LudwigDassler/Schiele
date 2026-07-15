"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

const categories = [
  "All", "Nature", "City", "Food", "Travel", "Architecture",
  "Fashion", "Art", "Sports", "Interior", "Animals", "Technology",
  "Music", "Cinema", "Photography", "Beauty",
];

const quotes = [
  { text: "Beauty is truth, truth beauty — that is all ye know on earth, and all ye need to know.", author: "John Keats" },
  { text: "I have measured out my life with coffee spoons.", author: "T.S. Eliot" },
  { text: "Do I dare disturb the universe?", author: "T.S. Eliot" },
  { text: "And all shall be well, and all shall be well, and all manner of thing shall be well.", author: "Julian of Norwich" },
  { text: "The course of true love never did run smooth.", author: "William Shakespeare" },
  { text: "We are all of us walking in the dark, and the candle is love.", author: "Anonymous, 13th century" },
  { text: "I am large, I contain multitudes.", author: "Walt Whitman" },
  { text: "Tell me, what is it you plan to do with your one wild and precious life?", author: "Mary Oliver" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "To be is to do.", author: "Socrates" },
  { text: "The owl of Minerva spreads its wings only with the falling of the dusk.", author: "Hegel" },
  { text: "Man is condemned to be free.", author: "Jean-Paul Sartre" },
  { text: "One must imagine Sisyphus happy.", author: "Albert Camus" },
  { text: "What is now proved was once only imagined.", author: "William Blake" },
  { text: "No man ever steps in the same river twice.", author: "Heraclitus" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "We accept the love we think we deserve.", author: "Stephen Chbosky" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The more I know, the more I know I don't know.", author: "Aristotle" },
  { text: "Everything flows.", author: "Heraclitus" },
];

type Photo = { id: string; src: string; thumb: string; title: string; author: string; authorAvatar: string; source: string; link: string };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

function QuoteCard() {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  return (
    <div style={{
      breakInside: "avoid", marginBottom: 10,
      borderRadius: 14, padding: "24px 20px",
      background: "linear-gradient(135deg, #2a1f0e 0%, #1a1208 100%)",
      border: "1px solid #4a3520",
      display: "flex", flexDirection: "column", gap: 12,
      minHeight: 160,
    }}>
      <span style={{ fontSize: 28, color: "#c0521a", lineHeight: 1, fontFamily: "Georgia, serif" }}>"</span>
      <p style={{ color: "#d4b896", fontSize: 13, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic", flex: 1 }}>{q.text}</p>
      <p style={{ color: "#8a6a4a", fontSize: 11, fontFamily: "Georgia, serif" }}>— {q.author}</p>
    </div>
  );
}

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
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Nature");
  const [newSrc, setNewSrc] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [quotePositions] = useState<number[]>(() => {
    const pos: number[] = [];
    for (let i = 5; i < 200; i += Math.floor(Math.random() * 8) + 5) pos.push(i);
    return pos;
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const activeRequestRef = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchUserData(data.session.user.id);
    });
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

  async function fetchPhotos(query: string, category: string, pageNum: number, reset: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, page: String(pageNum) });
      if (query) params.set("query", query);
      const res = await fetch(`/api/photos?${params}`);
      const data = await res.json();
      const fetched = (data.photos || []).filter((p: Photo) => p.src && p.src.startsWith("http"));
      setPhotos(prev => reset ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length >= 15);
    } catch (e) { console.error(e); }
    setLoading(false);
    loadingRef.current = false;
  }

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setPhotos([]);
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
    setShowSaved(false);
    setShowBoards(false);
  }

  function clearSearch() {
    setSearch("");
    setSearchQuery("");
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
    setPhotos(prev => [{ id: String(Date.now()), src: newSrc!, thumb: newSrc!, title: newTitle, author: user?.email || "Anonymous", authorAvatar: "", source: "user", link: "" }, ...prev]);
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

  async function deletePin(pinId: string) {
    await fetch(`/api/pins?id=${pinId}`, { method: "DELETE" });
    setPins(prev => prev.filter(p => p.id !== pinId));
  }

  async function createBoard() {
    if (!newBoardName || !user) return;
    const res = await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, name: newBoardName, description: newBoardDesc }) });
    const data = await res.json();
    if (data.board) setBoards(prev => [data.board, ...prev]);
    setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false);
  }

  async function updateBoard() {
    if (!editBoard) return;
    const res = await fetch("/api/boards", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editBoard.id, name: editBoard.name, description: editBoard.description }) });
    const data = await res.json();
    if (data.board) setBoards(prev => prev.map(b => b.id === editBoard.id ? data.board : b));
    setEditBoard(null);
  }

  async function deleteBoard(boardId: string) {
    if (!confirm("Delete this board?")) return;
    await fetch(`/api/boards?id=${boardId}`, { method: "DELETE" });
    setBoards(prev => prev.filter(b => b.id !== boardId));
  }

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) navigator.share({ title: photo.title, url });
    else { navigator.clipboard.writeText(url); setShareMsg("Link copied!"); setTimeout(() => setShareMsg(""), 2000); }
    setShowShare(null);
  }

  async function signOut() { await supabase.auth.signOut(); setPins([]); setBoards([]); }

  const displayPhotos = showSaved
    ? pins.map(p => ({ id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", author: "", authorAvatar: "", source: "", link: p.source_url || "" }))
    : photos;

  const userAvatar = user?.user_metadata?.avatar_url || "";
  const userName = user?.user_metadata?.full_name || user?.email || "";

  // Вставляем цитаты в ленту
  const feedItems: Array<{ type: "photo"; data: Photo } | { type: "quote" }> = [];
  displayPhotos.forEach((photo, i) => {
    feedItems.push({ type: "photo", data: photo });
    if (quotePositions.includes(i)) feedItems.push({ type: "quote" });
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #0d0a06; font-family: -apple-system, sans-serif; }

        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,10,6,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #2a1f0e;
          padding: 10px 16px;
          display: flex; align-items: center; gap: 10px;
        }

        .logo {
          font-family: 'Cinzel', Georgia, serif;
          font-size: 16px; font-weight: 700;
          color: #c0521a; letter-spacing: 4px;
          text-transform: uppercase;
          flex-shrink: 0; cursor: pointer;
          user-select: none;
          text-shadow: 0 0 20px rgba(192,82,26,0.4);
        }

        .search-wrap {
          flex: 1; display: flex;
          background: #1a1208; border-radius: 24px;
          overflow: hidden; border: 1px solid #2a1f0e;
          transition: all 0.2s; min-width: 0;
        }
        .search-wrap:focus-within { border-color: #c0521a; box-shadow: 0 0 0 2px rgba(192,82,26,0.2); }
        .search-input { flex: 1; padding: 9px 14px; background: transparent; border: none; color: #d4b896; font-size: 14px; outline: none; min-width: 0; }
        .search-input::placeholder { color: #4a3520; }
        .search-btn { padding: 9px 14px; background: transparent; border: none; color: #6a4a2a; cursor: pointer; transition: color 0.2s; }
        .search-btn:hover { color: #c0521a; }

        .hbtn {
          background: transparent; border: none;
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6a4a2a; flex-shrink: 0;
          transition: all 0.2s; position: relative;
        }
        .hbtn:hover { background: #1a1208; color: #c0521a; }
        .hbtn.active { background: #c0521a; color: #0d0a06; }
        .badge { position: absolute; top: 2px; right: 2px; background: #c0521a; color: #0d0a06; border-radius: 10px; padding: 1px 5px; font-size: 9px; font-weight: 700; border: 2px solid #0d0a06; }

        .avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #2a1f0e; flex-shrink: 0; object-fit: cover; }
        .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #2a1f0e; flex-shrink: 0; background: #c0521a; display: flex; align-items: center; justify-content: center; color: #0d0a06; font-size: 13px; font-weight: 700; }
        .sign-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 20px; padding: 8px 16px; cursor: pointer; font-size: 12px; font-weight: 700; flex-shrink: 0; text-decoration: none; display: flex; align-items: center; letter-spacing: 0.5px; }

        /* BURGER */
        .burger-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.7); animation: fadeIn 0.2s ease; }
        .burger-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(300px, 85vw); z-index: 151; background: #0d0a06; border-right: 1px solid #2a1f0e; display: flex; flex-direction: column; animation: slideRight 0.25s ease; overflow-y: auto; }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .burger-header { padding: 20px 20px 16px; border-bottom: 1px solid #2a1f0e; display: flex; align-items: center; justify-content: space-between; }
        .burger-logo { font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #c0521a; text-transform: uppercase; }
        .burger-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #4a3520; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: color 0.2s; }
        .burger-close:hover { color: #c0521a; }
        .burger-section { padding: 16px 16px 8px; }
        .burger-section-title { font-size: 10px; font-weight: 700; color: #4a3520; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-family: 'Cinzel', serif; }
        .burger-cat { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: none; background: none; width: 100%; text-align: left; color: #8a6a4a; font-size: 13px; font-family: -apple-system, sans-serif; }
        .burger-cat:hover { background: #1a1208; color: #d4b896; }
        .burger-cat.active { background: #1a1208; color: #c0521a; font-weight: 600; }
        .burger-cat-dot { width: 6px; height: 6px; border-radius: 50%; background: #2a1f0e; flex-shrink: 0; }
        .burger-cat.active .burger-cat-dot { background: #c0521a; }
        .burger-divider { height: 1px; background: #1a1208; margin: 8px 0; }
        .burger-action { display: flex; align-items: center; gap: 12px; padding: 11px 16px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; color: #8a6a4a; font-size: 13px; font-family: -apple-system, sans-serif; transition: all 0.15s; }
        .burger-action:hover { background: #1a1208; color: #d4b896; }
        .burger-action-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* GRID */
        .grid-wrap { padding: 10px; }
        .masonry { columns: 2; gap: 8px; }
        @media (min-width: 480px) { .masonry { columns: 3; } }
        @media (min-width: 768px) { .masonry { columns: 4; } }
        @media (min-width: 1024px) { .masonry { columns: 5; } }
        @media (min-width: 1280px) { .masonry { columns: 6; } }

        .card { break-inside: avoid; margin-bottom: 8px; border-radius: 12px; overflow: hidden; background: #1a1208; position: relative; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid #2a1f0e; }
        .card:hover { transform: scale(1.02); box-shadow: 0 8px 32px rgba(192,82,26,0.15); z-index: 10; }
        .card:hover .overlay { opacity: 1; }
        .card img { width: 100%; display: block; height: auto; background: #1a1208; }
        .overlay { opacity: 0; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.6) 100%); transition: opacity 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; }
        .save-btn { align-self: flex-end; background: #c0521a; color: #0d0a06; border: none; border-radius: 16px; padding: 6px 14px; cursor: pointer; font-weight: 700; font-size: 11px; transition: all 0.15s; letter-spacing: 0.5px; }
        .save-btn:hover { background: #d4621a; transform: scale(1.05); }
        .save-btn.pinned { background: rgba(192,82,26,0.2); color: #c0521a; border: 1px solid #c0521a; }
        .delete-pin-btn { align-self: flex-start; background: rgba(200,50,50,0.8); color: white; border: none; border-radius: 16px; padding: 5px 10px; cursor: pointer; font-weight: 700; font-size: 10px; }
        .card-actions { display: flex; gap: 6px; align-self: flex-start; }
        .card-action-btn { background: rgba(13,10,6,0.7); border: none; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; color: #d4b896; }
        .card-action-btn:hover { background: rgba(192,82,26,0.8); color: #0d0a06; }
        .card-footer { padding: 6px 8px; display: flex; align-items: center; gap: 6px; background: #1a1208; border-top: 1px solid #2a1f0e; }
        .card-footer img { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
        .card-footer span { color: #4a3520; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* MODAL */
        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.2s ease; }
        .modal-box { background: #0d0a06; border: 1px solid #2a1f0e; border-radius: 16px; overflow: hidden; max-width: 900px; width: 100%; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 32px 80px rgba(0,0,0,0.8); animation: slideUp 0.25s ease; }
        @media (min-width: 640px) { .modal-box { flex-direction: row; } }
        .modal-img { width: 100%; max-height: 45vh; object-fit: cover; display: block; background: #1a1208; }
        @media (min-width: 640px) { .modal-img { width: 55%; max-height: 90vh; } }
        .modal-info { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; background: #0d0a06; }

        .primary-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 20px; padding: 13px 24px; cursor: pointer; font-weight: 700; font-size: 14px; width: 100%; transition: background 0.2s; letter-spacing: 0.5px; }
        .primary-btn:hover { background: #d4621a; }
        .primary-btn.pinned-state { background: #1a1208; color: #c0521a; border: 1px solid #c0521a; }
        .ghost-btn { background: transparent; color: #8a6a4a; border: 1px solid #2a1f0e; border-radius: 20px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 14px; flex: 1; transition: all 0.2s; }
        .ghost-btn:hover { border-color: #4a3520; color: #d4b896; }
        .outline-btn { background: transparent; color: #c0521a; border: 1px solid #c0521a; border-radius: 20px; padding: 11px 24px; cursor: pointer; font-weight: 600; font-size: 14px; width: 100%; transition: all 0.2s; }
        .outline-btn:hover { background: rgba(192,82,26,0.1); }
        .danger-btn { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; border-radius: 20px; padding: 11px 24px; cursor: pointer; font-weight: 600; font-size: 14px; width: 100%; transition: all 0.2s; }
        .danger-btn:hover { background: rgba(229,62,62,0.1); }

        .upload-zone { border: 1px dashed #2a1f0e; border-radius: 12px; height: 160px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; transition: all 0.2s; background: #1a1208; }
        .upload-zone:hover { border-color: #c0521a; }
        .field { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #2a1f0e; background: #1a1208; color: #d4b896; font-size: 14px; outline: none; transition: all 0.2s; }
        .field:focus { border-color: #c0521a; box-shadow: 0 0 0 2px rgba(192,82,26,0.15); }

        .boards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 480px) { .boards-grid { grid-template-columns: repeat(3, 1fr); } }
        .board-card { border-radius: 10px; overflow: hidden; border: 1px solid #2a1f0e; background: #1a1208; }
        .board-cover { height: 70px; background: linear-gradient(135deg, #2a1f0e, #1a1208); display: flex; align-items: center; justify-content: center; }
        .board-info { padding: 10px; }
        .board-name { font-size: 12px; font-weight: 600; color: #d4b896; }
        .board-count { font-size: 10px; color: #4a3520; margin-top: 2px; }
        .board-actions { display: flex; gap: 6px; margin-top: 8px; }
        .board-edit-btn { flex: 1; padding: 5px; border-radius: 6px; border: 1px solid #2a1f0e; background: transparent; cursor: pointer; font-size: 10px; color: #8a6a4a; transition: all 0.2s; }
        .board-edit-btn:hover { border-color: #c0521a; color: #c0521a; }
        .board-del-btn { flex: 1; padding: 5px; border-radius: 6px; border: 1px solid #3a1a1a; background: transparent; cursor: pointer; font-size: 10px; color: #e53e3e; transition: all 0.2s; }
        .board-del-btn:hover { background: rgba(229,62,62,0.1); }

        .spinner { width: 24px; height: 24px; border: 2px solid #2a1f0e; border-top-color: #c0521a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-bar { padding: 8px 16px; font-size: 12px; color: #4a3520; border-bottom: 1px solid #1a1208; display: flex; align-items: center; gap: 10px; background: #0d0a06; }
        .status-bar button { background: none; border: none; color: #2a1f0e; cursor: pointer; font-size: 14px; transition: color 0.2s; }
        .status-bar button:hover { color: #c0521a; }
        .empty { text-align: center; padding: 80px 20px; color: #2a1f0e; font-size: 15px; font-family: 'Crimson Text', Georgia, serif; font-style: italic; }
        .modal-close { background: none; border: none; color: #4a3520; cursor: pointer; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .modal-close:hover { background: #1a1208; color: #c0521a; }
        .share-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #c0521a; color: #0d0a06; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; z-index: 300; letter-spacing: 0.5px; }
        .pin-tag { display: inline-block; background: rgba(192,82,26,0.15); color: #c0521a; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 600; border: 1px solid rgba(192,82,26,0.3); }

        /* Ornamental divider */
        .ornament { text-align: center; color: #2a1f0e; font-size: 18px; letter-spacing: 8px; padding: 4px 0; }
      `}</style>

      <main style={{ minHeight: "100vh", background: "#0d0a06" }}>
        {/* Header */}
        <header className="header">
          <button className="hbtn" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <span className="logo" onClick={() => { setShowSaved(false); setShowBoards(false); clearSearch(); setActive("All"); }}>
            SCHIELE
          </span>

          <form style={{ flex: 1, display: "flex", minWidth: 0 }} onSubmit={handleSearch}>
            <div className="search-wrap">
              <input className="search-input" placeholder="Search artists, musicians, writers..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button type="button" onClick={clearSearch} className="search-btn" style={{ fontSize: 16 }}>✕</button>}
              <button type="submit" className="search-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </form>

          <button className={`hbtn ${showBoards ? "active" : ""}`} onClick={() => { setShowBoards(!showBoards); setShowSaved(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>

          <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => { setShowSaved(!showSaved); setShowBoards(false); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={showSaved ? "#0d0a06" : "none"} stroke={showSaved ? "#0d0a06" : "currentColor"} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {pins.length > 0 && <span className="badge">{pins.length}</span>}
          </button>

          <button className="hbtn" onClick={() => setShowUpload(true)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          {user ? (
            <a href="/profile">
              {userAvatar ? <img src={userAvatar} className="avatar" alt="avatar" /> : <div className="avatar-placeholder">{(userName[0] || "U").toUpperCase()}</div>}
            </a>
          ) : (
            <a href="/auth" className="sign-btn">Enter</a>
          )}
        </header>

        {/* Status bar */}
        {(searchQuery || showSaved || showBoards) && (
          <div className="status-bar">
            {searchQuery && <><span style={{ color: "#8a6a4a" }}>Results for <span style={{ color: "#c0521a", fontStyle: "italic" }}>"{searchQuery}"</span></span><button onClick={clearSearch}>✕</button></>}
            {showSaved && <span style={{ color: "#8a6a4a" }}>Saved: <span style={{ color: "#c0521a" }}>{pins.length}</span></span>}
            {showBoards && <span style={{ color: "#8a6a4a" }}>Boards: <span style={{ color: "#c0521a" }}>{boards.length}</span></span>}
          </div>
        )}

        {/* Boards view */}
        {showBoards && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, Georgia, serif", letterSpacing: 2 }}>MY BOARDS</h2>
              <button className="primary-btn" style={{ width: "auto", padding: "8px 16px", fontSize: 12 }} onClick={() => setShowNewBoard(true)}>+ New Board</button>
            </div>
            {boards.length === 0
              ? <div className="empty">No boards yet. Create your first collection.</div>
              : <div className="boards-grid">
                  {boards.map(board => (
                    <div key={board.id} className="board-card">
                      <div className="board-cover">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      </div>
                      <div className="board-info">
                        <div className="board-name">{board.name}</div>
                        {board.description && <div style={{ fontSize: 10, color: "#4a3520", marginTop: 2, fontStyle: "italic" }}>{board.description}</div>}
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

        {/* Main grid */}
        {!showBoards && (
          <>
            <div className="grid-wrap">
              <div className="masonry">
                {feedItems.map((item, i) =>
                  item.type === "quote" ? (
                    <QuoteCard key={`quote-${i}`} />
                  ) : (
                    <div key={item.data.id} className="card" onClick={() => setSelected(item.data)}>
                      <img
                        src={item.data.src}
                        alt=""
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).closest(".card")?.remove(); }}
                      />
                      <div className="overlay">
                        <div className="card-actions">
                          <button className="card-action-btn" onClick={e => { e.stopPropagation(); setShowShare(item.data); }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          </button>
                          {showSaved && <button className="delete-pin-btn" onClick={e => { e.stopPropagation(); deletePin(item.data.id); }}>✕</button>}
                        </div>
                        <button className={`save-btn ${isPinned(item.data) ? "pinned" : ""}`} onClick={e => { e.stopPropagation(); isPinned(item.data) ? null : setShowSaveToBoard(item.data); }}>
                          {isPinned(item.data) ? "Saved" : "Save"}
                        </button>
                      </div>
                      {item.data.author && (
                        <div className="card-footer">
                          {item.data.authorAvatar && <img src={item.data.authorAvatar} alt="" onError={e => (e.target as HTMLImageElement).style.display = "none"} />}
                          <span>{item.data.author}</span>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
            {displayPhotos.length === 0 && !loading && <div className="empty">{showSaved ? "No saved pins yet." : "Nothing found."}</div>}
            {!showSaved && <div ref={bottomRef} style={{ padding: "28px", textAlign: "center" }}>{loading && <div className="spinner" />}</div>}
          </>
        )}

        {/* Burger Menu */}
        {showMenu && (
          <>
            <div className="burger-overlay" onClick={() => setShowMenu(false)} />
            <div className="burger-panel">
              <div className="burger-header">
                <span className="burger-logo">SCHIELE</span>
                <button className="burger-close" onClick={() => setShowMenu(false)}>✕</button>
              </div>
              {user && (
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1208", display: "flex", alignItems: "center", gap: 12 }}>
                  {userAvatar ? <img src={userAvatar} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #2a1f0e" }} alt="avatar" /> : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c0521a", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0a06", fontWeight: 700 }}>{(userName[0] || "U").toUpperCase()}</div>}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#d4b896" }}>{userName}</div>
                    <a href="/profile" style={{ color: "#4a3520", fontSize: 11, textDecoration: "none" }}>Edit profile</a>
                  </div>
                </div>
              )}
              <div className="burger-section">
                <div className="burger-section-title">Discover</div>
                {categories.map(cat => (
                  <button key={cat} className={`burger-cat ${active === cat && !showSaved && !showBoards && !searchQuery ? "active" : ""}`}
                    onClick={() => { setActive(cat); setShowSaved(false); setShowBoards(false); clearSearch(); setShowMenu(false); }}>
                    <span className="burger-cat-dot" />{cat}
                  </button>
                ))}
              </div>
              <div className="burger-divider" />
              <button className="burger-action" onClick={() => { setShowBoards(true); setShowSaved(false); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#1a1208", color: "#c0521a" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </span>
                <span>My Boards</span>
                {boards.length > 0 && <span style={{ marginLeft: "auto", background: "#1a1208", color: "#c0521a", borderRadius: "10px", padding: "1px 8px", fontSize: "11px", border: "1px solid #2a1f0e" }}>{boards.length}</span>}
              </button>
              <button className="burger-action" onClick={() => { setShowSaved(true); setShowBoards(false); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#1a1208", color: "#c0521a" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </span>
                <span>Saved Pins</span>
                {pins.length > 0 && <span style={{ marginLeft: "auto", background: "#c0521a", color: "#0d0a06", borderRadius: "10px", padding: "1px 8px", fontSize: "11px", fontWeight: 700 }}>{pins.length}</span>}
              </button>
              <button className="burger-action" onClick={() => { setShowUpload(true); setShowMenu(false); }}>
                <span className="burger-action-icon" style={{ background: "#1a1208", color: "#8a6a4a" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
                <span>Add Photo</span>
              </button>
              <div className="burger-divider" />
              {user ? (
                <button className="burger-action" onClick={signOut}>
                  <span className="burger-action-icon" style={{ background: "#1a1208", color: "#4a3520" }}>→</span>
                  <span style={{ color: "#4a3520" }}>Sign out</span>
                </button>
              ) : (
                <a href="/auth" className="burger-action" style={{ textDecoration: "none" }}>
                  <span className="burger-action-icon" style={{ background: "#c0521a", color: "#0d0a06", fontWeight: 700 }}>→</span>
                  <span style={{ color: "#c0521a", fontWeight: 600 }}>Sign In / Register</span>
                </a>
              )}
            </div>
          </>
        )}

        {/* Modal - View */}
        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <img src={selected.src} alt="" className="modal-img" />
              <div className="modal-info">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button className="card-action-btn" style={{ background: "#1a1208", width: 34, height: 34 }} onClick={() => { setShowShare(selected); setSelected(null); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                {selected.author && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {selected.authorAvatar && <img src={selected.authorAvatar} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #2a1f0e" }} alt="" onError={e => (e.target as HTMLImageElement).style.display = "none"} />}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "#d4b896" }}>{selected.author}</p>
                      {selected.source && <span className="pin-tag">{selected.source}</span>}
                    </div>
                  </div>
                )}
                {selected.title && <p style={{ color: "#6a4a2a", fontSize: 13, lineHeight: 1.6, fontFamily: "Crimson Text, Georgia, serif", fontStyle: "italic" }}>{selected.title}</p>}
                <button className={`primary-btn ${isPinned(selected) ? "pinned-state" : ""}`} onClick={() => isPinned(selected) ? null : setShowSaveToBoard(selected)}>
                  {isPinned(selected) ? "Already saved" : "Save"}
                </button>
                {selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", color: "#4a3520", fontSize: 11, textDecoration: "none" }}>View source ↗</a>}
              </div>
            </div>
          </div>
        )}

        {/* Modal - Save to board */}
        {showSaveToBoard && (
          <div className="modal-backdrop" onClick={() => setShowSaveToBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 12, maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>SAVE TO BOARD</h2>
                <button className="modal-close" onClick={() => setShowSaveToBoard(null)}>✕</button>
              </div>
              <button className="primary-btn" onClick={() => savePin(showSaveToBoard)}>Save without board</button>
              {boards.length > 0 && <>
                <p style={{ color: "#4a3520", fontSize: 11, textAlign: "center" }}>— or choose a board —</p>
                {boards.map(board => <button key={board.id} className="outline-btn" onClick={() => savePin(showSaveToBoard, board.id)}>{board.name}</button>)}
              </>}
              <button className="ghost-btn" onClick={() => { setShowNewBoard(true); setShowSaveToBoard(null); }}>+ Create new board</button>
            </div>
          </div>
        )}

        {/* Modal - New board */}
        {showNewBoard && (
          <div className="modal-backdrop" onClick={() => setShowNewBoard(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>NEW BOARD</h2>
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

        {/* Modal - Edit board */}
        {editBoard && (
          <div className="modal-backdrop" onClick={() => setEditBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>EDIT BOARD</h2>
                <button className="modal-close" onClick={() => setEditBoard(null)}>✕</button>
              </div>
              <input className="field" placeholder="Board name" value={editBoard.name} onChange={e => setEditBoard({ ...editBoard, name: e.target.value })} />
              <input className="field" placeholder="Description" value={editBoard.description || ""} onChange={e => setEditBoard({ ...editBoard, description: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ghost-btn" onClick={() => setEditBoard(null)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1 }} onClick={updateBoard}>Save</button>
              </div>
              <button className="danger-btn" onClick={() => { deleteBoard(editBoard.id); setEditBoard(null); }}>Delete board</button>
            </div>
          </div>
        )}

        {/* Modal - Share */}
        {showShare && (
          <div className="modal-backdrop" onClick={() => setShowShare(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>SHARE</h2>
                <button className="modal-close" onClick={() => setShowShare(null)}>✕</button>
              </div>
              <img src={showShare.src} style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }} alt="" />
              <button className="primary-btn" onClick={() => sharePhoto(showShare)}>Copy link</button>
              {showShare.link && <a href={showShare.link} target="_blank" rel="noopener noreferrer"><button className="outline-btn">View original</button></a>}
            </div>
          </div>
        )}

        {/* Modal - Upload */}
        {showUpload && (
          <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 24, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>ADD PHOTO</h2>
                <button className="modal-close" onClick={() => setShowUpload(false)}>✕</button>
              </div>
              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                {newSrc ? <img src={newSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="preview" /> : <span style={{ color: "#2a1f0e", fontSize: 13 }}>Click to select photo</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              <input className="field" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
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
