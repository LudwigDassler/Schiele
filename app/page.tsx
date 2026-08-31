"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../lib/nsfw";
import { useTasteProfile } from "./hooks/useTasteProfile";
import { getAnonId } from "../lib/identity";
import ResonanceEngine from "../components/ResonanceEngine";

const DEFAULT_TAGS = ["Dark Academia", "Siberian Punk", "Liminal Space", "Analog 35mm"];

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean; rank?: string };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const router = useRouter();
  const { feedLocalAI } = useTasteProfile();
  
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("Aesthetic");
  const [userTags, setUserTags] = useState<string[]>([]);
  
  // Состояния нового интерфейса
  const [isResultsActive, setIsResultsActive] = useState(false);
  const [searchMode, setSearchMode] = useState<'visual' | 'sonic'>('visual');
  const [matchScore, setMatchScore] = useState(98.4);
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [showSaved, setShowSaved] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  
  const [activeMode, setActiveMode] = useState("classic");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const isSynthSessionRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Синхронизация состояния CSS-классов с Next.js
  useEffect(() => {
    if (isResultsActive) document.body.classList.add("results-active");
    else document.body.classList.remove("results-active");
  }, [isResultsActive]);

  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data }) => { 
        if(mounted) {
            setUser(data.session?.user ?? null); 
            if (data.session?.user) {
                fetchUserData(data.session.user.id);
                if (!isSynthSessionRef.current) setActiveUserId(data.session.user.id);
            }
        }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
        if(mounted) {
            setUser(session?.user ?? null); 
            if (session?.user) {
                fetchUserData(session.user.id);
                if (!isSynthSessionRef.current) setActiveUserId(session.user.id);
            }
        }
    });
    
    let initialQuery = "Aesthetic";
    let urlMode = "classic";
    let urlUserId: string | null = null;
    
    try { 
        const savedTags = localStorage.getItem("gelbet_user_tags"); 
        if (savedTags) {
            const parsed = JSON.parse(savedTags);
            setUserTags(parsed);
            if (parsed.length > 0) initialQuery = parsed[0];
        }
        
        const allowedNsfw = localStorage.getItem("gelbet_nsfw_18plus"); 
        if (allowedNsfw === "true") setNsfwAllowed(true); 

        const urlParams = new URLSearchParams(window.location.search);
        const qFromUrl = urlParams.get("q");
        const modeFromUrl = urlParams.get("mode");
        const userIdFromUrl = urlParams.get("userId");
        
        if (qFromUrl) initialQuery = qFromUrl;
        if (modeFromUrl) urlMode = modeFromUrl;
        
        if (userIdFromUrl) {
            urlUserId = userIdFromUrl;
            isSynthSessionRef.current = true;
        } else {
            urlUserId = getAnonId();
        }
        
        setActiveMode(urlMode);
        setActiveUserId(urlUserId);
    } catch (e) {}

    // Инициализируем ленту, но не поднимаем поиск вверх
    if(mounted) {
        setSearchQuery(initialQuery);
        fetchPhotos(initialQuery, 1, true, urlMode, urlUserId);
    }

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); 

  async function fetchUserData(userId: string) {
    try {
      const [pinsRes, boardsRes] = await Promise.all([ 
        fetch(`/api/pins?user_id=${userId}`).catch(() => null), 
        fetch(`/api/boards?user_id=${userId}`).catch(() => null) 
      ]);
      
      if (pinsRes?.ok) { const d = await pinsRes.json(); setPins(d.pins || d.data || []); }
      if (boardsRes?.ok) { const d = await boardsRes.json(); setBoards(d.boards || d.data || []); }
    } catch (e) {}
  }

  const fetchPhotos = useCallback(async (queryParam: string, pageNum: number, reset: boolean, modeOverride?: string, userIdOverride?: string | null) => {
    if (!reset && loadingRef.current) return;
    loadingRef.current = true; 
    setLoading(true);
    
    if (reset) { 
      if (abortControllerRef.current) abortControllerRef.current.abort(); 
      abortControllerRef.current = new AbortController(); 
    }
    
    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (queryParam) params.set("query", queryParam);
      if (modeOverride ?? activeMode) params.set("mode", modeOverride ?? activeMode);
      if (userIdOverride !== undefined ? userIdOverride : activeUserId) params.set("userId", (userIdOverride !== undefined ? userIdOverride : activeUserId) as string);
      
      const res = await fetch(`/api/search?${params}`, { signal: abortControllerRef.current?.signal });
      if (!res.ok) throw new Error("Fetch failed");
      
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || data.results || []);
      const isNsfwQuery = checkNsfw(queryParam);
      
      const fetched = rawArray
        .map((p: any) => {
          const mappedSrc = p.src || p.image || p.image_url || p.url;
          return {
            ...p,
            id: p.id || mappedSrc, 
            src: mappedSrc,
            thumb: p.thumb || p.thumbnail || p.image || mappedSrc,
            link: p.link || p.url || p.source_url || mappedSrc,
            isNsfw: isNsfwQuery || checkNsfw(p.title || ""),
            rank: Math.random() > 0.7 ? 'S' : 'A' // Визуализация ранга
          };
        })
        .filter((p: any) => p.src && p.src.startsWith("http"));

      setPhotos(prev => { 
        const combined = reset ? fetched : [...prev, ...fetched]; 
        const map = new Map(); 
        combined.forEach((p: any) => map.set(p.src, p)); 
        return Array.from(map.values()); 
      });
      setHasMore(fetched.length > 0);
      
      // Динамически меняем процент совпадения эстетики
      if (reset) setMatchScore(parseFloat((85 + Math.random() * 14).toFixed(1)));
      
    } catch (e: any) { 
        console.error("Search fetch error:", e);
    } finally { 
        if (!(reset && abortControllerRef.current?.signal.aborted)) { 
            setLoading(false); 
            loadingRef.current = false; 
        } 
    }
  }, [activeMode, activeUserId]);

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

  function saveUserTag(tag: string) { 
    const formattedTag = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1); 
    setUserTags(prev => { 
      const updated = [formattedTag, ...prev.filter(t => t.toLowerCase() !== formattedTag.toLowerCase())].slice(0, 8); 
      localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); 
      return updated; 
    }); 
  }

  async function handleSearch(e?: React.FormEvent, forceQuery?: string) { 
    if (e) e.preventDefault(); 
    const query = (forceQuery || search).trim();
    if (!query) return; 

    setIsResultsActive(true);

    if (searchMode === 'sonic') {
      try {
        // Оракул (Аудио)
        const res = await fetch("/api/oracle", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ trackInput: query }) 
        });
        if (!res.ok) throw new Error("Oracle API Error");
        const data = await res.json();
        const hiddenQuery = data.visual_query || query;
        setSearchQuery(hiddenQuery); 
        setPage(1); setHasMore(true); setPhotos([]); 
        await fetchPhotos(hiddenQuery, 1, true);
      } catch (err) {
        console.warn(err);
      }
      return;
    }

    setSearchQuery(query); 
    saveUserTag(query); 
    setPage(1); setHasMore(true); setPhotos([]); 
    fetchPhotos(query, 1, true);
  }

  function handleTagClick(tag: string) {
    setSearch(tag);
    handleSearch(undefined, tag);
  }

  function resetUI() {
    setIsResultsActive(false);
    setSearch("");
    setShowSaved(false);
  }

  async function savePin(photo: Photo) { 
    if (!user) { window.location.href = "/auth"; return; } 
    try { 
      const res = await fetch("/api/pins", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, board_id: null, source_url: photo.link }) 
      }); 
      if (res.ok) { 
        const data = await res.json(); 
        if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]); 
      } 
    } catch (e) {} 
  }

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  async function createBoard() { 
    if (!newBoardName || !user) return; 
    try { 
      const res = await fetch("/api/boards", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ user_id: user.id, name: newBoardName, description: newBoardDesc }) 
      }); 
      if (res.ok) { 
        const data = await res.json(); 
        if (data.board || data.data) setBoards(prev => [data.board || data.data, ...prev]); 
      } 
    } catch (e) {} 
    setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false); 
  }

  const displayPhotos = showSaved ? pins.map(p => ({ id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", link: p.source_url || "", isNsfw: checkNsfw(p.title || "") })) : photos;
  const userAvatar = user?.user_metadata?.avatar_url || ""; 
  const userName = user?.user_metadata?.full_name || user?.email || "Ludwig";
  const tagsToDisplay = userTags.length > 0 ? userTags.slice(0, 4) : DEFAULT_TAGS;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-void: #020104; --glass-bg: rgba(10, 10, 12, 0.3); --glass-border: rgba(255, 255, 255, 0.05);
          --text-muted: #888; --pf-prism-glow: rgba(255, 255, 255, 0.15);
        }
        body { background-color: var(--bg-void); color: #fff; font-family: 'Inter', sans-serif; margin: 0; overflow-x: hidden; min-height: 100vh; transition: background-color 1.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .font-mono { font-family: 'Space Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg-void); } ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        
        #math-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; transition: all 2s cubic-bezier(0.16, 1, 0.3, 1); }
        .results-active #math-canvas { opacity: 0.25; transform: scale(1.1) translateY(-5%); filter: blur(8px) saturate(1.2); }
        #ui-layer { position: relative; z-index: 10; min-height: 100vh; display: flex; flex-direction: column; }
        header { opacity: 0; pointer-events: none; transform: translateY(-20px); transition: all 1s; }
        .results-active header { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .nav-link { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); transition: color 0.3s; cursor: pointer; }
        .nav-link:hover, .nav-link.active { color: #fff; }

        .search-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 650px; padding: 0 16px; transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; align-items: center; }
        @media (min-width: 768px) { .search-container { padding: 0 24px; } }
        .results-active .search-container { top: 90px; transform: translate(-50%, 0); max-width: 800px; }

        .search-input-wrapper { display: flex; align-items: center; width: 100%; border-bottom: 2px solid rgba(255,255,255,0.4); transition: all 0.4s ease; padding-bottom: 8px; }
        .search-input-wrapper:focus-within { border-bottom-color: rgba(255,255,255,1); box-shadow: 0 15px 40px -10px var(--pf-prism-glow); }
        .results-active .search-input-wrapper { border-bottom: 1px solid rgba(255,255,255,0.1); }

        .search-input { width: 100%; background: transparent; border: none; color: #fff; font-size: 18px; outline: none; letter-spacing: 2px; text-align: center; font-family: 'Space Mono', monospace; text-transform: uppercase; transition: all 0.4s ease; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
        .search-input::placeholder { color: rgba(255,255,255,0.6); letter-spacing: 2px; text-shadow: 0 2px 15px rgba(0,0,0,1); }
        @media (min-width: 768px) { .search-input { font-size: 28px; } .search-input::placeholder { letter-spacing: 4px; } }
        .results-active .search-input { font-size: 14px; letter-spacing: 1px; text-shadow: none; }

        .quick-tags { display: flex; gap: 8px; margin-top: 20px; opacity: 1; transition: opacity 0.5s; flex-wrap: wrap; justify-content: center; }
        @media (min-width: 768px) { .quick-tags { gap: 12px; } }
        .results-active .quick-tags { opacity: 0; pointer-events: none; position: absolute; }
        .tag-pill { background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); padding: 6px 12px; border-radius: 99px; font-family: 'Space Mono', monospace; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.3s; }
        @media (min-width: 768px) { .tag-pill { font-size: 9px; padding: 8px 16px; } }
        .tag-pill:hover { background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(255,255,255,0.1); }

        .vector-selector { display: flex; gap: 20px; margin-top: 30px; transition: opacity 0.5s; }
        @media (min-width: 768px) { .vector-selector { gap: 40px; margin-top: 40px; } }
        .results-active .vector-selector { opacity: 0; pointer-events: none; position: absolute; }
        .vector-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.4); padding: 8px 0; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Space Mono', monospace; cursor: pointer; position: relative; transition: all 0.3s; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
        @media (min-width: 768px) { .vector-btn { font-size: 10px; letter-spacing: 3px; } }
        .vector-btn::after { content: ''; position: absolute; bottom: 0; left: 50%; right: 50%; height: 1px; background: #fff; transition: all 0.3s ease; }
        .vector-btn.active, .vector-btn:hover { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
        .vector-btn.active::after { left: 0; right: 0; }
        .vector-btn.sonic-mode.active::after { background: #10b981; }

        .content-area { opacity: 0; pointer-events: none; transform: translateY(40px); transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 0.3s; margin-top: 150px; padding: 0 16px 80px; }
        @media (min-width: 768px) { .content-area { margin-top: 180px; padding: 0 32px 80px; } }
        .results-active .content-area { opacity: 1; pointer-events: auto; transform: translateY(0); }

        .section-title { font-family: 'Space Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); margin-bottom: 16px; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
        @media (min-width: 768px) { .section-title { font-size: 10px; letter-spacing: 4px; margin-bottom: 24px; padding-bottom: 12px; } }

        .archives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100%, 1fr)); gap: 16px; margin-bottom: 40px; }
        @media (min-width: 640px) { .archives-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-bottom: 70px; } }
        .archive-card { padding: 20px; border-radius: 6px; border: 1px solid var(--glass-border); background: var(--glass-bg); backdrop-filter: blur(12px); cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
        @media (min-width: 768px) { .archive-card { padding: 24px; } }
        .archive-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 60%); opacity: 0; transition: opacity 0.4s; pointer-events: none; }
        .archive-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
        .archive-card:hover::before { opacity: 1; }

        .masonry { column-count: 2; column-gap: 12px; }
        @media (min-width: 768px) { .masonry { column-count: 3; column-gap: 16px; } }
        @media (min-width: 1024px) { .masonry { column-count: 4; } }
        @media (min-width: 1440px) { .masonry { column-count: 5; } }

        .pin-card { break-inside: avoid; margin-bottom: 12px; border-radius: 6px; overflow: hidden; position: relative; background: #111; cursor: pointer; border: 1px solid transparent; transition: border-color 0.3s; }
        @media (min-width: 768px) { .pin-card { margin-bottom: 16px; } }
        .pin-card img { width: 100%; display: block; transition: all 0.6s ease; filter: brightness(0.7) contrast(1.1); }
        .pin-card:hover { border-color: rgba(255,255,255,0.1); }
        .pin-card:hover img { filter: brightness(1.1) contrast(1.2); transform: scale(1.03); }

        .pin-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.9) 100%); opacity: 0; transition: opacity 0.4s; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; }
        @media (min-width: 768px) { .pin-overlay { padding: 16px; } }
        .pin-card:hover .pin-overlay { opacity: 1; }
        
        .save-btn { background: rgba(255,255,255,0.1); backdrop-filter: blur(4px); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; font-family: 'Space Mono', monospace; font-size: 8px; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px; cursor: pointer; transition: all 0.3s; }
        @media (min-width: 768px) { .save-btn { font-size: 9px; padding: 6px 16px; } }
        .save-btn:hover { background: #fff; color: #000; }

        .pin-actions { display: flex; gap: 6px; }
        @media (min-width: 768px) { .pin-actions { gap: 8px; } }
        .icon-btn { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.1); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.3s; }
        @media (min-width: 768px) { .icon-btn { width: 32px; height: 32px; } }
        .icon-btn:hover { background: #fff; color: #000; transform: translateY(-2px); }
        .icon-btn svg { width: 12px; height: 12px; }
        @media (min-width: 768px) { .icon-btn svg { width: 14px; height: 14px; } }
      `}} />

      {/* ФОНОВЫЙ МАТЕМАТИЧЕСКИЙ ДВИЖОК */}
      <ResonanceEngine mode={searchMode} isActive={isResultsActive} />

      <div id="ui-layer">
        {/* HEADER */}
        <header className="w-full px-4 md:px-8 py-4 md:py-6 flex justify-between items-center fixed top-0 z-50 bg-[#020104]/80 backdrop-blur-md border-b border-white/5">
          <div className="font-mono text-xs md:text-sm tracking-[4px] font-bold text-white cursor-pointer" onClick={resetUI}>
            GELBET <span className="text-neutral-600">[]</span>
          </div>
          
          <div className="gap-8 absolute left-1/2 -translate-x-1/2 hidden md:flex">
            <div className={`nav-link ${!showSaved ? 'active' : ''}`} onClick={() => setShowSaved(false)}>Resonance</div>
            <div className={`nav-link ${showSaved ? 'active' : ''}`} onClick={() => setShowSaved(true)}>Saved</div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="font-mono text-[8px] md:text-[9px] text-neutral-500 text-right tracking-widest uppercase hidden sm:block">
              <div className="text-white">Entity: {userName.split(' ')[0]}</div>
              <div>Tensor Aligned</div>
            </div>
            <a href="/profile" className="w-8 h-8 md:w-9 md:h-9 border border-neutral-700 bg-[#0a0a0c] flex items-center justify-center text-white font-mono text-xs hover:border-white cursor-pointer transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-full overflow-hidden" style={{ textDecoration: 'none' }}>
              {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" alt="avatar" /> : (userName[0] || "U").toUpperCase()}
            </a>
          </div>
        </header>

        {/* CENTER CONSOLE */}
        <div className="search-container">
          <form className="search-input-wrapper w-full" onSubmit={(e) => handleSearch(e)}>
            <input type="text" id="searchInput" className="search-input" placeholder={searchMode === 'sonic' ? "AWAITING AUDIO STREAM..." : "DEFINE VECTOR..."} autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          
          <div className="quick-tags">
            {tagsToDisplay.map(tag => (
              <button key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>
            ))}
          </div>

          <div className="vector-selector">
            <button type="button" className={`vector-btn ${searchMode === 'visual' ? 'active' : ''}`} onClick={() => setSearchMode('visual')}>Visual Plane</button>
            <button type="button" className={`vector-btn sonic-mode ${searchMode === 'sonic' ? 'active' : ''}`} onClick={() => setSearchMode('sonic')}>Sonic Resonance</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="content-area max-w-[1800px] mx-auto w-full">
          
          {/* Archives Section */}
          <div className="mb-10 md:mb-14">
            <div className="section-title">
              <span>My Archives</span>
            </div>
            <div className="archives-grid">
              {boards.length === 0 ? (
                <>
                  <div className="archive-card">
                    <div className="font-mono text-[10px] md:text-[11px] tracking-widest text-white mb-2 md:mb-3 uppercase font-bold">Web Deployment</div>
                    <div className="text-[8px] md:text-[9px] text-neutral-500 uppercase tracking-widest">React / Next.js</div>
                    <div className="mt-4 text-[9px] md:text-[10px] text-purple-400 uppercase tracking-widest">0 Artifacts</div>
                  </div>
                  <div className="archive-card">
                 <div className="font-mono text-[10px] md:text-[11px] tracking-widest text-white mb-2 md:mb-3 uppercase font-bold">Embroidery JEFs</div>
                    <div className="text-[8px] md:text-[9px] text-neutral-500 uppercase tracking-widest">AcuStitch / Janome</div>
                    <div className="mt-4 text-[9px] md:text-[10px] text-purple-400 uppercase tracking-widest">0 Artifacts</div>
                  </div>
                </>
              ) : (
                boards.map(board => (
                  <div key={board.id} className="archive-card">
                    <div className="font-mono text-[10px] md:text-[11px] tracking-widest text-white mb-2 md:mb-3 uppercase font-bold">{board.name}</div>
                    <div className="text-[8px] md:text-[9px] text-neutral-500 uppercase tracking-widest">{board.description || "Collection"}</div>
                    <div className="mt-4 text-[9px] md:text-[10px] text-purple-400 uppercase tracking-widest">{pins.filter(p => p.board_id === board.id).length} Artifacts</div>
                  </div>
                ))
              )}
              <div className="archive-card flex flex-col items-center justify-center border-dashed border-neutral-800 hover:border-neutral-500 bg-transparent min-h-[100px]" onClick={() => setShowNewBoard(true)}>
                <div className="font-mono text-[9px] md:text-[10px] text-neutral-400 uppercase tracking-widest">+ Establish Archive</div>
              </div>
            </div>
          </div>

          {/* Feed Section */}
          <div>
            <div className="section-title">
              <span>{showSaved ? "Saved Resonance" : "Resonance Feed"}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Match: {matchScore}%</span>
            </div>

            <div className="masonry">
              {displayPhotos.map((photo, i) => {
                const isBlurred = photo.isNsfw && !nsfwAllowed;
                return (
                  <div key={`${photo.id}-${i}`} className="pin-card" onClick={() => {
                    feedLocalAI(photo.src, photo.id);
                    if (isBlurred) setShowAgeGate(true);
                    else router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
                  }}>
                    <img src={photo.thumb || photo.src} alt="Artifact" style={isBlurred ? { filter: "blur(20px)" } : {}} />
                    <div className="pin-overlay">
                      <div className="flex justify-between items-start w-full">
                        <span className="font-mono text-[8px] md:text-[9px] text-white/50 tracking-widest uppercase">Rank: {photo.rank || 'A'}</span>
                        <button className="save-btn" onClick={(e) => { e.stopPropagation(); savePin(photo); }}>{isPinned(photo) ? 'Saved' : 'Save'}</button>
                      </div>
                      <div className="flex justify-between items-end w-full mt-auto">
                        <div className="font-mono text-[8px] md:text-[10px] text-white tracking-widest uppercase font-bold drop-shadow-md">ID: {photo.id.substring(0,6).toUpperCase()}</div>
                        <div className="pin-actions">
                          <button className="icon-btn" title="Like" onClick={(e) => e.stopPropagation()}><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
                          <button className="icon-btn" title="Comment" onClick={(e) => e.stopPropagation()}><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></button>
                          <button className="icon-btn" title="Share" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(photo.link || photo.src); alert("Copied!"); }}><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {loading && <div className="text-center py-12"><div className="w-8 h-8 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin mx-auto"></div></div>}
            <div ref={bottomRef} style={{ height: 10 }}></div>
          </div>
        </div>
      </div>

      {/* МОДАЛЬНЫЕ ОКНА В ЕДИНОМ СТИЛЕ */}
      {showNewBoard && (
        <div className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowNewBoard(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#0a0a0c]/90 border border-white/10 rounded-xl p-8 max-w-md w-full flex flex-col gap-6 shadow-2xl backdrop-blur-xl">
            <h2 className="font-mono text-sm font-bold text-white tracking-[3px] uppercase">Establish Archive</h2>
            <div className="flex flex-col gap-4">
               <input className="w-full bg-black/50 border border-white/10 text-white font-mono text-xs p-4 outline-none focus:border-white/40 transition-all rounded-md placeholder-white/30" placeholder="Designation" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus />
               <textarea className="w-full bg-black/50 border border-white/10 text-white font-mono text-xs p-4 outline-none focus:border-white/40 transition-all rounded-md h-24 resize-none placeholder-white/30" placeholder="Context / Vibe" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} />
            </div>
            <div className="flex gap-4">
               <button className="flex-1 bg-transparent border border-white/20 text-white/50 font-mono text-[10px] uppercase tracking-widest py-3 rounded-md hover:bg-white/5 hover:text-white transition-all" onClick={() => setShowNewBoard(false)}>Abort</button>
               <button className="flex-1 bg-white/10 border border-white/30 text-white font-mono text-[10px] uppercase tracking-widest py-3 rounded-md hover:bg-white hover:text-black transition-all" disabled={!newBoardName.trim()} onClick={createBoard}>Initialize</button>
            </div>
          </div>
        </div>
      )}

      {showAgeGate && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setShowAgeGate(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#0a0a0c] border border-red-500/30 rounded-xl p-8 max-w-md w-full flex flex-col items-center text-center gap-6 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <h2 className="font-mono text-xl font-bold text-red-500 tracking-[6px] uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">Restricted</h2>
            <p className="text-neutral-400 text-sm leading-relaxed">This sector contains sensitive visual material.<br/>Confirmation of maturity is required.</p>
            <div className="flex w-full gap-4 mt-2">
               <button className="flex-1 bg-transparent border border-white/20 text-white/50 font-mono text-[10px] uppercase tracking-widest py-3 rounded-md hover:bg-white/5 transition-all" onClick={() => setShowAgeGate(false)}>Withdraw</button>
               <button className="flex-1 bg-red-500 border border-red-400 text-white font-mono text-[10px] uppercase tracking-widest py-3 rounded-md shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-400 transition-all" onClick={() => { setNsfwAllowed(true); localStorage.setItem("gelbet_nsfw_18plus", "true"); setShowAgeGate(false); }}>Proceed (18+)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
