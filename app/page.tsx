"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

const defaultTags = [
  "Aesthetic", "Dark Academia", "Cyberpunk", "Minimalism",
  "Architecture", "Street Photography", "Vintage", "Interior"
];

const aiVibes = [
  "Melancholic Soviet Post-Punk", "Ethereal Dreamcore", 
  "Cinematic Neon Noir", "Liminal Poolrooms", 
  "Gothic Renaissance", "Y2K Nostalgia Grunge"
];

type Photo = { id: string; src: string; thumb: string; title: string; link: string };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("Aesthetic");
  const [userTags, setUserTags] = useState<string[]>([]);
  
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selected, setSelected] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [relatedPhotos, setRelatedPhotos] = useState<Photo[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedHasMore, setRelatedHasMore] = useState(true);
  
  const [showSaved, setShowSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showShare, setShowShare] = useState<Photo | null>(null);
  const [showSaveToBoard, setShowSaveToBoard] = useState<Photo | null>(null);
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const modalBottomRef = useRef<HTMLDivElement>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchUserData(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
    });
    
    try {
      const savedTags = localStorage.getItem("gelbet_user_tags");
      if (savedTags) setUserTags(JSON.parse(savedTags));
    } catch (e) {}
    
    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const [pinsRes, boardsRes] = await Promise.all([
        fetch(`/api/pins?user_id=${userId}`).catch(() => null),
        fetch(`/api/boards?user_id=${userId}`).catch(() => null)
      ]);
      if (pinsRes?.ok) { const d = await pinsRes.json(); setPins(d.pins || d.data || []); }
      if (boardsRes?.ok) { const d = await boardsRes.json(); setBoards(d.boards || d.data || []); }
    } catch (e) { console.error("Sync Error:", e); }
  }

  const fetchPhotos = useCallback(async (query: string, pageNum: number, reset: boolean) => {
    if (!reset && loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    if (reset) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }

    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (query) params.set("query", query);
      const res = await fetch(`/api/search?${params}`, { signal: abortControllerRef.current?.signal });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || []);
      const fetched = rawArray.filter((p: any) => p.src && p.src.startsWith("http"));
      
      setPhotos(prev => {
        const combined = reset ? fetched : [...prev, ...fetched];
        const map = new Map();
        combined.forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
      setHasMore(fetched.length > 0);
    } catch (e: any) { 
      if (e.name !== 'AbortError') console.error(e); 
    } finally {
      if (!(reset && abortControllerRef.current?.signal.aborted)) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, []);

  // ИИ-СЕЛЕКЦИЯ V3.0: Мультиязычный умный парсер
  const fetchRelatedPhotos = useCallback(async (basePhoto: Photo, pageNum: number, reset: boolean) => {
    setRelatedLoading(true);
    if (reset) {
      if (relatedAbortRef.current) relatedAbortRef.current.abort();
      relatedAbortRef.current = new AbortController();
    }

    try {
      // Жесткая фильтрация мусора из названия картинки (RUS + ENG)
      const stopWords = new Set([
        "photo", "image", "picture", "wallpaper", "background", "free", "download", "high", "resolution", 
        "by", "of", "the", "in", "on", "a", "and", "is", "with", "for", "hd", "4k", "stock", "quality", "cinematic", "aesthetic",
        "из", "и", "в", "на", "под", "с", "как", "это", "что", "фото", "картинка", "обои", "эстетика", "для"
      ]);
      
      const rawWords = (basePhoto.title || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/g, "").split(/\s+/);
      const keywords = Array.from(new Set(rawWords.filter(w => w.length > 2 && !stopWords.has(w)))).slice(0, 3);
      
      let aiQuery = "";
      if (keywords.length > 0) {
        aiQuery = keywords.join(" ");
        // Добавляем только самое первое слово из базового поиска для контекста
        const baseVibeWord = searchQuery.toLowerCase().replace(/aesthetic/g, "").trim().split(/\s+/)[0];
        if (baseVibeWord && !aiQuery.includes(baseVibeWord)) {
            aiQuery = `${baseVibeWord} ${aiQuery}`;
        }
      } else {
        // Fallback если парсер вырезал вообще всё
        aiQuery = `${searchQuery.split(/\s+/)[0]} mood`;
      }

      // Чистим двойные пробелы
      aiQuery = aiQuery.replace(/\s+/g, ' ').trim();

      const params = new URLSearchParams({ page: String(pageNum), query: aiQuery });
      const res = await fetch(`/api/search?${params}`, { signal: relatedAbortRef.current?.signal });
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || []);
      
      // Анти-двойник фильтр по ссылке
      const fetched = rawArray.filter((p: any) => p.src && p.src.startsWith("http") && p.src !== basePhoto.src && p.id !== basePhoto.id);
      
      setRelatedPhotos(prev => {
        const combined = reset ? fetched : [...prev, ...fetched];
        const map = new Map();
        combined.forEach(p => map.set(p.src, p)); 
        return Array.from(map.values());
      });
      setRelatedHasMore(fetched.length > 0);
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error("Related fetch error", e);
    } finally {
      setRelatedLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setPage(1); setHasMore(true); setPhotos([]); 
    fetchPhotos(searchQuery, 1, true);
  }, [searchQuery, fetchPhotos]);

  useEffect(() => {
    if (!bottomRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
        const next = page + 1;
        setPage(next);
        fetchPhotos(searchQuery, next, false);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, searchQuery, fetchPhotos]);

  useEffect(() => {
    if (!selected) return;
    setRelatedPhotos([]);
    setRelatedPage(1);
    setRelatedHasMore(true);
    fetchRelatedPhotos(selected, 1, true);
  }, [selected?.id, fetchRelatedPhotos]);

  useEffect(() => {
    if (!selected || !modalBottomRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && relatedHasMore && !relatedLoading) {
        const next = relatedPage + 1;
        setRelatedPage(next);
        fetchRelatedPhotos(selected, next, false);
      }
    }, { threshold: 0.1 });
    observer.observe(modalBottomRef.current);
    return () => observer.disconnect();
  }, [selected, relatedHasMore, relatedLoading, relatedPage, fetchRelatedPhotos]);

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2500); }

  function saveUserTag(tag: string) {
    const formattedTag = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1);
    setUserTags(prev => {
      const updated = [formattedTag, ...prev.filter(t => t.toLowerCase() !== formattedTag.toLowerCase())].slice(0, 8);
      localStorage.setItem("gelbet_user_tags", JSON.stringify(updated));
      return updated;
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearchQuery(search.trim()); saveUserTag(search.trim());
    setIsMobileSearchOpen(false); closeAllPanels();
  }

  function handleTagClick(tag: string) {
    setSearch(tag); setSearchQuery(tag); saveUserTag(tag); closeAllPanels();
  }

  function clearSearch() { setSearch(""); setSearchQuery("Aesthetic"); setIsMobileSearchOpen(false); closeAllPanels(); }

  // Обновленный обработчик ручного AI-поиска
  function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setShowAIModal(false); showToast("✨ Synthesizing vibe...");
    setTimeout(() => {
      let query = aiPrompt.trim();
      // Защита: не добавляем английский мусор, если юзер пишет на русском
      if (!/[а-яА-ЯёЁ]/.test(query) && !query.toLowerCase().includes('aesthetic')) {
         query += " aesthetic";
      }
      setSearch(query); setSearchQuery(query); saveUserTag(query); setAiPrompt("");
    }, 800);
  }

  function closeAllPanels() { setShowMenu(false); setShowSaved(false); setShowBoards(false); }

  async function savePin(photo: Photo, boardId?: string) {
    if (!user) { window.location.href = "/auth"; return; }
    try {
      const res = await fetch("/api/pins", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, board_id: boardId || null, source_url: photo.link })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]);
        showToast("Saved to profile");
      }
    } catch (e) {}
    setShowSaveToBoard(null); setSelected(null);
  }

  async function deletePin(pinId: string) {
    try {
      const res = await fetch(`/api/pins?id=${pinId}`, { method: "DELETE" });
      if (res.ok) { setPins(prev => prev.filter(p => p.id !== pinId)); showToast("Removed from saved"); }
    } catch (e) {}
  }

  async function createBoard() {
    if (!newBoardName || !user) return;
    try {
      const res = await fetch("/api/boards", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ user_id: user.id, name: newBoardName, description: newBoardDesc }) 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.board || data.data) setBoards(prev => [data.board || data.data, ...prev]);
      }
    } catch (e) {}
    setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false);
  }

  async function updateBoard() {
    if (!editBoard) return;
    try {
      const res = await fetch("/api/boards", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id: editBoard.id, name: editBoard.name, description: editBoard.description }) 
      });
      if (res.ok) {
        const data = await res.json();
        const updatedBoard = data.board || data.data;
        if (updatedBoard) setBoards(prev => prev.map(b => b.id === editBoard.id ? updatedBoard : b));
      }
    } catch (e) { console.error("Error updating board:", e); }
    setEditBoard(null);
  }

  async function deleteBoard(boardId: string) {
    if (!confirm("Delete this board?")) return;
    try {
      const res = await fetch(`/api/boards?id=${boardId}`, { method: "DELETE" });
      if (res.ok) setBoards(prev => prev.filter(b => b.id !== boardId));
    } catch (e) { console.error("Error deleting board:", e); }
  }

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) navigator.share({ title: photo.title || "Gelbet Vibe", url });
    else { navigator.clipboard.writeText(url); showToast("Link copied to clipboard!"); }
    setShowShare(null);
  }

  async function signOut() { await supabase.auth.signOut(); setPins([]); setBoards([]); closeAllPanels(); }

  const displayPhotos = showSaved
    ? pins.map(p => ({ id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", link: p.source_url || "" }))
    : photos;

  const userAvatar = user?.user_metadata?.avatar_url || "";
  const userName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #0d0a06; font-family: -apple-system, sans-serif; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d0a06; }
        ::-webkit-scrollbar-thumb { background: #2a1f0e; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #c0521a; }
        * { scrollbar-width: thin; scrollbar-color: #2a1f0e #0d0a06; }

        body::after {
          content: ""; position: fixed; inset: 0; z-index: 9999;
          pointer-events: none; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,10,6,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid #2a1f0e; padding: 10px 16px;
          display: flex; align-items: center; gap: 10px;
        }

        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 700; color: #c0521a; letter-spacing: 4px; text-transform: uppercase; flex-shrink: 0; cursor: pointer; user-select: none; text-shadow: 0 0 20px rgba(192,82,26,0.4); }

        .search-form { flex: 1; display: flex; min-width: 0; justify-content: flex-end; }
        .search-wrap { flex: 1; display: flex; background: #1a1208; border-radius: 24px; overflow: hidden; border: 1px solid #2a1f0e; transition: all 0.2s; min-width: 0; }
        .search-wrap:focus-within { border-color: #c0521a; box-shadow: 0 0 0 2px rgba(192,82,26,0.2); }
        .search-input { width: 100%; padding: 9px 14px; background: transparent; border: none; color: #d4b896; font-size: 14px; outline: none; }
        .search-input::placeholder { color: #4a3520; }
        .search-btn { width: 40px; height: 100%; padding: 0; background: transparent; border: none; color: #6a4a2a; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .search-btn:hover { color: #c0521a; }

        @media (max-width: 640px) {
          .search-form { flex: none; }
          .search-wrap { width: 38px; height: 38px; flex: none; border-radius: 50%; background: transparent; border: none; cursor: pointer; }
          .search-input { display: none; }
          .search-btn { width: 38px; height: 38px; border-radius: 50%; pointer-events: none; } 
          .search-form.mobile-active { position: absolute; left: 16px; right: 16px; top: 10px; z-index: 200; flex: 1; }
          .search-form.mobile-active .search-wrap { width: 100%; height: 42px; border-radius: 24px; background: #0d0a06; border: 1px solid #c0521a; flex: 1; display: flex; cursor: text; box-shadow: 0 10px 30px rgba(0,0,0,0.9); }
          .search-form.mobile-active .search-input { display: block; flex: 1; }
          .search-form.mobile-active .search-btn { border-radius: 0; width: 40px; pointer-events: auto; }
        }

        .hbtn { background: transparent; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6a4a2a; flex-shrink: 0; transition: all 0.2s; position: relative; }
        .hbtn:hover { background: #1a1208; color: #c0521a; }
        .hbtn.active { background: #c0521a; color: #0d0a06; }
        .badge { position: absolute; top: 2px; right: 2px; background: #c0521a; color: #0d0a06; border-radius: 10px; padding: 1px 5px; font-size: 9px; font-weight: 700; border: 2px solid #0d0a06; }

        .avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #2a1f0e; flex-shrink: 0; object-fit: cover; }
        .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #2a1f0e; flex-shrink: 0; background: #c0521a; display: flex; align-items: center; justify-content: center; color: #0d0a06; font-size: 13px; font-weight: 700; }
        .sign-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 20px; padding: 8px 16px; cursor: pointer; font-size: 12px; font-weight: 700; flex-shrink: 0; text-decoration: none; display: flex; align-items: center; }

        .tags-bar { display: flex; gap: 8px; padding: 12px 16px; align-items: center; overflow-x: auto; scrollbar-width: none; background: #0d0a06; border-bottom: 1px solid #1a1208; }
        .tags-bar::-webkit-scrollbar { display: none; }
        .tag-pill { background: #1a1208; border: 1px solid #2a1f0e; color: #d4b896; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.2s; }
        .tag-pill:hover { background: #2a1f0e; color: #c0521a; border-color: #4a3520; }
        .tag-pill.active { background: #c0521a; color: #0d0a06; border-color: #c0521a; }

        .burger-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.7); animation: fadeIn 0.2s ease; }
        .burger-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(300px, 85vw); z-index: 151; background: #0d0a06; border-right: 1px solid #2a1f0e; display: flex; flex-direction: column; animation: slideRight 0.25s ease; overflow-y: auto; }
        
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        /* ПЛАВНАЯ АНИМАЦИЯ ПОЯВЛЕНИЯ МОДАЛКИ С ОРАНЖЕВЫМ СВЕЧЕНИЕМ */
        @keyframes modalGlowUp { 
          0% { opacity: 0; transform: translateY(30px) scale(0.98); box-shadow: 0 0 0 rgba(192,82,26,0); } 
          100% { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 20px 80px rgba(192,82,26,0.15); } 
        }

        .burger-header { padding: 20px 20px 16px; border-bottom: 1px solid #2a1f0e; display: flex; align-items: center; justify-content: space-between; }
        .burger-logo { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #c0521a; }
        .burger-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #4a3520; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .burger-close:hover { color: #c0521a; background: #1a1208; }
        .burger-action { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; color: #8a6a4a; font-size: 13px; transition: all 0.15s; }
        .burger-action:hover { background: #1a1208; color: #d4b896; }
        .burger-action-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #1a1208; }

        .grid-wrap { padding: 10px; }
        .masonry { columns: 2; gap: 8px; }
        @media (min-width: 480px) { .masonry { columns: 3; } }
        @media (min-width: 768px) { .masonry { columns: 4; } }
        @media (min-width: 1024px) { .masonry { columns: 5; } }
        @media (min-width: 1280px) { .masonry { columns: 6; } }

        .card { break-inside: avoid; margin-bottom: 8px; border-radius: 12px; overflow: hidden; background: #1a1208; position: relative; cursor: zoom-in; }
        .card img { width: 100%; display: block; height: auto; transition: filter 0.2s; }
        .card:hover img { filter: brightness(0.85); }
        .overlay { opacity: 0; position: absolute; inset: 0; transition: opacity 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; }
        .card:hover .overlay { opacity: 1; }
        
        .save-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 20px; padding: 10px 18px; cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.15s; }
        .save-btn:hover { background: #d4621a; transform: scale(1.05); }
        .save-btn.pinned { background: rgba(13,10,6,0.8); color: #fff; border: 1px solid #4a3520; }
        
        .card-action-btn { background: rgba(13,10,6,0.8); border: none; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: all 0.2s; backdrop-filter: blur(4px); }
        .card-action-btn:hover { background: #c0521a; color: #0d0a06; transform: scale(1.1); }

        .boards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 480px) { .boards-grid { grid-template-columns: repeat(3, 1fr); } }
        .board-card { border-radius: 12px; overflow: hidden; border: 1px solid #2a1f0e; background: #1a1208; }
        .board-cover { height: 80px; background: linear-gradient(135deg, #2a1f0e, #1a1208); display: flex; align-items: center; justify-content: center; }
        .board-info { padding: 12px; }
        .board-actions { display: flex; gap: 8px; margin-top: 10px; }
        .board-edit-btn, .board-del-btn { flex: 1; padding: 6px; border-radius: 6px; font-size: 11px; cursor: pointer; background: transparent; }
        .board-edit-btn { border: 1px solid #2a1f0e; color: #8a6a4a; } .board-edit-btn:hover { border-color: #c0521a; color: #c0521a; }
        .board-del-btn { border: 1px solid #3a1a1a; color: #e53e3e; } .board-del-btn:hover { background: rgba(229,62,62,0.1); }

        /* BACKDROP ДЛЯ МОДАЛКИ (ТЕМНО-КОРИЧНЕВЫЙ) */
        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(13,10,6,0.9); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.4s ease; backdrop-filter: blur(5px); }
        .modal-box { background: #0d0a06; border: 1px solid #2a1f0e; border-radius: 16px; width: 100%; max-width: 1000px; max-height: 90vh; overflow-y: auto; animation: modalGlowUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; display: flex; flex-direction: column; scroll-behavior: smooth; }
        
        .modal-top { display: flex; flex-direction: column; }
        @media (min-width: 768px) { .modal-top { flex-direction: row; } }
        
        .modal-img-wrap { flex: 1.5; background: #1a1208; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-img { width: 100%; max-height: 70vh; object-fit: contain; display: block; border-radius: 8px; }
        
        .modal-info { flex: 1; padding: 32px; display: flex; flex-direction: column; background: #0d0a06; }

        .modal-bottom { padding: 32px; border-top: 1px solid #1a1208; background: #0d0a06; }
        .related-masonry { columns: 2; gap: 12px; }
        @media (min-width: 640px) { .related-masonry { columns: 3; } }
        @media (min-width: 1024px) { .related-masonry { columns: 4; } }

        .primary-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 24px; padding: 14px 24px; cursor: pointer; font-weight: 700; font-size: 14px; width: 100%; transition: background 0.2s; }
        .primary-btn:hover { background: #d4621a; }
        .primary-btn.pinned-state { background: #1a1208; color: #c0521a; border: 1px solid #c0521a; }
        
        .ghost-btn, .outline-btn, .danger-btn { border-radius: 20px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; background: transparent; }
        .ghost-btn { color: #8a6a4a; border: 1px solid #2a1f0e; } .ghost-btn:hover { border-color: #4a3520; color: #d4b896; }
        .outline-btn { color: #c0521a; border: 1px solid #c0521a; width: 100%; } .outline-btn:hover { background: rgba(192,82,26,0.1); }
        .danger-btn { color: #e53e3e; border: 1px solid #e53e3e; width: 100%; } .danger-btn:hover { background: rgba(229,62,62,0.1); }

        .field { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #2a1f0e; background: #1a1208; color: #d4b896; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .field:focus { border-color: #c0521a; }
        
        .spinner { width: 28px; height: 28px; border: 2px solid #2a1f0e; border-top-color: #c0521a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* АНИМАЦИЯ "НЕЙРОСЕТЬ ДУМАЕТ" */
        .ai-pulse { width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, #c0521a 0%, transparent 70%); animation: pulseGlow 1.5s infinite alternate; margin: 0 auto 12px; }
        @keyframes pulseGlow { 
          0% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 10px #c0521a; } 
          100% { transform: scale(1.5); opacity: 1; box-shadow: 0 0 30px #c0521a, 0 0 60px #d4b896; } 
        }
        .ai-text { font-family: 'Cinzel', serif; color: #d4b896; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; animation: flashText 1.5s infinite; }
        @keyframes flashText { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        
        .empty { text-align: center; padding: 100px 20px; color: #4a3520; font-size: 16px; font-family: 'Crimson Text', serif; font-style: italic; }
        .modal-close { background: none; border: none; color: #4a3520; cursor: pointer; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #1a1208; color: #c0521a; }
        
        .toast-container { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #c0521a; color: #0d0a06; padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 700; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 10px 30px rgba(192,82,26,0.3); }
      `}</style>

      <main style={{ minHeight: "100vh" }}>
        <header className="header">
          <button className="hbtn" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <span className="logo" onClick={clearSearch}>GELBET</span>

          <form className={`search-form ${isMobileSearchOpen ? 'mobile-active' : ''}`} onSubmit={handleSearch}>
            <div 
              className="search-wrap" 
              onClick={() => {
                if (!isMobileSearchOpen) {
                  setIsMobileSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
            >
              <input ref={searchInputRef} className="search-input" placeholder="Search visual aesthetics..." value={search} onChange={e => setSearch(e.target.value)} onBlur={() => { if(!search) setIsMobileSearchOpen(false) }} />
              {search && isMobileSearchOpen && <button type="button" onClick={() => { setSearch(""); setIsMobileSearchOpen(false); }} className="search-btn" style={{ fontSize: 16 }}>✕</button>}
              <button type="submit" className="search-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </form>

          <button className="hbtn" title="AI Vibe Assistant" onClick={() => setShowAIModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>
          </button>

          <button className={`hbtn ${showBoards ? "active" : ""}`} onClick={() => { setShowBoards(!showBoards); setShowSaved(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>

          <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => { setShowSaved(!showSaved); setShowBoards(false); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={showSaved ? "#0d0a06" : "none"} stroke={showSaved ? "#0d0a06" : "currentColor"} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {pins.length > 0 && <span className="badge">{pins.length}</span>}
          </button>

          {user ? (
            <a href="/profile">
              {userAvatar ? <img src={userAvatar} className="avatar" alt="avatar" /> : <div className="avatar-placeholder">{(userName[0] || "U").toUpperCase()}</div>}
            </a>
          ) : (
            <a href="/auth" className="sign-btn">Enter</a>
          )}
        </header>

        {!showBoards && !showSaved && userTags.length > 0 && (
          <div className="tags-bar">
            <span style={{color: "#4a3520", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, paddingRight: 8}}>History</span>
            {userTags.map(tag => (
              <button key={tag} className={`tag-pill ${searchQuery === tag ? "active" : ""}`} onClick={() => handleTagClick(tag)}>
                {tag.length > 35 ? tag.substring(0, 35) + "..." : tag}
              </button>
            ))}
          </div>
        )}

        {(showSaved || showBoards) && (
          <div style={{ padding: "12px 20px", fontSize: 14, color: "#8a6a4a", borderBottom: "1px solid #1a1208", display: "flex", alignItems: "center", gap: 12 }}>
            {showSaved && <span>Saved Collection (<span style={{ color: "#c0521a" }}>{pins.length}</span>)</span>}
            {showBoards && <span>My Boards (<span style={{ color: "#c0521a" }}>{boards.length}</span>)</span>}
          </div>
        )}

        {showBoards && (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>MY BOARDS</h2>
              <button className="primary-btn" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setShowNewBoard(true)}>+ New Board</button>
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#d4b896" }}>{board.name}</div>
                        {board.description && <div style={{ fontSize: 11, color: "#4a3520", marginTop: 4, fontStyle: "italic" }}>{board.description}</div>}
                        <div style={{ fontSize: 11, color: "#8a6a4a", marginTop: 8 }}>{pins.filter(p => p.board_id === board.id).length} pins</div>
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
                {displayPhotos.map((photo, i) => (
                  <div key={`${photo.id}-${i}`} className="card" onClick={() => setSelected(photo)}>
                    <img src={photo.src} alt="" loading="lazy" onError={e => { const p = (e.currentTarget as HTMLImageElement).parentElement; if (p) p.style.display = "none"; }} />
                    <div className="overlay">
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button className={`save-btn ${isPinned(photo) ? "pinned" : ""}`} onClick={e => { e.stopPropagation(); isPinned(photo) ? null : setShowSaveToBoard(photo); }}>
                          {isPinned(photo) ? "Saved" : "Save"}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", gap: 8 }}>
                        <button className="card-action-btn" onClick={e => { e.stopPropagation(); setShowShare(photo); }} title="Share">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                        {showSaved && <button className="card-action-btn" style={{ background: "rgba(229,62,62,0.8)" }} onClick={e => { e.stopPropagation(); deletePin(photo.id); }}>✕</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {displayPhotos.length === 0 && !loading && <div className="empty">{showSaved ? "No saved pins yet." : "Nothing found."}</div>}
            {!showSaved && <div ref={bottomRef} style={{ padding: "40px", textAlign: "center" }}>{loading && <div className="spinner" />}</div>}
          </>
        )}

        {showMenu && (
          <>
            <div className="burger-overlay" onClick={closeAllPanels} />
            <div className="burger-panel">
              <div className="burger-header">
                <span className="burger-logo">GELBET</span>
                <button className="burger-close" onClick={closeAllPanels}>✕</button>
              </div>
              {user && (
                <div style={{ padding: "20px 16px", borderBottom: "1px solid #1a1208", display: "flex", alignItems: "center", gap: 14 }}>
                  {userAvatar ? <img src={userAvatar} className="avatar" style={{ width: 40, height: 40 }} alt="" /> : <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 16 }}>{(userName[0] || "U").toUpperCase()}</div>}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#d4b896" }}>{userName}</div>
                    <a href="/profile" style={{ color: "#8a6a4a", fontSize: 12, textDecoration: "none" }}>Edit profile</a>
                  </div>
                </div>
              )}
              
              <div style={{ padding: "0 16px", fontSize: 10, color: "#4a3520", textTransform: "uppercase", letterSpacing: 2, marginTop: 24, marginBottom: 12 }}>Explore Vibes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 16px" }}>
                {defaultTags.map(tag => (
                  <button key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>
                ))}
              </div>
              <div style={{ height: 1, background: "#1a1208", margin: "10px 0" }} />

              <div style={{ padding: "10px 0" }}>
                <button className="burger-action" onClick={() => { setShowBoards(true); setShowMenu(false); }}>
                  <span className="burger-action-icon" style={{ color: "#c0521a" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>
                  <span>My Boards</span>
                </button>
                <button className="burger-action" onClick={() => { setShowSaved(true); setShowMenu(false); }}>
                  <span className="burger-action-icon" style={{ color: "#c0521a" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
                  <span>Saved Pins</span>
                </button>
              </div>
            </div>
          </>
        )}

        {showAIModal && (
          <div className="modal-backdrop" onClick={() => setShowAIModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 16, animation: "slideUp 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#c0521a", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>AI VIBE ASSISTANT</h2>
                <button className="modal-close" onClick={() => setShowAIModal(false)}>✕</button>
              </div>
              <p style={{ color: "#8a6a4a", fontSize: 13, lineHeight: 1.5 }}>
                Describe the mood, era, or aesthetic you are looking for. AI will refine your input to craft the perfect visual search query.
              </p>
              
              <textarea 
                className="field" 
                placeholder="e.g. A rainy day in a cyberpunk city but with warm neon colors..." 
                value={aiPrompt} 
                onChange={e => setAiPrompt(e.target.value)}
                style={{ height: 100, resize: "none" }}
              />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <span style={{color: "#4a3520", fontSize: 11, fontWeight: 700, textTransform: "uppercase", width: "100%", letterSpacing: 1}}>Or try suggestions:</span>
                {aiVibes.map(vibe => (
                  <button key={vibe} onClick={() => setAiPrompt(vibe)} className="tag-pill" style={{fontSize: 11, padding: "4px 10px"}}>{vibe}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button className="ghost-btn" onClick={() => setShowAIModal(false)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1, opacity: !aiPrompt.trim() ? 0.4 : 1 }} onClick={handleAIGenerate}>Generate Vibe</button>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              
              <div className="modal-top">
                <div className="modal-img-wrap">
                  <img src={selected.src} alt="" className="modal-img" />
                </div>
                
                <div className="modal-info">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                    <button className="hbtn" style={{ background: "#1a1208" }} onClick={() => setShowShare(selected)} title="Share">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                    <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
                    <button className={`primary-btn ${isPinned(selected) ? "pinned-state" : ""}`} onClick={() => isPinned(selected) ? null : setShowSaveToBoard(selected)}>
                      {isPinned(selected) ? "Already saved" : "Save to Board"}
                    </button>
                    {selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer"><button className="outline-btn">View Original ↗</button></a>}
                  </div>
                </div>
              </div>

              {/* БЕСКОНЕЧНАЯ ЛЕНТА ИИ-ПОХОЖИХ КАРТИНОК */}
              <div className="modal-bottom">
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#d4b896", textTransform: "uppercase", letterSpacing: 2, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>
                  AI Curated Matches
                </h3>
                <div className="related-masonry">
                  {relatedPhotos.map((photo, i) => (
                    <div key={`related-${photo.id}-${i}`} style={{ breakInside: "avoid", marginBottom: 12, cursor: "pointer", borderRadius: 12, overflow: "hidden", border: "1px solid #1a1208" }} 
                         onClick={() => { document.querySelector('.modal-box')?.scrollTo({top: 0, behavior: 'smooth'}); setSelected(photo); }}>
                      <img src={photo.thumb || photo.src} style={{ width: "100%", display: "block", transition: "filter 0.3s" }} onMouseOver={e => (e.currentTarget.style.filter = "brightness(0.7)")} onMouseOut={e => (e.currentTarget.style.filter = "brightness(1)")} alt="" />
                    </div>
                  ))}
                </div>
                
                <div ref={modalBottomRef} style={{ padding: "60px 0", textAlign: "center" }}>
                  {relatedLoading && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className="ai-pulse" />
                      <span className="ai-text">Neural Net is extracting vibes...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {showSaveToBoard && (
          <div className="modal-backdrop" onClick={() => setShowSaveToBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>SAVE TO BOARD</h2>
                <button className="modal-close" onClick={() => setShowSaveToBoard(null)}>✕</button>
              </div>
              <button className="primary-btn" onClick={() => savePin(showSaveToBoard)}>Save directly</button>
              {boards.length > 0 && <>
                <div style={{ height: 1, background: "#1a1208", margin: "10px 0" }} />
                {boards.map(board => <button key={board.id} className="outline-btn" onClick={() => savePin(showSaveToBoard, board.id)}>{board.name}</button>)}
              </>}
              <button className="ghost-btn" style={{ marginTop: 10 }} onClick={() => { setShowNewBoard(true); setShowSaveToBoard(null); }}>+ Create new board</button>
            </div>
          </div>
        )}

        {showNewBoard && (
          <div className="modal-backdrop" onClick={() => setShowNewBoard(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>NEW BOARD</h2>
              <input className="field" placeholder="Board name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} />
              <input className="field" placeholder="Description (optional)" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} />
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button className="ghost-btn" onClick={() => setShowNewBoard(false)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1, opacity: !newBoardName ? 0.4 : 1 }} onClick={createBoard}>Create</button>
              </div>
            </div>
          </div>
        )}

        {showShare && (
          <div className="modal-backdrop" onClick={() => setShowShare(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 32, maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>SHARE</h2>
                <button className="modal-close" onClick={() => setShowShare(null)}>✕</button>
              </div>
              <img src={showShare.src} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} alt="" />
              <button className="primary-btn" onClick={() => sharePhoto(showShare)}>Copy link</button>
            </div>
          </div>
        )}

        {editBoard && (
          <div className="modal-backdrop" onClick={() => setEditBoard(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d0a06", border: "1px solid #2a1f0e", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>EDIT BOARD</h2>
              <input className="field" placeholder="Board name" value={editBoard.name} onChange={e => setEditBoard({ ...editBoard, name: e.target.value })} />
              <input className="field" placeholder="Description" value={editBoard.description || ""} onChange={e => setEditBoard({ ...editBoard, description: e.target.value })} />
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button className="ghost-btn" onClick={() => setEditBoard(null)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1 }} onClick={updateBoard}>Save</button>
              </div>
              <button className="danger-btn" style={{ marginTop: 10 }} onClick={() => { deleteBoard(editBoard.id); setEditBoard(null); }}>Delete board</button>
            </div>
          </div>
        )}

        {toastMsg && <div className="toast-container">{toastMsg}</div>}
      </main>
    </>
  );
}
