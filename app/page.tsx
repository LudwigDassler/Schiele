"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../lib/nsfw";
import PinCard from "../components/PinCard";
import { useTasteProfile } from "./hooks/useTasteProfile";
import { getAnonId } from "../lib/identity";
import SonicOracleVisualizer from "../components/SonicOracleVisualizer";

const defaultTags = ["Aesthetic", "Dark Academia", "Cyberpunk", "Minimalism", "Architecture", "Street Photography", "Vintage", "Interior"];

const personas = [
  { id: "real", name: "Real User (You)", sub: "No AI memory", hex: "#737373", colors: ['#3a0088', '#ff0055', '#ff4500'] },
  { id: "victoria", name: "Victoria", sub: "Dark Academia", hex: "#8c7362", colors: ['#2a201a', '#4a3b32', '#8c7362'] },
  { id: "max", name: "Max", sub: "Cyberpunk", hex: "#ff0055", colors: ['#000000', '#ff0055', '#00f3ff'] },
  { id: "elena", name: "Elena", sub: "Minimalism", hex: "#ffffff", colors: ['#d4b896', '#ffffff', '#cccccc'] },
  { id: "oliver", name: "Oliver", sub: "Cottagecore", hex: "#16a34a", colors: ['#1a3300', '#336600', '#66cc00'] },
  { id: "luna", name: "Luna", sub: "Vaporwave & Y2K", hex: "#d946ef", colors: ['#00ffff', '#ff00ff', '#8a2be2'] },
  { id: "raven", name: "Raven", sub: "Goth Core", hex: "#581c87", colors: ['#000000', '#3a0088', '#1a0033'] },
  { id: "iris", name: "Iris", sub: "Textile & Embroidery", hex: "#0d9488", colors: ['#0f766e', '#14b8a6', '#042f2e'] },
  { id: "arthur", name: "Arthur", sub: "Technical Blueprints", hex: "#3b82f6", colors: ['#1e3a8a', '#2563eb', '#60a5fa'] },
  { id: "elliot", name: "Elliot", sub: "Paranoid Sysadmin", hex: "#22c55e", colors: ['#064e3b', '#16a34a', '#4ade80'] },
  { id: "jimmy", name: "Jimmy", sub: "Occult Alchemist", hex: "#d97706", colors: ['#78350f', '#b45309', '#4c1d95'] },
  { id: "robert", name: "Robert", sub: "Celtic Mystic", hex: "#059669", colors: ['#064e3b', '#059669', '#a7f3d0'] },
  { id: "jonesy", name: "Jonesy", sub: "Structural Genius", hex: "#64748b", colors: ['#1e293b', '#475569', '#94a3b8'] },
  { id: "bonzo", name: "Bonzo", sub: "Kinetic Juggernaut", hex: "#ea580c", colors: ['#7f1d1d', '#ea580c', '#fca5a5'] }
];

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const router = useRouter();
  const { feedLocalAI } = useTasteProfile();
  
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("Aesthetic");
  const [userTags, setUserTags] = useState<string[]>([]);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [activePersona, setActivePersona] = useState(personas[0]);
  const [isKashmirOpen, setIsKashmirOpen] = useState(false);
  const kashmirRef = useRef<HTMLDivElement>(null);

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
  const [showSaveToBoard, setShowSaveToBoard] = useState<Photo | null>(null);
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [activeVibe, setActiveVibe] = useState("");
  const [mainImgLoaded, setMainImgLoaded] = useState(false);
  const [activeMode, setActiveMode] = useState("classic");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  
  const [oracleMode, setOracleMode] = useState(false);
  const [oracleData, setOracleData] = useState({
    isIdle: true,
    trackName: "Awaiting sonic input...",
    bpmSpeed: 16,
    amplitude: 0.05,
    isErratic: false
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const modalBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const currentRelatedQueryRef = useRef("");
  const isSynthSessionRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        if (!search) setIsMobileSearchOpen(false);
      }
      if (kashmirRef.current && !kashmirRef.current.contains(event.target as Node)) {
        setIsKashmirOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [search]);

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

    if(mounted) {
        setSearchQuery(initialQuery);
        setPage(1); setHasMore(true); setPhotos([]);
        fetchPhotos(initialQuery, 1, true, urlMode, urlUserId);
    }

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []); 

  useEffect(() => { if (selected) setMainImgLoaded(false); }, [selected?.id]);

  async function fetchUserData(userId: string) {
    try {
      const [pinsRes, boardsRes] = await Promise.all([ fetch(`/api/pins?user_id=${userId}`).catch(() => null), fetch(`/api/boards?user_id=${userId}`).catch(() => null) ]);
      if (pinsRes?.ok) { const d = await pinsRes.json(); setPins(d.pins || d.data || []); }
      if (boardsRes?.ok) { const d = await boardsRes.json(); setBoards(d.boards || d.data || []); }
    } catch (e) {}
  }

  const fetchPhotos = useCallback(async (queryParam: string, pageNum: number, reset: boolean, modeOverride?: string, userIdOverride?: string | null) => {
    if (!reset && loadingRef.current) return;
    loadingRef.current = true; setLoading(true);
    if (reset) { if (abortControllerRef.current) abortControllerRef.current.abort(); abortControllerRef.current = new AbortController(); }
    try {
      const effectiveMode = modeOverride ?? activeMode;
      const effectiveUserId = userIdOverride !== undefined ? userIdOverride : activeUserId;
      
      const params = new URLSearchParams({ page: String(pageNum) });
      if (queryParam) params.set("query", queryParam);
      if (effectiveMode) params.set("mode", effectiveMode);
      if (effectiveUserId) params.set("userId", effectiveUserId);
      
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
            isNsfw: isNsfwQuery || checkNsfw(p.title || "")
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
    observerRef.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loadingRef.current) { const next = page + 1; setPage(next); fetchPhotos(searchQuery, next, false); } }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, searchQuery, fetchPhotos]);

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3500); }
  function saveUserTag(tag: string) { const formattedTag = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1); setUserTags(prev => { const updated = [formattedTag, ...prev.filter(t => t.toLowerCase() !== formattedTag.toLowerCase())].slice(0, 8); localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); return updated; }); }
  function removeUserTag(tagToRemove: string, e?: React.MouseEvent) { if (e) e.stopPropagation(); setUserTags(prev => { const updated = prev.filter(t => t !== tagToRemove); localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); return updated; }); }
  function clearAllTags(e?: React.MouseEvent) { if (e) e.stopPropagation(); setUserTags([]); localStorage.removeItem("gelbet_user_tags"); }
  
  async function handleSearch(e: React.FormEvent) { 
    e.preventDefault(); 
    if (!search.trim()) return; 

    if (oracleMode) {
      setIsAILoading(true);
      setIsMobileSearchOpen(false); 
      setIsSearchFocused(false); 
      closeAllPanels();
      
      setOracleData({ isIdle: false, trackName: "Analyzing signal...", bpmSpeed: 4, amplitude: 0.2, isErratic: false });

      try {
        const res = await fetch("/api/oracle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackInput: search.trim() })
        });
        
        if (!res.ok) throw new Error("Oracle API Error");
        const data = await res.json();
        
        setOracleData({
          isIdle: false,
          trackName: data.track_name || search.trim(),
          bpmSpeed: data.bpm_speed || 3,
          amplitude: data.amplitude || 0.6,
          isErratic: data.is_erratic || false
        });

        const hiddenQuery = data.visual_query;
        setSearchQuery(hiddenQuery);
        setPage(1); setHasMore(true); setPhotos([]);
        await fetchPhotos(hiddenQuery, 1, true);

      } catch (err) {
        showToast("Oracle Connection Failed");
        setOracleData(prev => ({ ...prev, isIdle: true, trackName: "Signal lost..." }));
      } finally {
        setIsAILoading(false);
      }
      return;
    }

    const query = search.trim();
    setSearchQuery(query); saveUserTag(query); setIsMobileSearchOpen(false); setIsSearchFocused(false); closeAllPanels(); 
    setPage(1); setHasMore(true); setPhotos([]); fetchPhotos(query, 1, true);
  }
  
  function handleTagClick(tag: string) { 
    if(oracleMode) { setOracleMode(false); setOracleData(prev => ({ ...prev, isIdle: true, trackName: "Awaiting sonic input..." })); }
    setSearch(tag); setSearchQuery(tag); saveUserTag(tag); setIsSearchFocused(false); setIsMobileSearchOpen(false); closeAllPanels(); 
    setPage(1); setHasMore(true); setPhotos([]); fetchPhotos(tag, 1, true);
  }
  function clearSearch() { 
    if(oracleMode) { setOracleMode(false); setOracleData(prev => ({ ...prev, isIdle: true, trackName: "Awaiting sonic input..." })); }
    setSearch(""); setSearchQuery("Aesthetic"); setIsMobileSearchOpen(false); closeAllPanels(); 
    setPage(1); setHasMore(true); setPhotos([]); fetchPhotos("Aesthetic", 1, true);
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setShowAIModal(false); 
    setIsAILoading(true);
    
    let finalQuery = aiPrompt.trim();
    try {
      const aiRes = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enhance_prompt", payload: finalQuery }) });
      if (aiRes.ok) { 
          const data = await aiRes.json(); 
          if (data.result) finalQuery = data.result; 
      } else { 
          showToast("AI Engine unreachable."); 
          if (!/[а-яА-ЯёЁ]/.test(finalQuery) && !finalQuery.toLowerCase().includes('aesthetic')) finalQuery += " aesthetic"; 
      }
    } catch (e) { 
        showToast("AI network error."); 
    } finally {
        setIsAILoading(false);
        if(oracleMode) { setOracleMode(false); setOracleData(prev => ({ ...prev, isIdle: true })); }
        setSearch(finalQuery); setSearchQuery(finalQuery); saveUserTag(finalQuery); setAiPrompt(""); setIsMobileSearchOpen(false); setIsSearchFocused(false);
        setPage(1); setHasMore(true); setPhotos([]); fetchPhotos(finalQuery, 1, true);
    }
  }

  function closeAllPanels() { setShowMenu(false); setShowSaved(false); setShowBoards(false); }
  async function savePin(photo: Photo, boardId?: string) { if (!user) { window.location.href = "/auth"; return; } try { const res = await fetch("/api/pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, board_id: boardId || null, source_url: photo.link }) }); if (res.ok) { const data = await res.json(); if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]); showToast("Saved to profile"); } } catch (e) {} setShowSaveToBoard(null); setSelected(null); }
  async function deletePin(pinId: string) { try { const res = await fetch(`/api/pins?id=${pinId}`, { method: "DELETE" }); if (res.ok) { setPins(prev => prev.filter(p => p.id !== pinId)); showToast("Removed from saved"); } } catch (e) {} }
  async function createBoard() { if (!newBoardName || !user) return; try { const res = await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, name: newBoardName, description: newBoardDesc }) }); if (res.ok) { const data = await res.json(); if (data.board || data.data) setBoards(prev => [data.board || data.data, ...prev]); } } catch (e) {} setNewBoardName(""); setNewBoardDesc(""); setShowNewBoard(false); showToast("Archive Created!"); }
  async function updateBoard() { if (!editBoard) return; try { const res = await fetch("/api/boards", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editBoard.id, name: editBoard.name, description: editBoard.description }) }); if (res.ok) { const data = await res.json(); const updatedBoard = data.board || data.data; if (updatedBoard) setBoards(prev => prev.map(b => b.id === editBoard.id ? updatedBoard : b)); } } catch (e) {} setEditBoard(null); }
  async function deleteBoard(boardId: string) { if (!confirm("Delete this board?")) return; try { const res = await fetch(`/api/boards?id=${boardId}`, { method: "DELETE" }); if (res.ok) setBoards(prev => prev.filter(b => b.id !== boardId)); } catch (e) {} }
  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }
  function sharePhoto(photo: Photo) { const url = photo.link || window.location.href; if (navigator.share) navigator.share({ title: photo.title || "Gelbet Vibe", url }); else { navigator.clipboard.writeText(url); showToast("Link copied to clipboard!"); } }

  const displayPhotos = showSaved ? pins.map(p => ({ id: p.id, src: p.image_url, thumb: p.image_url, title: p.title || "", link: p.source_url || "", isNsfw: checkNsfw(p.title || "") })) : photos;
  const userAvatar = user?.user_metadata?.avatar_url || ""; const userName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: #020104; font-family: 'Inter', sans-serif; color: white; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #020104; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        
        /* Universal Animations: Currents, DSOTM, LZ III */
        @keyframes ooze { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(10%, -10%) scale(1.1); } }
        @keyframes flow-lines { 0% { background-position: 0 0; } 100% { background-position: 500px 500px; } }
        @keyframes volvelle-spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes heartbeat { 0%, 100% { transform: scale(1); opacity: 0.5; box-shadow: none; } 10%, 30% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 20px rgba(249, 115, 22, 0.8); } 20% { transform: scale(1); opacity: 0.8; } }
        
        .force-fluid-filter { -webkit-filter: url('#fluid-warp'); filter: url('#fluid-warp'); }
        .kashmir-scroll::-webkit-scrollbar { width: 4px; } .kashmir-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
        
        .prism-focus:focus-within { box-shadow: -10px 0 30px rgba(255,0,85,0.2), 0 0 30px rgba(0,255,0,0.1), 10px 0 30px rgba(0,255,255,0.2); border-color: rgba(255,255,255,0.4); }

        .header { position: sticky; top: 0; z-index: 100; background: rgba(2, 1, 4, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-family: 'Syncopate', sans-serif; font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 0.3em; cursor: pointer; user-select: none; text-shadow: 0 0 10px rgba(255,255,255,0.2); transition: all 0.3s; }
        .logo:hover { text-shadow: -3px 0 10px rgba(255,0,85,0.5), 0 0 10px rgba(0,255,0,0.5), 3px 0 10px rgba(0,255,255,0.5); }
        
        .search-form { display: flex; flex: 1; max-width: 42rem; margin: 0 2rem; position: relative; z-index: 30; } 
        .search-container { width: 100%; position: relative; }
        .search-wrap { display: flex; align-items: center; width: 100%; background: rgba(255,255,255,0.02); border-radius: 9999px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 20px rgba(0,0,0,0.8); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); } 
        .search-wrap:focus-within { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); box-shadow: -10px 0 30px rgba(255,0,85,0.2), 0 0 30px rgba(0,255,0,0.1), 10px 0 30px rgba(0,255,255,0.2); }
        .search-wrap.oracle-active { border-color: #f97316; box-shadow: 0 0 30px rgba(249, 115, 22, 0.3); }
        .oracle-toggle-inline { display: flex; align-items: center; justify-content: center; padding: 0 12px 0 16px; border-right: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); background: transparent; cursor: pointer; transition: color 0.2s; height: 24px; margin: 8px 0; flex-shrink: 0; }
        .oracle-toggle-inline:hover, .search-wrap.oracle-active .oracle-toggle-inline { color: #fff; text-shadow: 0 0 10px #fff; }
        .search-input { width: 100%; padding: 12px 16px; background: transparent; border: none; color: #fff; font-size: 14px; outline: none; transition: all 0.3s ease; font-family: 'Inter', sans-serif; } 
        .search-input::placeholder { color: rgba(255,255,255,0.3); letter-spacing: 1px; }
        .search-wrap.oracle-active .search-input { color: #f97316; font-style: italic; font-weight: 500; }
        .search-btn { width: 40px; height: 100%; padding: 0; background: transparent; border: none; color: rgba(255,255,255,0.5); cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 8px; } 
        .search-btn:hover { color: #fff; filter: drop-shadow(0 0 8px #fff); }
        
        .search-dropdown { position: absolute; top: calc(100% + 12px); left: 0; width: 100%; background: rgba(2,1,4,0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.1); backdrop-filter: blur(20px); z-index: 300; padding: 8px 0; animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); overflow: hidden; }
        .search-dropdown-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 2px; font-family: 'Syncopate', sans-serif; }
        .search-dropdown-clear-all { background: none; border: none; color: #666; cursor: pointer; font-size: 10px; font-weight: 700; text-transform: uppercase; transition: color 0.2s; } .search-dropdown-clear-all:hover { color: #ef4444; }
        .search-dropdown-item { display: flex; align-items: center; padding: 12px 16px; cursor: pointer; transition: all 0.2s; gap: 12px; color: #ddd; font-size: 14px; } .search-dropdown-item:hover { background: rgba(255,255,255,0.05); color: #fff; padding-left: 20px; }
        .search-dropdown-icon { font-size: 14px; color: #666; } .search-dropdown-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .search-dropdown-remove { background: none; border: none; color: #666; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; } .search-dropdown-remove:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        
        .oracle-stage-wrapper { width: 100%; padding: 0 16px; height: 0; opacity: 0; overflow: hidden; transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); position: relative; z-index: 10; }
        .oracle-stage-wrapper.open { height: 240px; opacity: 1; margin: 16px 0 24px; }
        .oracle-meta-header { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
        .oracle-meta-title { font-family: 'Syncopate', sans-serif; font-size: 10px; letter-spacing: 6px; color: #555; text-transform: uppercase; display: flex; align-items: center; gap: 12px; transition: color 1s ease; }
        .oracle-meta-title.active { color: #f97316; text-shadow: 0 0 15px rgba(249,115,22,0.5); }
        .pulse-dot { width: 6px; height: 6px; background: #333; border-radius: 50%; transition: all 1s ease; }
        .pulse-dot.active { background: #f97316; animation: heartbeat 1.5s infinite; }
        .oracle-track-name { font-family: 'Syncopate', sans-serif; font-size: 16px; color: #555; margin-top: 12px; letter-spacing: 2px; transition: all 1s ease; text-align: center; max-width: 500px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
        .oracle-track-name.active { color: #fff; font-weight: 700; text-shadow: 0 0 20px rgba(255,255,255,0.4); }

        @media (max-width: 768px) { .search-form { flex: none; margin: 0; } .search-container { flex: none; } .search-wrap { width: 40px; height: 40px; flex: none; border-radius: 50%; background: transparent; border: none; cursor: pointer; box-shadow: none; } .search-input { display: none; } .search-btn { width: 40px; height: 40px; border-radius: 50%; pointer-events: none; margin: 0; } .oracle-toggle-inline { display: none; } .search-form.mobile-active { position: absolute; left: 16px; right: 16px; top: 10px; z-index: 200; flex: 1; } .search-form.mobile-active .search-container { flex: 1; } .search-form.mobile-active .search-wrap { width: 100%; height: 48px; border-radius: 9999px; background: rgba(2,1,4,0.95); border: 1px solid rgba(255,255,255,0.2); flex: 1; display: flex; cursor: text; box-shadow: 0 20px 40px rgba(0,0,0,0.9); } .search-form.mobile-active .search-input { display: block; flex: 1; } .search-form.mobile-active .search-btn { width: 44px; pointer-events: auto; } .search-form.mobile-active .oracle-toggle-inline { display: flex; } .search-dropdown { max-width: 100%; } .logo { display: none; } }
        
        .hbtn { background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #888; flex-shrink: 0; transition: all 0.3s ease; position: relative; } 
        .hbtn:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.5); } 
        .hbtn.active { background: rgba(168,85,247,0.1); color: #a855f7; border: 1px solid rgba(168,85,247,0.3); }
        .badge { position: absolute; top: 0px; right: 0px; background: #a855f7; color: #fff; border-radius: 10px; padding: 2px 6px; font-size: 9px; font-weight: 700; box-shadow: 0 0 10px rgba(168,85,247,0.5); }
        .avatar { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0; object-fit: cover; transition: all 0.3s; } .avatar:hover { border-color: #d4b896; box-shadow: 0 0 15px rgba(212,184,150,0.4); }
        .avatar-placeholder { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0; background: #111; display: flex; align-items: center; justify-content: center; color: #888; font-size: 13px; font-weight: 700; font-family: 'Syncopate', sans-serif; transition: all 0.3s; } .avatar-placeholder:hover { border-color: #d4b896; color: #d4b896; }
        .sign-btn { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 8px 20px; cursor: pointer; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; flex-shrink: 0; text-decoration: none; display: flex; align-items: center; transition: all 0.3s; letter-spacing: 1px; } .sign-btn:hover { border-color: #fff; background: #fff; color: #000; box-shadow: 0 0 20px rgba(255,255,255,0.2); }
        .tag-pill { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #aaa; padding: 8px 18px; border-radius: 24px; font-size: 11px; font-weight: 600; font-family: 'Syncopate', sans-serif; letter-spacing: 1px; white-space: nowrap; cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); } .tag-pill:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.5); } .tag-pill.active { background: rgba(168,85,247,0.15); color: #a855f7; border-color: #a855f7; box-shadow: 0 0 20px rgba(168,85,247,0.2); }
        
        .burger-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(2,1,4,0.9); animation: fadeIn 0.3s ease; backdrop-filter: blur(10px); } .burger-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(340px, 85vw); z-index: 151; background: #050308; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; animation: slideRight 0.4s cubic-bezier(0.16,1,0.3,1); overflow-y: auto; box-shadow: 20px 0 50px rgba(0,0,0,0.8); }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .burger-header { padding: 24px 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; } .burger-logo { font-family: 'Syncopate', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 4px; color: #fff; } .burger-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #666; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s; } .burger-close:hover { color: #fff; background: rgba(255,255,255,0.1); transform: rotate(90deg); } .burger-action { display: flex; align-items: center; gap: 16px; padding: 16px 24px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; color: #aaa; font-size: 13px; font-weight: 600; font-family: 'Syncopate', sans-serif; letter-spacing: 1px; transition: all 0.2s; text-transform: uppercase; } .burger-action:hover { background: rgba(255,255,255,0.05); color: #fff; padding-left: 32px; } .burger-action-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; } .burger-action:hover .burger-action-icon { border-color: #a855f7; color: #a855f7; box-shadow: 0 0 15px rgba(168,85,247,0.3); }
        
        .grid-wrap { padding: 24px; position: relative; z-index: 10; max-width: 1600px; margin: 0 auto; } .masonry { columns: 2; gap: 16px; } @media (min-width: 480px) { .masonry { columns: 3; } } @media (min-width: 768px) { .masonry { columns: 4; } } @media (min-width: 1024px) { .masonry { columns: 5; } } @media (min-width: 1440px) { .masonry { columns: 6; } }
        .boards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; position: relative; z-index: 10; max-width: 1400px; margin: 0 auto; padding: 0 24px; } @media (min-width: 640px) { .boards-grid { grid-template-columns: repeat(3, 1fr); } } @media (min-width: 1024px) { .boards-grid { grid-template-columns: repeat(4, 1fr); } } 
        .board-card { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); background: rgba(10,10,12,0.8); backdrop-filter: blur(20px); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); } .board-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.15); box-shadow: -10px 0 30px rgba(255,0,85,0.1), 0 0 30px rgba(0,255,0,0.05), 10px 0 30px rgba(0,255,255,0.1); } 
        .board-cover { height: 100px; background: linear-gradient(135deg, #110d14, #050308); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; } .board-cover::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(255,255,255,0.02) 6px, rgba(255,255,255,0.02) 7px); }
        .board-info { padding: 16px; } .board-actions { display: flex; gap: 8px; margin-top: 16px; } .board-edit-btn, .board-del-btn { flex: 1; padding: 8px; border-radius: 8px; font-size: 10px; cursor: pointer; background: transparent; font-weight: 700; text-transform: uppercase; font-family: 'Syncopate', sans-serif; letter-spacing: 1px; transition: all 0.2s; } .board-edit-btn { border: 1px solid rgba(255,255,255,0.1); color: #888; } .board-edit-btn:hover { border-color: #fff; color: #fff; background: rgba(255,255,255,0.05); } .board-del-btn { border: 1px solid rgba(239,68,68,0.3); color: #ef4444; } .board-del-btn:hover { background: #ef4444; color: #000; box-shadow: 0 0 15px rgba(239,68,68,0.4); }
        
        .modal-backdrop { position: fixed; inset: 0; z-index: 500; background: rgba(2,1,4,0.9); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.4s ease; backdrop-filter: blur(16px); }
        
        .primary-btn { background: #fff; color: #000; border: none; border-radius: 8px; padding: 14px 28px; cursor: pointer; font-weight: 700; font-size: 12px; width: 100%; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); text-transform: uppercase; letter-spacing: 2px; font-family: 'Syncopate', sans-serif; box-shadow: 0 10px 20px rgba(255,255,255,0.1); } .primary-btn:hover { background: #ccc; transform: translateY(-2px); box-shadow: 0 15px 30px rgba(255,255,255,0.2); } .primary-btn:active { transform: translateY(0); } .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .ghost-btn { border-radius: 8px; padding: 14px 28px; cursor: pointer; font-weight: 700; font-size: 12px; transition: all 0.3s; background: transparent; text-transform: uppercase; letter-spacing: 2px; color: #888; border: 1px solid rgba(255,255,255,0.1); font-family: 'Syncopate', sans-serif; } .ghost-btn:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: rgba(255,255,255,0.3); } 
        
        .field { width: 100%; padding: 14px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; outline: none; transition: all 0.3s ease; font-family: 'Inter', sans-serif; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); } .field:focus { border-color: #a855f7; background: rgba(168,85,247,0.05); box-shadow: 0 0 15px rgba(168,85,247,0.2), inset 0 2px 4px rgba(0,0,0,0.5); } .field::placeholder { color: rgba(255,255,255,0.2); }
        
        .spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite; margin: 0 auto; box-shadow: 0 0 15px rgba(168,85,247,0.5); } @keyframes spin { to { transform: rotate(360deg); } }
        .empty { text-align: center; padding: 120px 20px; color: #555; font-size: 18px; position: relative; z-index: 10; font-family: 'Syncopate', sans-serif; text-transform: uppercase; letter-spacing: 2px; } .modal-close { background: none; border: none; color: #666; cursor: pointer; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s; } .modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; transform: rotate(90deg); }
        
        .toast-container { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(2,1,4,0.95); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 16px 32px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; z-index: 9999; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(168,85,247,0.2); display: flex; align-items: center; justify-content: center; font-family: 'Syncopate', sans-serif; backdrop-filter: blur(20px); }
        .ai-global-loader { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 9999; width: 80px; height: 60px; border-radius: 16px; background: rgba(2,1,4,0.95); border: 1px solid rgba(168,85,247,0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.2); animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1), floatOrb 4s infinite ease-in-out; display: flex; align-items: center; justify-content: center; padding: 10px; backdrop-filter: blur(20px); }
        @keyframes floatOrb { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-10px); } }
      `}} />

      {/* SVG Filters for Plasma */}
      <svg style={{ width: 0, height: 0, position: 'absolute', zIndex: -1 }}>
          <defs>
              <filter id="fluid-warp" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves={3} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="50" xChannelSelector="R" yChannelSelector="G" />
              </filter>
          </defs>
      </svg>

      {/* Deep Space DSOTM + Volvelle LZ III + Currents Plasma Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020104]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,10,40,0.5)_0%,_rgba(2,1,4,1)_100%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] border-[1px] border-white/5 rounded-full opacity-30 animate-[volvelle-spin_120s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[900px] max-h-[900px] border-[1px] border-[#d4b896]/10 rounded-full opacity-20 animate-[volvelle-spin_90s_linear_infinite_reverse]" style={{ borderStyle: 'dotted' }}></div>
          
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#a855f7]/10 rounded-full blur-[120px] animate-[ooze_15s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#f97316]/10 rounded-full blur-[150px] animate-[ooze_12s_ease-in-out_infinite_reverse]"></div>
      </div>

      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {/* PREMIUM HEADER */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="hbtn" onClick={() => setShowMenu(true)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span className="logo" onClick={clearSearch}>GELBET</span>
          </div>
          
          <form className={`search-form ${isMobileSearchOpen ? 'mobile-active' : ''}`} onSubmit={handleSearch}>
            <div className="search-container" ref={searchContainerRef}>
              <div className={`search-wrap ${oracleMode ? 'oracle-active' : ''} prism-focus`} onClick={() => { if (!isMobileSearchOpen) { setIsMobileSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); } }}>
                
                <button type="button" className="oracle-toggle-inline" onClick={(e) => { e.stopPropagation(); setOracleMode(!oracleMode); }} title="Toggle Visual/Audio">
                    {!oracleMode ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13M9 9l12-2M5 21a3 3 0 100-6 3 3 0 000 6zM17 19a3 3 0 100-6 3 3 0 000 6z"/></svg>
                    )}
                </button>

                <input 
                  ref={searchInputRef} 
                  className="search-input" 
                  placeholder={oracleMode ? "AWAITING SONIC INPUT..." : "SYNTHESIZE VISUAL FREQUENCY..."} 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  onFocus={() => setIsSearchFocused(true)} 
                  style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}
                />
                
                {search && isMobileSearchOpen && <button type="button" onClick={() => { setSearch(""); setIsMobileSearchOpen(false); setIsSearchFocused(false); }} className="search-btn" style={{ fontSize: 16 }}>✕</button>}
                <button type="submit" className="search-btn">
                   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </button>
              </div>
              
              {isSearchFocused && !oracleMode && (
                <div className="search-dropdown">
                  {userTags.length > 0 && (<><div className="search-dropdown-header"><span>Recent Frequencies</span><button type="button" onClick={clearAllTags} className="search-dropdown-clear-all">Purge</button></div>{userTags.map(tag => (<div key={tag} className="search-dropdown-item" onClick={() => handleTagClick(tag)}><span className="search-dropdown-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span className="search-dropdown-text">{tag}</span><button type="button" className="search-dropdown-remove" onClick={(e) => removeUserTag(tag, e)}>✕</button></div>))} <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "8px 16px" }} /></>)}
                  <div className="search-dropdown-header"><span>Global Resonance</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 16px 16px" }}>{defaultTags.map(tag => (<button type="button" key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>))}</div>
                </div>
              )}
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hbtn" title="AI Vibe Assistant" onClick={() => setShowAIModal(true)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg></button>
            <button className={`hbtn ${showBoards ? "active" : ""}`} onClick={() => { setShowBoards(!showBoards); setShowSaved(false); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
            <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => { setShowSaved(!showSaved); setShowBoards(false); }}><svg width="19" height="19" viewBox="0 0 24 24" fill={showSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{pins.length > 0 && <span className="badge">{pins.length}</span>}</button>
            {user ? (<a href="/profile" style={{ marginLeft: 8 }}>{userAvatar ? <img src={userAvatar} className="avatar" alt="avatar" /> : <div className="avatar-placeholder">{(userName[0] || "U").toUpperCase()}</div>}</a>) : (<a href="/auth" className="sign-btn" style={{ marginLeft: 8 }}>Initialize</a>)}
            
            {/* KASHMIR CORE BLOB (LZ III + Currents) */}
            <div className="relative ml-2" ref={kashmirRef}>
                <div className="w-12 h-12 rounded-full border-[1px] border-white/20 p-0.5 relative hover:border-[#a855f7]/80 transition-all duration-500 cursor-pointer group shadow-[0_0_20px_rgba(0,0,0,0.8)]" onClick={(e) => { e.stopPropagation(); setIsKashmirOpen(!isKashmirOpen); }}>
                    {/* LZ III Outer Ring */}
                    <div className="absolute -inset-1 border-[1px] border-white/30 rounded-full opacity-0 group-hover:opacity-100 animate-[volvelle-spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                    
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-[#020104] flex items-center justify-center">
                        <div className="absolute inset-0 opacity-90 mix-blend-screen scale-125 filter blur-[4px]">
                            <div className="absolute w-[80%] h-[80%] -top-[10%] left-0 rounded-full" style={{ backgroundColor: activePersona.colors[0], animation: 'ooze 8s infinite alternate ease-in-out' }}></div>
                            <div className="absolute w-[70%] h-[70%] -bottom-[10%] right-0 rounded-full" style={{ backgroundColor: activePersona.colors[1], animation: 'ooze 6s infinite alternate-reverse ease-in-out' }}></div>
                            <div className="absolute w-[60%] h-[60%] top-[20%] left-[20%] rounded-full opacity-90" style={{ backgroundColor: activePersona.colors[2], animation: 'ooze 10s infinite alternate ease-in-out' }}></div>
                        </div>
                        <div className="absolute inset-0 opacity-50 mix-blend-screen force-fluid-filter" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 1px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)', animation: 'flow-lines 8s linear infinite' }}></div>
                        <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)] rounded-full"></div>
                    </div>
                </div>

                {isKashmirOpen && (
                    <div className="absolute right-0 mt-6 w-72 bg-[#050308]/95 border border-white/10 rounded-2xl p-2 shadow-[0_30px_60px_rgba(0,0,0,0.9),_0_0_30px_rgba(168,85,247,0.15)] z-50 backdrop-blur-2xl">
                        <div className="text-[10px] font-syncopate tracking-[0.3em] text-[#888] p-5 text-center border-b border-white/5 mb-2">KASHMIR CORE</div>
                        <div className="max-h-[400px] overflow-y-auto kashmir-scroll py-2 px-1">
                            {personas.map(p => (
                                <div key={p.id} className="flex items-center gap-5 p-3 hover:bg-white/5 rounded-xl transition-all duration-300 cursor-pointer group" onClick={() => { setActivePersona(p); setIsKashmirOpen(false); }}>
                                    <div className="w-2.5 h-2.5 rounded-full group-hover:shadow-[0_0_15px_currentColor] transition-all shrink-0" style={{ backgroundColor: p.hex }}></div>
                                    <div>
                                        <div className="text-sm text-[#eee] font-syncopate font-bold tracking-wide leading-tight group-hover:text-white transition-colors">{p.name}</div>
                                        <div className="text-[10px] text-[#888] font-inter italic mt-1 group-hover:text-[#aaa] transition-colors">{p.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        <div className={`oracle-stage-wrapper ${oracleMode ? 'open' : ''}`}>
          <div className="oracle-meta-header">
            <div className={`oracle-meta-title ${!oracleData.isIdle ? 'active' : ''}`}>
               <span className={`pulse-dot ${!oracleData.isIdle ? 'active' : ''} ${oracleData.isErratic && !oracleData.isIdle ? 'erratic' : ''}`}></span> 
               <span>{!oracleData.isIdle ? 'SIGNAL DETECTED' : 'ORACLE IDLE'}</span>
            </div>
            <div className={`oracle-track-name ${!oracleData.isIdle ? 'active' : ''}`}>
              {oracleData.trackName}
            </div>
          </div>
          
          <SonicOracleVisualizer 
            bpmSpeed={oracleData.bpmSpeed} 
            amplitude={oracleData.amplitude} 
            isErratic={oracleData.isErratic} 
            isIdle={oracleData.isIdle} 
          />
        </div>

        {(showSaved || showBoards) && (<div style={{ padding: "16px 32px", fontSize: 11, color: "#888", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 10, fontFamily: 'Syncopate', letterSpacing: '2px', textTransform: 'uppercase' }}>{showSaved && <span>Saved Collection (<span style={{ color: "#fff" }}>{pins.length}</span>)</span>}{showBoards && <span>My Archives (<span style={{ color: "#fff" }}>{boards.length}</span>)</span>}</div>)}

        {showBoards && (
          <div className="boards-grid" style={{ paddingTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gridColumn: "1 / -1" }}><h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Syncopate, sans-serif", letterSpacing: '4px' }}>MY ARCHIVES</h2><button className="primary-btn" style={{ width: "auto", padding: "10px 20px", fontSize: 10 }} onClick={() => setShowNewBoard(true)}>+ ESTABLISH NEW</button></div>
            {boards.length === 0 ? <div className="empty" style={{ gridColumn: "1 / -1" }}>No archives yet. Create your first collection.</div> : (boards.map(board => (<div key={board.id} className="board-card"><div className="board-cover"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div><div className="board-info"><div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: 'Syncopate', letterSpacing: '1px', textTransform: 'uppercase' }}>{board.name}</div>{board.description && <div style={{ fontSize: 12, color: "#888", marginTop: 8, lineHeight: 1.5 }}>{board.description}</div>}<div style={{ fontSize: 10, color: "#a855f7", marginTop: 12, fontWeight: 700, letterSpacing: '1px' }}>{pins.filter(p => p.board_id === board.id).length} ARTIFACTS</div><div className="board-actions"><button className="board-edit-btn" onClick={() => setEditBoard(board)}>Edit</button><button className="board-del-btn" onClick={() => deleteBoard(board.id)}>Purge</button></div></div></div>)))}
          </div>
        )}

        {!showBoards && (
          <><div className="grid-wrap"><div className="masonry">{displayPhotos.map((photo, i) => (<div key={`${photo.id}-${i}`} className="mb-4 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}><PinCard photo={photo} nsfwAllowed={nsfwAllowed} isPinned={isPinned(photo)} showSaved={showSaved} onClick={() => { feedLocalAI(photo.src, photo.id); const isBlurred = photo.isNsfw && !nsfwAllowed; if (isBlurred) setShowAgeGate(true); else router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`); }} onSaveClick={(e: any) => { e.stopPropagation(); if (!isPinned(photo)) savePin(photo); }} onShareClick={(e: any) => { e.stopPropagation(); sharePhoto(photo); }} onRemoveClick={(e: any) => { e.stopPropagation(); deletePin(photo.id); }} /></div>))}</div></div>{displayPhotos.length === 0 && !loading && <div className="empty">{showSaved ? "Archive is empty." : "Frequency not found."}</div>}{!showSaved && <div ref={bottomRef} style={{ padding: "60px", textAlign: "center", position: "relative", zIndex: 10 }}>{loading && <div className="spinner" />}</div>}</>
        )}

        {showMenu && (<><div className="burger-overlay" onClick={closeAllPanels} /><div className="burger-panel"><div className="burger-header"><span className="burger-logo">GELBET</span><button className="burger-close" onClick={closeAllPanels}>✕</button></div>{user && (<div style={{ padding: "32px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 16 }}>{userAvatar ? <img src={userAvatar} className="avatar" style={{ width: 56, height: 56 }} alt="" /> : <div className="avatar-placeholder" style={{ width: 56, height: 56, fontSize: 20 }}>{(userName[0] || "U").toUpperCase()}</div>}<div><div style={{ fontWeight: 700, fontSize: 16, color: "#fff", fontFamily: 'Syncopate', letterSpacing: '1px', textTransform: 'uppercase' }}>{userName}</div><a href="/profile" style={{ color: "#a855f7", fontSize: 11, textDecoration: "none", marginTop: 6, display: "inline-block", fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Configure Identity</a></div></div>)}<div style={{ padding: "0 24px", fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 3, marginTop: 32, marginBottom: 20, fontFamily: 'Syncopate', fontWeight: "bold" }}>Global Resonance</div><div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "0 24px 32px" }}>{defaultTags.map(tag => <button key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>)}</div><div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" }} /><div style={{ padding: "16px 0" }}><button className="burger-action" onClick={() => { setShowBoards(true); setShowMenu(false); }}><span className="burger-action-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span><span>My Archives</span></button><button className="burger-action" onClick={() => { setShowSaved(true); setShowMenu(false); }}><span className="burger-action-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span><span>Saved Artifacts</span></button></div></div></>)}

        {showNewBoard && (
          <div className="modal-backdrop" style={{ zIndex: 600 }} onClick={() => setShowNewBoard(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "rgba(2,1,4,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 40, maxWidth: 460, width: "100%", display: "flex", flexDirection: "column", gap: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.1)", backdropFilter: "blur(20px)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Syncopate, sans-serif", letterSpacing: 3 }}>ESTABLISH ARCHIVE</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <input className="field" placeholder="Archive Designation" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus />
                  <textarea className="field" placeholder="Context / Vibe (optional)" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} style={{ height: 100, resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setShowNewBoard(false)}>ABORT</button>
                <button className="primary-btn" style={{ flex: 1.5, opacity: !newBoardName.trim() ? 0.4 : 1 }} disabled={!newBoardName.trim()} onClick={createBoard}>INITIALIZE</button>
              </div>
            </div>
          </div>
        )}

        {showAIModal && (<div className="modal-backdrop" onClick={() => setShowAIModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: "rgba(2,1,4,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 40, maxWidth: 500, width: "100%", display: "flex", flexDirection: "column", gap: 24, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 30px 60px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.1)", backdropFilter: "blur(20px)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 16, fontWeight: 700, color: "#a855f7", fontFamily: "Syncopate, sans-serif", letterSpacing: 3 }}>AI VIBE ASSISTANT</h2><button className="modal-close" onClick={() => setShowAIModal(false)}>✕</button></div><textarea className="field" placeholder="Describe a specific mood, esoteric concept, or aesthetic..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} style={{ height: 120, resize: "none", fontSize: 16 }} /><div style={{ display: "flex", gap: 16, marginTop: 10 }}><button className="ghost-btn" style={{ flex: 1 }} onClick={() => setShowAIModal(false)}>ABORT</button><button className="primary-btn" style={{ flex: 1.5, opacity: !aiPrompt.trim() ? 0.4 : 1 }} onClick={handleAIGenerate}>SYNTHESIZE</button></div></div></div>)}

        {showAgeGate && (
          <div className="modal-backdrop" style={{ zIndex: 99999 }} onClick={() => setShowAgeGate(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "rgba(2,1,4,0.95)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 24, padding: "48px 40px", maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 32, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 30px 60px rgba(0,0,0,0.9), 0 0 40px rgba(239,68,68,0.1)", backdropFilter: "blur(20px)" }}>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ef4444", fontFamily: "Syncopate, sans-serif", letterSpacing: 6, margin: "0 0 16px 0", textShadow: "0 0 20px rgba(239,68,68,0.5)" }}>RESTRICTED</h2>
                <p style={{ color: "#aaa", fontSize: 15, lineHeight: 1.6, margin: 0, fontFamily: 'Inter' }}>This sector contains sensitive visual material.<br/>Confirmation of maturity is required.</p>
              </div>
              <div style={{ display: "flex", gap: 16, width: "100%", marginTop: 10 }}>
                <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setShowAgeGate(false)}>WITHDRAW</button>
                <button className="primary-btn" style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", textShadow: "none" }} onClick={() => { setNsfwAllowed(true); localStorage.setItem("gelbet_nsfw_18plus", "true"); setShowAgeGate(false); showToast("Archive unlocked"); }}>PROCEED (18+)</button>
              </div>
            </div>
          </div>
        )}

        {showSaveToBoard && (<div className="modal-backdrop" onClick={() => setShowSaveToBoard(null)}><div onClick={e => e.stopPropagation()} style={{ background: "rgba(2,1,4,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 40, maxWidth: 460, width: "100%", display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 30px 60px rgba(0,0,0,0.9)", backdropFilter: "blur(20px)" }}><h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Syncopate, sans-serif", letterSpacing: 3, textAlign: 'center', marginBottom: 10 }}>STORE ARTIFACT</h2><button className="primary-btn" onClick={() => savePin(showSaveToBoard)}>SAVE DIRECTLY TO PROFILE</button><div style={{ textAlign: 'center', color: '#666', fontSize: 10, fontFamily: 'Syncopate', letterSpacing: 2 }}>— OR —</div><button className="ghost-btn" onClick={() => { setShowNewBoard(true); setShowSaveToBoard(null); }}>+ ESTABLISH NEW ARCHIVE</button></div></div>)}
        
        {isAILoading && <div className="ai-global-loader"><div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} /></div>}
        {toastMsg && <div className="toast-container">{toastMsg}</div>}
      </main>
    </>
  );
}
