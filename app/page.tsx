"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../lib/nsfw";
import { useTasteProfile } from "./hooks/useTasteProfile";
import ResonanceEngine from "../components/ResonanceEngine";
import AgeGateModal from "../components/AgeGateModal";

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean; rank?: string };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const router = useRouter();
  const { feedLocalAI } = useTasteProfile();
  
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Поисковые стейты
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userTags, setUserTags] = useState<string[]>([]);
  const [hasWiped, setHasWiped] = useState(false);
  const [isResultsActive, setIsResultsActive] = useState(false);
  const [searchMode, setSearchMode] = useState<'visual' | 'sonic'>('visual');
  const [matchScore, setMatchScore] = useState(98.4);
  
  // Стейты данных
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  
  // Пагинация
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // UI Стейты (Модалки)
  const [showSaved, setShowSaved] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState<Photo | null>(null);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // БД Стейты Комментариев
  const [commentPin, setCommentPin] = useState<Photo | null>(null);
  const [dbComments, setDbComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    setIsMounted(true);
    if (isResultsActive) document.body.classList.add("results-active");
    else document.body.classList.remove("results-active");
  }, [isResultsActive]);

  // ==========================================
  // КЭШ И АВТОРИЗАЦИЯ
  // ==========================================
  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data }) => { 
        if(mounted && data.session?.user) { setUser(data.session.user); fetchUserData(data.session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
        if(mounted && session?.user) { setUser(session.user); fetchUserData(session.user.id); }
    });
    
    try { 
        const wipedStatus = localStorage.getItem("gelbet_history_wiped");
        if (wipedStatus === "true") setHasWiped(true);

        const savedTags = localStorage.getItem("gelbet_user_tags"); 
        if (savedTags) {
          const parsed = JSON.parse(savedTags);
          setUserTags(parsed);
        }
        if (localStorage.getItem("gelbet_nsfw_18plus") === "true") setNsfwAllowed(true); 

        const cachedState = sessionStorage.getItem('gelbet_cache');
        if (cachedState) {
            const state = JSON.parse(cachedState);
            setPhotos(state.photos); setSearch(state.search); setSearchQuery(state.searchQuery);
            setSearchMode(state.searchMode); setMatchScore(state.matchScore); setIsResultsActive(state.isResultsActive);
            setPage(state.page); setShowSaved(state.showSaved || false);
            
            setTimeout(() => window.scrollTo({ top: state.scroll, behavior: 'instant' }), 50);
            sessionStorage.removeItem('gelbet_cache');
            return; 
        }

        const urlParams = new URLSearchParams(window.location.search);
        const qFromUrl = urlParams.get("q");
        const modeFromUrl = urlParams.get("mode") as 'visual' | 'sonic';
        
        if (modeFromUrl) setSearchMode(modeFromUrl);
        if (qFromUrl) {
            setSearch(qFromUrl); setSearchQuery(qFromUrl); setIsResultsActive(true);
            fetchPhotos(qFromUrl, 1, true, modeFromUrl || 'visual');
        }
    } catch (e) {}

    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const qFromUrl = urlParams.get("q");
      if (qFromUrl) {
        setSearch(qFromUrl); setSearchQuery(qFromUrl); setIsResultsActive(true); fetchPhotos(qFromUrl, 1, true);
      } else { resetUI(); }
    };
    window.addEventListener('popstate', handlePopState);

    return () => { mounted = false; subscription.unsubscribe(); window.removeEventListener('popstate', handlePopState); };
  }, []); 

  async function fetchUserData(userId: string) {
    try {
      const [pinsRes, boardsRes] = await Promise.all([ 
        fetch(`/api/pins?user_id=${userId}`).catch(() => null), fetch(`/api/boards?user_id=${userId}`).catch(() => null) 
      ]);
      if (pinsRes?.ok) { const d = await pinsRes.json(); setPins(d.pins || d.data || []); }
      if (boardsRes?.ok) { const d = await boardsRes.json(); setBoards(d.boards || d.data || []); }
    } catch (e) {}
  }

  // ==========================================
  // СИНХРОНИЗАЦИЯ КОММЕНТАРИЕВ ИЗ БД
  // ==========================================
  useEffect(() => {
    if (!commentPin) return;
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase.from('comments').select('*').eq('pin_id', commentPin.src).order('created_at', { ascending: true });
        if (error) throw error;
        if (data) setDbComments(data);
      } catch (e) {
        console.error("Failed to load comments:", e);
      }
    };
    fetchComments();
  }, [commentPin]);

  useEffect(() => {
    if (commentPin && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [dbComments, commentPin]);

  const submitComment = async () => {
    if (!commentInput.trim() || !user || !commentPin) {
      if (!user) showToast("Authentication required");
      return;
    }

    const newLog = { 
      user_id: user.id, 
      pin_id: commentPin.src, 
      content: commentInput.trim(), 
      sender_name: user.user_metadata?.full_name || "USER" 
    };
    
    const optimisticLog = { ...newLog, id: Date.now().toString(), created_at: new Date().toISOString() };
    setDbComments(prev => [...prev, optimisticLog]);
    setCommentInput("");

    try {
      const { error } = await supabase.from('comments').insert([newLog]);
      if (error) { 
        setDbComments(prev => prev.filter(c => c.id !== optimisticLog.id)); 
        throw error; 
      }
    } catch (e) {
      showToast("Transmission failed");
    }
  };

  // ==========================================
  // ЯДРО ПОИСКА
  // ==========================================
  const fetchPhotos = useCallback(async (queryParam: string, pageNum: number, reset: boolean, modeOverride?: string) => {
    if (!queryParam) return;
    if (!reset && loadingRef.current) return;
    
    loadingRef.current = true; setLoading(true);
    if (reset) { 
      if (abortControllerRef.current) abortControllerRef.current.abort(); 
      abortControllerRef.current = new AbortController(); 
    }
    
    try {
      const params = new URLSearchParams({ page: String(pageNum), query: queryParam });
      if (modeOverride ?? searchMode) params.set("mode", modeOverride ?? searchMode);
      if (user) params.set("userId", user.id);
      
      const res = await fetch(`/api/search?${params}`, { signal: abortControllerRef.current?.signal });
      if (!res.ok) throw new Error("Fetch failed");
      
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || data.results || []);
      const isNsfwQuery = checkNsfw(queryParam);
      
      const fetched = rawArray
        .map((p: any) => {
          const mappedSrc = p.src || p.image || p.image_url || p.url;
          return {
            ...p, id: p.id || mappedSrc, src: mappedSrc, thumb: p.thumb || p.thumbnail || p.image || mappedSrc,
            link: p.link || p.url || p.source_url || mappedSrc, isNsfw: isNsfwQuery || checkNsfw(p.title || ""), rank: Math.random() > 0.8 ? 'S' : 'A'
          };
        })
        .filter((p: any) => p.src && p.src.startsWith("http"));

      setPhotos(prev => { 
        const combined = reset ? fetched : [...prev, ...fetched]; 
        const map = new Map(); combined.forEach((p: any) => map.set(p.src, p)); 
        return Array.from(map.values()); 
      });
      setHasMore(fetched.length > 0);
      
      if (reset) {
        const hash = queryParam.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        setMatchScore(parseFloat((85 + (hash % 14) + Math.random()).toFixed(1)));
      }
    } catch (e: any) { 
        if (e.name !== 'AbortError') console.error("Search fetch error:", e);
    } finally { 
        if (!(reset && abortControllerRef.current?.signal.aborted)) { setLoading(false); loadingRef.current = false; } 
    }
  }, [searchMode, user]);

  useEffect(() => {
    if (!bottomRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => { 
      if (entries[0].isIntersecting && hasMore && !loadingRef.current && searchQuery) { 
        const next = page + 1; setPage(next); fetchPhotos(searchQuery, next, false); 
      } 
    }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, searchQuery, fetchPhotos]);

  // ==========================================
  // ИСТОРИЯ
  // ==========================================
  function saveUserTag(tag: string) { 
    const formattedTag = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1); 
    setUserTags(prev => { 
      const updated = [formattedTag, ...prev.filter(t => t.toLowerCase() !== formattedTag.toLowerCase())].slice(0, 8); 
      localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); 
      localStorage.setItem("gelbet_history_wiped", "false");
      setHasWiped(false);
      return updated; 
    }); 
  }

  const clearHistory = () => {
    setUserTags([]);
    localStorage.setItem("gelbet_user_tags", "[]"); 
    localStorage.setItem("gelbet_history_wiped", "true");
    setHasWiped(true);
    showToast("History wiped");
  };

  async function handleSearch(e?: React.FormEvent, forceQuery?: string) { 
    if (e) e.preventDefault(); 
    const query = (forceQuery || search).trim();
    if (!query) return; 

    setIsResultsActive(true);
    window.history.pushState({}, '', `/?q=${encodeURIComponent(query)}&mode=${searchMode}`);

    setSearchQuery(query); saveUserTag(query); setPage(1); setHasMore(true); setPhotos([]); 
    fetchPhotos(query, 1, true);
  }

  function handleTagClick(tag: string) { setSearch(tag); handleSearch(undefined, tag); }

  function resetUI() {
    setIsResultsActive(false); setSearch(""); setSearchQuery(""); setShowSaved(false);
    window.history.pushState({}, '', '/');
  }

  // ==========================================
  // НАВИГАЦИЯ & СОЦИАЛКИ
  // ==========================================
  const saveStateAndNavigate = (url: string) => {
    sessionStorage.setItem('gelbet_cache', JSON.stringify({
        photos, search, searchQuery, searchMode, matchScore, isResultsActive, page, showSaved, scroll: window.scrollY
    }));
    router.push(url);
  };

  const handleNavigateToVibe = (photo: Photo) => {
    feedLocalAI(photo.src, photo.id);
    if (photo.isNsfw && !nsfwAllowed) { setShowAgeGate(photo); return; }
    saveStateAndNavigate(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
  };

  async function toggleSavePin(photo: Photo) { 
    if (!user) { router.push("/auth"); return; } 
    const existingPin = pins.find(p => p.image_url === photo.src);
    if (existingPin) {
      setPins(prev => prev.filter(p => p.id !== existingPin.id)); 
      try { await fetch(`/api/pins?id=${existingPin.id}`, { method: "DELETE" }); showToast("Artifact unlinked"); } catch (e) {}
    } else {
      try { 
        const res = await fetch("/api/pins", { 
          method: "POST", headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, board_id: null, source_url: photo.link }) 
        }); 
        if (res.ok) { 
          const data = await res.json(); 
          if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]); 
          showToast("Artifact secured");
        } 
      } catch (e) {} 
    }
  }

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  const handleShare = async (photo: Photo) => {
    const vibeUrl = `${window.location.origin}/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Gelbet Vector', url: vibeUrl }); } catch (e) { copyLink(vibeUrl); }
    } else { copyLink(vibeUrl); }
  };

  const copyLink = (link: string) => { navigator.clipboard.writeText(link); showToast("Link copied"); };

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
        showToast("Archive initialized");
      } 
    } catch (e) {} 
    setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false); 
  }

  const displayPhotos = showSaved ? pins.map(p => ({ 
    id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", link: p.source_url || "", isNsfw: checkNsfw(p.title || ""), rank: 'S' 
  })) : photos;
  
  const userAvatar = user?.user_metadata?.avatar_url || ""; 
  const userName = user?.user_metadata?.full_name || user?.email || "User";
  
  // Нет дефолтных тегов.
  const tagsToDisplay = isMounted ? userTags.slice(0, 4) : [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --bg-void: #020104; --glass-border: rgba(255, 255, 255, 0.05); --text-muted: #888; }
        body { background-color: var(--bg-void); color: #fff; font-family: 'Inter', sans-serif; margin: 0; overflow-x: hidden; min-height: 100vh; }
        .font-mono { font-family: 'Space Mono', monospace; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-sync { font-family: 'Syncopate', sans-serif; }
        
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg-void); } ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #666; }
        
        #ui-layer { position: relative; z-index: 10; min-height: 100vh; display: flex; flex-direction: column; }
        header { opacity: 0; pointer-events: none; transform: translateY(-20px); transition: all 1s; }
        .results-active header { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .nav-link { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); transition: color 0.3s; cursor: pointer; border: none; background: transparent; }
        .nav-link:hover, .nav-link.active { color: #fff; }

        /* ЭЛЕГАНТНЫЕ КОМПОНЕНТЫ */
        .glass-panel { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03); }
        .btn-elegant { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; padding: 8px 16px; cursor: pointer; transition: all 0.3s ease; border-radius: 99px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-elegant:hover:not(:disabled) { background: #fff; color: #000; box-shadow: 0 0 15px rgba(255,255,255,0.2); }

        /* ИСПРАВЛЕННАЯ СТРОКА ПОИСКА (АДАПТИВ) */
        .search-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 800px; padding: 0 16px; transition: all 1s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; align-items: center; }
        @media (min-width: 768px) { .search-container { padding: 0 24px; max-width: 1000px; } }
        
        .results-active .search-container { top: 12vh; transform: translate(-50%, 0); max-width: 800px; }
        @media (min-width: 768px) { .results-active .search-container { top: 15vh; } }

        .search-input-wrapper { display: flex; align-items: center; width: 100%; border-bottom: 2px solid rgba(255,255,255,0.4); transition: all 0.4s ease; padding-bottom: 12px; }
        .search-input-wrapper:focus-within { border-bottom-color: rgba(255,255,255,1); box-shadow: 0 20px 50px -10px rgba(255,255,255,0.1); }
        .results-active .search-input-wrapper { border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 8px; }

        .search-input { width: 100%; background: transparent; border: none; color: #fff; font-size: 28px; outline: none; letter-spacing: 4px; text-align: center; font-family: 'Space Mono', monospace; text-transform: uppercase; transition: all 0.4s ease; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
        .search-input::placeholder { color: rgba(255,255,255,0.5); letter-spacing: 4px; text-shadow: 0 2px 15px rgba(0,0,0,1); }
        @media (min-width: 768px) { .search-input { font-size: 48px; letter-spacing: 10px; } .search-input::placeholder { letter-spacing: 10px; } }
        
        .results-active .search-input { font-size: 16px; letter-spacing: 2px; text-shadow: none; }
        @media (min-width: 768px) { .results-active .search-input { font-size: 20px; } }

        .quick-tags { display: flex; gap: 10px; margin-top: 28px; justify-content: center; flex-wrap: wrap; transition: opacity 0.5s; }
        .results-active .quick-tags { opacity: 0; pointer-events: none; position: absolute; }
        .tag-pill { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); padding: 8px 18px; border-radius: 4px; font-family: 'Space Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
        @media (min-width: 768px) { .tag-pill { font-size: 11px; padding: 10px 22px; } }
        .tag-pill:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2); }

        .vector-selector { display: flex; gap: 24px; margin-top: 40px; transition: opacity 0.5s; }
        @media (min-width: 768px) { .vector-selector { gap: 50px; margin-top: 50px; } }
        .results-active .vector-selector { opacity: 0; pointer-events: none; position: absolute; }
        .vector-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.4); padding: 8px 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; font-family: 'Space Mono', monospace; cursor: pointer; position: relative; transition: all 0.3s; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
        @media (min-width: 768px) { .vector-btn { font-size: 12px; letter-spacing: 4px; } }
        .vector-btn::after { content: ''; position: absolute; bottom: 0; left: 50%; right: 50%; height: 1px; background: #fff; transition: all 0.3s ease; }
        .vector-btn.active, .vector-btn:hover { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
        .vector-btn.active::after { left: 0; right: 0; }
        .vector-btn.sonic-mode.active::after { background: #10b981; }

        .content-area { position: absolute; visibility: hidden; width: 100%; opacity: 0; pointer-events: none; transform: translateY(40px); transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 0.3s; padding: 0 16px 80px; }
        @media (min-width: 768px) { .content-area { padding: 0 32px 80px; } }
        .results-active .content-area { position: relative; visibility: visible; opacity: 1; pointer-events: auto; transform: translateY(0); margin-top: 30vh; }
        @media (min-width: 768px) { .results-active .content-area { margin-top: 35vh; } }

        .section-title { font-family: 'Space Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); margin-bottom: 16px; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
        @media (min-width: 768px) { .section-title { font-size: 10px; letter-spacing: 4px; margin-bottom: 24px; padding-bottom: 12px; } }

        .archives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100%, 1fr)); gap: 16px; margin-bottom: 40px; }
        @media (min-width: 640px) { .archives-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-bottom: 70px; } }
        .archive-card { padding: 20px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(10,10,12,0.6); backdrop-filter: blur(12px); cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
        .archive-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }

        .v-masonry { column-count: 2; column-gap: 12px; }
        @media (min-width: 768px) { .v-masonry { column-count: 3; column-gap: 16px; } }
        @media (min-width: 1024px) { .v-masonry { column-count: 4; } }
        @media (min-width: 1440px) { .v-masonry { column-count: 5; } }

        .pin-card { break-inside: avoid; margin-bottom: 12px; border-radius: 12px; overflow: hidden; position: relative; background: #08070a; cursor: pointer; transition: all 0.4s ease; transform: translateZ(0); }
        @media (min-width: 768px) { .pin-card { margin-bottom: 16px; } }
        .pin-card img { width: 100%; display: block; filter: brightness(0.8); transition: filter 0.4s ease; }
        .pin-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.6); z-index: 10; }
        .pin-card:hover img { filter: brightness(1.05); }

        .pin-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%); opacity: 0; transition: opacity 0.4s ease; display: flex; flex-direction: column; justify-content: space-between; padding: 16px; pointer-events: none; }
        .pin-card:hover .pin-overlay { opacity: 1; pointer-events: auto; }
        
        .icon-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.3s; }
        .icon-btn:hover { background: #fff; color: #000; transform: scale(1.1); }
        .icon-btn svg { width: 14px; height: 14px; transition: fill 0.3s; }

        .toast-popup { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); padding: 10px 20px; border-radius: 99px; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #000; z-index: 9999; animation: floatUp 0.3s ease-out; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        @keyframes floatUp { from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
      `}} />

      {/* ФИКСАЦИЯ СФЕРЫ (Масштаб на мобилках) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, transform: isResultsActive ? 'translateY(-20vh) scale(0.85)' : 'none', transition: 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
         <ResonanceEngine mode={searchMode} isActive={isResultsActive} />
      </div>

      <div id="ui-layer">
        <header className="w-full px-4 md:px-8 py-4 md:py-6 flex justify-between items-center fixed top-0 z-50 bg-[#020104]/80 backdrop-blur-md border-b border-white/5">
          <div className="font-sync text-xs md:text-sm tracking-[4px] font-bold text-white cursor-pointer" onClick={resetUI}>
            GELBET <span className="text-neutral-600">[]</span>
          </div>
          
          <div className="gap-8 absolute left-1/2 -translate-x-1/2 hidden md:flex">
            <button className="nav-link active" onClick={resetUI}>Resonance</button>
            <button className="nav-link" onClick={() => saveStateAndNavigate('/profile')}>Saved</button>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="font-mono text-[8px] md:text-[9px] text-neutral-500 text-right tracking-widest uppercase hidden sm:block">
              <div className="text-white">Entity: {userName.split(' ')[0]}</div>
              <div>Tensor Aligned</div>
            </div>
            <button onClick={() => saveStateAndNavigate('/profile')} className="w-8 h-8 md:w-9 md:h-9 border border-neutral-700 bg-[#0a0a0c] flex items-center justify-center text-white font-mono text-xs hover:border-white cursor-pointer transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-full overflow-hidden">
              {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" alt="avatar" /> : (userName[0] || "U").toUpperCase()}
            </button>
          </div>
        </header>

        <div className="search-container">
          <form className="search-input-wrapper w-full" onSubmit={(e) => handleSearch(e)}>
            <input type="text" id="searchInput" className="search-input" placeholder={searchMode === 'sonic' ? "AWAITING AUDIO STREAM..." : "DEFINE VECTOR..."} autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          
          <div className="quick-tags relative">
            {tagsToDisplay.map(tag => (
              <button key={tag} type="button" className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>
            ))}
            {userTags.length > 0 && (
              <button onClick={clearHistory} className="ml-2 text-[8px] font-mono text-neutral-600 hover:text-white transition-colors uppercase tracking-widest mt-1">
                [ Wipe ]
              </button>
            )}
          </div>

          <div className="vector-selector">
            <button type="button" className={`vector-btn ${searchMode === 'visual' ? 'active' : ''}`} onClick={() => setSearchMode('visual')}>Visual Plane</button>
            <button type="button" className={`vector-btn sonic-mode ${searchMode === 'sonic' ? 'active' : ''}`} onClick={() => setSearchMode('sonic')}>Sonic Resonance</button>
          </div>
        </div>

        <div className="content-area max-w-[1800px] mx-auto w-full">
          {!showSaved && (
            <div className="mb-10 md:mb-14">
              <div className="section-title">
                <span>My Archives</span>
              </div>
              <div className="archives-grid">
                {boards.length === 0 ? (
                  <div className="archive-card flex items-center justify-center min-h-[100px] border-dashed bg-transparent border-white/10 text-neutral-500 font-mono text-[9px] uppercase tracking-widest">
                    No Archives Found
                  </div>
                ) : (
                  boards.map(board => (
                    <div key={board.id} className="archive-card">
                      <div className="font-mono text-[10px] md:text-[11px] tracking-widest text-white mb-2 md:mb-3 uppercase font-bold">{board.name}</div>
                      <div className="text-[8px] md:text-[9px] text-neutral-500 uppercase tracking-widest">{board.description || "Collection"}</div>
                      <div className="mt-4 text-[9px] md:text-[10px] text-neutral-300 uppercase tracking-widest">{pins.filter(p => p.board_id === board.id).length} Artifacts</div>
                    </div>
                  ))
                )}
                <div className="archive-card flex flex-col items-center justify-center border-dashed border-neutral-800 hover:border-neutral-500 bg-transparent min-h-[100px]" onClick={() => setShowNewBoard(true)}>
                  <div className="font-mono text-[9px] md:text-[10px] text-neutral-400 uppercase tracking-widest">+ Establish Archive</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="section-title">
              <span>{showSaved ? "Saved Resonance" : "Resonance Feed"}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Match: {matchScore}%</span>
            </div>

            <div className="v-masonry">
              {displayPhotos.map((photo, i) => {
                const isBlurred = photo.isNsfw && !nsfwAllowed;
                const saved = isPinned(photo);

                return (
                  <div key={`${photo.id}-${i}`} className="pin-card" onClick={() => handleNavigateToVibe(photo)}>
                    <img src={photo.thumb || photo.src} alt="Artifact" style={isBlurred ? { filter: "blur(20px)" } : {}} />
                    <div className="pin-overlay">
                      <div className="flex justify-end w-full">
                        <button className={`btn-elegant !text-[8px] !px-4 !py-1.5 ${saved ? 'bg-white text-black' : ''}`} onClick={(e) => { e.stopPropagation(); toggleSavePin(photo); }}>
                          {saved ? 'Unlink' : 'Store'}
                        </button>
                      </div>
                      <div className="flex justify-end items-end w-full mt-auto">
                        <div className="flex gap-2">
                          <button className="icon-btn" title="Comments" onClick={(e) => { e.stopPropagation(); setCommentPin(photo); }}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </button>
                          <button className="icon-btn" title="Share" onClick={(e) => { e.stopPropagation(); handleShare(photo); }}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {loading && <div className="text-center py-12"><div className="w-8 h-8 border border-white/20 border-t-[#10b981] rounded-full animate-spin mx-auto"></div></div>}
            <div ref={bottomRef} style={{ height: 10 }}></div>
          </div>
        </div>
      </div>

      {toastMsg && <div className="toast-popup">{toastMsg}</div>}

      {/* ЭЛЕГАНТНАЯ МОДАЛКА КОММЕНТАРИЕВ ДЛЯ ГЛАВНОЙ */}
      {commentPin && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={() => setCommentPin(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-panel w-full max-w-xl flex flex-col overflow-hidden shadow-2xl">
            
            <div className="border-b border-white/5 px-6 py-4 flex justify-between items-center bg-white/5">
              <div className="font-inter font-semibold text-[10px] text-neutral-400 uppercase tracking-[3px]">
                Comments
              </div>
              <button onClick={() => setCommentPin(null)} className="text-neutral-500 hover:text-white font-mono text-xs transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 max-h-[50vh] scroll-smooth">
               {dbComments.length === 0 ? (
                 <div className="text-center text-neutral-500 font-inter text-[11px] py-10">No comments yet. Be the first to share your thoughts.</div>
               ) : (
                 dbComments.map((c, idx) => (
                   <div key={idx} className="flex flex-col gap-1 mt-1">
                     <div className="flex items-end gap-3">
                       <span className="text-neutral-400 font-inter text-[9px] uppercase tracking-widest font-medium">{c.sender_name}</span>
                       <span className="text-neutral-700 font-mono text-[8px]">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                     <div className="text-neutral-200 font-inter text-[11px] font-light leading-relaxed bg-white/5 px-4 py-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-white/5 inline-block self-start max-w-[85%] shadow-sm">
                       {c.content}
                     </div>
                   </div>
                 ))
               )}
               <div ref={commentsEndRef} />
            </div>
            
            <div className="border-t border-white/5 flex bg-black/40 p-3">
               <input 
                 type="text" 
                 value={commentInput}
                 onChange={(e) => setCommentInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                 className="w-full bg-transparent border-none text-white font-inter font-light text-[11px] px-4 py-2 outline-none focus:ring-0 placeholder-neutral-600" 
                 placeholder="Write a comment..." 
                 autoFocus
               />
               <button 
                 onClick={submitComment}
                 className="bg-white text-black font-inter font-semibold text-[9px] uppercase tracking-[2px] px-6 rounded-full hover:bg-neutral-200 transition-colors" 
               >
                 Send
               </button>
            </div>
          </div>
        </div>
      )}

      {showNewBoard && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowNewBoard(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-panel p-8 max-w-md w-full flex flex-col gap-6">
            <h2 className="font-sync text-xs font-bold text-white tracking-[3px] uppercase">Establish Archive</h2>
            <div className="flex flex-col gap-4">
               <input className="w-full bg-black/50 border border-white/10 text-white font-inter text-xs p-4 outline-none focus:border-white/40 transition-all rounded-xl placeholder-white/30" placeholder="Designation" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus />
               <textarea className="w-full bg-black/50 border border-white/10 text-white font-inter text-xs p-4 outline-none focus:border-white/40 transition-all rounded-xl h-24 resize-none placeholder-white/30" placeholder="Context / Vibe" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} />
            </div>
            <div className="flex gap-4">
               <button className="flex-1 btn-elegant" onClick={() => setShowNewBoard(false)}>Abort</button>
               <button className="flex-1 btn-elegant bg-white !text-black" disabled={!newBoardName.trim()} onClick={createBoard}>Initialize</button>
            </div>
          </div>
        </div>
      )}

      {showAgeGate && (
        <AgeGateModal 
          onConfirm={() => { 
            setNsfwAllowed(true); 
            try { localStorage.setItem("gelbet_nsfw_18plus", "true"); } catch (e) {} 
            const p = showAgeGate; 
            setShowAgeGate(null); 
            if (p) handleNavigateToVibe(p); 
          }} 
          onCancel={() => setShowAgeGate(null)} 
        />
      )}
    </>
  );
}
