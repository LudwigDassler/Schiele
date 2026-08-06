"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../lib/nsfw";
import PinCard from "../components/PinCard";
import { useTasteProfile } from "./hooks/useTasteProfile";

const defaultTags = ["Aesthetic", "Dark Academia", "Cyberpunk", "Minimalism", "Architecture", "Street Photography", "Vintage", "Interior"];

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean };
type Board = { id: string; name: string; description?: string };
type Pin = { id: string; image_url: string; title: string; board_id?: string; source_url?: string };

export default function Home() {
  const { feedLocalAI } = useTasteProfile();
  
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("Aesthetic");
  const [userTags, setUserTags] = useState<string[]>([]);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
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

  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const modalBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const currentRelatedQueryRef = useRef("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        if (!search) setIsMobileSearchOpen(false);
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
            if (data.session?.user) fetchUserData(data.session.user.id); 
        }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
        if(mounted) {
            setUser(session?.user ?? null); 
            if (session?.user) fetchUserData(session.user.id); 
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

        // Читаем ?q=&mode=&userId=, которые пишет KashmirDevMenu при переключении юзера
        const urlParams = new URLSearchParams(window.location.search);
        const qFromUrl = urlParams.get("q");
        const modeFromUrl = urlParams.get("mode");
        const userIdFromUrl = urlParams.get("userId");
        if (qFromUrl) initialQuery = qFromUrl;
        if (modeFromUrl) urlMode = modeFromUrl;
        if (userIdFromUrl) urlUserId = userIdFromUrl;
        setActiveMode(urlMode);
        setActiveUserId(urlUserId);
    } catch (e) {}

    if(mounted) {
        setSearchQuery(initialQuery);
        // setSearch(initialQuery); // Вырезано
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

  const fetchPhotos = useCallback(async (query: string, pageNum: number, reset: boolean, modeOverride?: string, userIdOverride?: string | null) => {
    if (!reset && loadingRef.current) return;
    loadingRef.current = true; setLoading(true);
    if (reset) { if (abortControllerRef.current) abortControllerRef.current.abort(); abortControllerRef.current = new AbortController(); }
    try {
      const effectiveMode = modeOverride ?? activeMode;
      const effectiveUserId = userIdOverride !== undefined ? userIdOverride : activeUserId;
      const params = new URLSearchParams({ page: String(pageNum) });
      if (query) params.set("query", query);
      if (effectiveMode) params.set("mode", effectiveMode);
      if (effectiveUserId) params.set("userId", effectiveUserId);
      const res = await fetch(`/api/search?${params}`, { signal: abortControllerRef.current?.signal });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || []);
      const isNsfwQuery = checkNsfw(query);
      const fetched = rawArray.filter((p: any) => p.src && p.src.startsWith("http")).map((p: any) => ({ ...p, isNsfw: isNsfwQuery || checkNsfw(p.title || "") }));
      setPhotos(prev => { const combined = reset ? fetched : [...prev, ...fetched]; const map = new Map(); combined.forEach(p => map.set(p.id, p)); return Array.from(map.values()); });
      setHasMore(fetched.length > 0);
    } catch (e: any) { } finally { if (!(reset && abortControllerRef.current?.signal.aborted)) { setLoading(false); loadingRef.current = false; } }
  }, [activeMode, activeUserId]);

  const fetchRelatedPhotos = useCallback(async (basePhoto: Photo, pageNum: number, reset: boolean) => {
    setRelatedLoading(true);
    if (reset) { 
      if (relatedAbortRef.current) relatedAbortRef.current.abort(); 
      relatedAbortRef.current = new AbortController(); 
      currentRelatedQueryRef.current = ""; 
      setActiveVibe("Scanning...");
    }
    
    try {
      let aiQuery = currentRelatedQueryRef.current;
      
      if (reset && !aiQuery) {
        try {
          const aiRes = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze_image", payload: basePhoto.src }) });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (aiData.result) aiQuery = aiData.result;
          }
        } catch (err) { console.error("Vision failed", err); }

        if (!aiQuery || aiQuery.length < 3) {
           const stopWords = new Set(["photo", "image", "picture", "wallpaper", "background", "free", "download", "high", "resolution", "by", "of", "the", "in", "on", "a", "and", "is", "with", "for", "hd", "4k", "stock", "quality"]);
           const rawWords = (basePhoto.title || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/g, "").split(/\s+/);
           const keywords = Array.from(new Set(rawWords.filter(w => w.length > 2 && !stopWords.has(w)))).slice(0, 3);
           aiQuery = keywords.length > 0 ? keywords.join(" ") : searchQuery.split(/\s+/)[0];
        }
        
        aiQuery = aiQuery.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        currentRelatedQueryRef.current = aiQuery;
        setActiveVibe(aiQuery);
      }

      const params = new URLSearchParams({ page: String(pageNum), query: aiQuery });
      const res = await fetch(`/api/search?${params}`, { signal: relatedAbortRef.current?.signal });
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || []);
      const isNsfwQuery = checkNsfw(aiQuery);
      const fetched = rawArray.filter((p: any) => p.src && p.src.startsWith("http") && p.src !== basePhoto.src && p.id !== basePhoto.id).map((p: any) => ({ ...p, isNsfw: isNsfwQuery || checkNsfw(p.title || "") }));

      setRelatedPhotos(prev => { const combined = reset ? fetched : [...prev, ...fetched]; const map = new Map(); combined.forEach(p => map.set(p.src, p)); return Array.from(map.values()); });
      setRelatedHasMore(fetched.length > 0);
    } catch (e: any) { } finally { setRelatedLoading(false); }
  }, [searchQuery]);

  useEffect(() => {
    if (!bottomRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loadingRef.current) { const next = page + 1; setPage(next); fetchPhotos(searchQuery, next, false); } }, { threshold: 0.1 });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, page, searchQuery, fetchPhotos]);

  useEffect(() => { if (!selected) return; setRelatedPhotos([]); setRelatedPage(1); setRelatedHasMore(true); fetchRelatedPhotos(selected, 1, true); }, [selected?.id, fetchRelatedPhotos]);

  useEffect(() => {
    if (!selected || !modalBottomRef.current) return;
    const observer = new IntersectionObserver(entries => { 
      if (entries[0].isIntersecting && relatedHasMore && !relatedLoading && currentRelatedQueryRef.current) { 
        const next = relatedPage + 1; 
        setRelatedPage(next); 
        fetchRelatedPhotos(selected, next, false); 
      } 
    }, { threshold: 0.1 });
    observer.observe(modalBottomRef.current);
    return () => observer.disconnect();
  }, [selected, relatedHasMore, relatedLoading, relatedPage, fetchRelatedPhotos]);

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3500); }
  function saveUserTag(tag: string) { const formattedTag = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1); setUserTags(prev => { const updated = [formattedTag, ...prev.filter(t => t.toLowerCase() !== formattedTag.toLowerCase())].slice(0, 8); localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); return updated; }); }
  function removeUserTag(tagToRemove: string, e?: React.MouseEvent) { if (e) e.stopPropagation(); setUserTags(prev => { const updated = prev.filter(t => t !== tagToRemove); localStorage.setItem("gelbet_user_tags", JSON.stringify(updated)); return updated; }); }
  function clearAllTags(e?: React.MouseEvent) { if (e) e.stopPropagation(); setUserTags([]); localStorage.removeItem("gelbet_user_tags"); }
  
  function handleSearch(e: React.FormEvent) { 
    e.preventDefault(); 
    if (!search.trim()) return; 
    const query = search.trim();
    setSearchQuery(query); saveUserTag(query); setIsMobileSearchOpen(false); setIsSearchFocused(false); closeAllPanels(); 
    setPage(1); setHasMore(true); setPhotos([]); fetchPhotos(query, 1, true);
  }
  function handleTagClick(tag: string) { 
    setSearch(tag); setSearchQuery(tag); saveUserTag(tag); setIsSearchFocused(false); setIsMobileSearchOpen(false); closeAllPanels(); 
    setPage(1); setHasMore(true); setPhotos([]); fetchPhotos(tag, 1, true);
  }
  function clearSearch() { 
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

  // КРАСОТА ЗДЕСЬ: Новый SVG-лоадер в стиле Tame Impala "Currents"
  const CurrentsLoader = () => (
    <div className="currents-wrapper">
      <svg viewBox="0 0 100 40" className="currents-svg">
        <path d="M 0 20 C 30 20, 35 4, 50 4 C 65 4, 70 20, 100 20" fill="none" stroke="#e3b378" strokeWidth="2" className="wave-path wave-top" />
        <path d="M 0 20 C 30 20, 35 36, 50 36 C 65 36, 70 20, 100 20" fill="none" stroke="#c0521a" strokeWidth="2" className="wave-path wave-bot" />
        <path d="M 0 20 L 30 20 M 70 20 L 100 20" fill="none" stroke="#e3b378" strokeWidth="1.5" opacity="0.3" />
        <circle cx="50" cy="20" r="4" fill="#c0521a" className="wave-core" />
      </svg>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { overflow-x: hidden; background: radial-gradient(circle at 50% 50%, #150f08 0%, #050403 100%); background-attachment: fixed; font-family: -apple-system, sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #0d0a06; } ::-webkit-scrollbar-thumb { background: #2a1f0e; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #c0521a; } * { scrollbar-width: thin; scrollbar-color: #2a1f0e #0d0a06; }
        .header { position: sticky; top: 0; z-index: 100; background: rgba(5, 4, 3, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #1a1208; padding: 10px 16px; display: flex; align-items: center; gap: 10px; }
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 700; color: #c0521a; letter-spacing: 4px; text-transform: uppercase; flex-shrink: 0; cursor: pointer; user-select: none; text-shadow: 0 0 20px rgba(192,82,26,0.2); }
        .search-form { flex: 1; display: flex; min-width: 0; justify-content: flex-end; } .search-container { position: relative; flex: 1; display: flex; justify-content: flex-end; min-width: 0; }
        .search-wrap { flex: 1; display: flex; background: #0d0a06; border-radius: 24px; overflow: hidden; border: 1px solid #1a1208; transition: all 0.2s; min-width: 0; } .search-wrap:focus-within { border-color: #4a3520; }
        .search-input { width: 100%; padding: 9px 14px; background: transparent; border: none; color: #d4b896; font-size: 14px; outline: none; } .search-input::placeholder { color: #4a3520; }
        .search-btn { width: 40px; height: 100%; padding: 0; background: transparent; border: none; color: #4a3520; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; } .search-btn:hover { color: #8a6a4a; }
        .search-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 100%; max-width: 440px; background: rgba(8,6,4,0.98); border: 1px solid #1a1208; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); backdrop-filter: blur(12px); z-index: 300; padding: 8px 0; animation: slideUp 0.2s ease; overflow: hidden; }
        .search-dropdown-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px; font-size: 10px; font-weight: 700; color: #4a3520; text-transform: uppercase; letter-spacing: 1.5px; }
        .search-dropdown-clear-all { background: none; border: none; color: #8a6a4a; cursor: pointer; font-size: 10px; font-weight: 700; text-transform: uppercase; transition: color 0.2s; } .search-dropdown-clear-all:hover { color: #e53e3e; }
        .search-dropdown-item { display: flex; align-items: center; padding: 10px 16px; cursor: pointer; transition: background 0.15s; gap: 12px; color: #d4b896; font-size: 14px; } .search-dropdown-item:hover { background: #1a1208; }
        .search-dropdown-icon { font-size: 14px; color: #4a3520; } .search-dropdown-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .search-dropdown-remove { background: none; border: none; color: #4a3520; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; } .search-dropdown-remove:hover { color: #e53e3e; background: rgba(229,62,62,0.1); }
        @media (max-width: 640px) { .search-form { flex: none; } .search-container { flex: none; } .search-wrap { width: 38px; height: 38px; flex: none; border-radius: 50%; background: transparent; border: none; cursor: pointer; } .search-input { display: none; } .search-btn { width: 38px; height: 38px; border-radius: 50%; pointer-events: none; } .search-form.mobile-active { position: absolute; left: 16px; right: 16px; top: 10px; z-index: 200; flex: 1; } .search-form.mobile-active .search-container { flex: 1; } .search-form.mobile-active .search-wrap { width: 100%; height: 42px; border-radius: 24px; background: #0d0a06; border: 1px solid #4a3520; flex: 1; display: flex; cursor: text; box-shadow: 0 10px 30px rgba(0,0,0,0.9); } .search-form.mobile-active .search-input { display: block; flex: 1; } .search-form.mobile-active .search-btn { border-radius: 0; width: 40px; pointer-events: auto; } .search-dropdown { max-width: 100%; } }
        .hbtn { background: transparent; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6a4a2a; flex-shrink: 0; transition: all 0.2s; position: relative; } .hbtn:hover { background: #1a1208; color: #d4b896; } .hbtn.active { background: #1a1208; color: #c0521a; }
        .badge { position: absolute; top: 2px; right: 2px; background: #c0521a; color: #0d0a06; border-radius: 10px; padding: 1px 5px; font-size: 9px; font-weight: 700; border: 2px solid #0d0a06; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #1a1208; flex-shrink: 0; object-fit: cover; } .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid #1a1208; flex-shrink: 0; background: #1a1208; display: flex; align-items: center; justify-content: center; color: #8a6a4a; font-size: 13px; font-weight: 700; }
        .sign-btn { background: transparent; color: #c0521a; border: 1px solid #c0521a; border-radius: 20px; padding: 6px 16px; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0; text-decoration: none; display: flex; align-items: center; }
        .tag-pill { background: #0d0a06; border: 1px solid #1a1208; color: #8a6a4a; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer; transition: all 0.2s; } .tag-pill:hover { background: #1a1208; color: #d4b896; border-color: #2a1f0e; } .tag-pill.active { background: #1a1208; color: #c0521a; border-color: #2a1f0e; }
        .burger-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.8); animation: fadeIn 0.2s ease; backdrop-filter: blur(5px); } .burger-panel { position: fixed; top: 0; left: 0; bottom: 0; width: min(300px, 85vw); z-index: 151; background: #080604; border-right: 1px solid #1a1208; display: flex; flex-direction: column; animation: slideRight 0.25s ease; overflow-y: auto; }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .burger-header { padding: 20px 20px 16px; border-bottom: 1px solid #1a1208; display: flex; align-items: center; justify-content: space-between; } .burger-logo { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #c0521a; } .burger-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #4a3520; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; } .burger-close:hover { color: #8a6a4a; background: #1a1208; } .burger-action { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; color: #8a6a4a; font-size: 13px; transition: all 0.15s; } .burger-action:hover { background: #1a1208; color: #d4b896; } .burger-action-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #1a1208; }
        .grid-wrap { padding: 16px; } .masonry { columns: 2; gap: 12px; } @media (min-width: 480px) { .masonry { columns: 3; } } @media (min-width: 768px) { .masonry { columns: 4; } } @media (min-width: 1024px) { .masonry { columns: 5; } } @media (min-width: 1280px) { .masonry { columns: 6; } }
        .boards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; } @media (min-width: 480px) { .boards-grid { grid-template-columns: repeat(3, 1fr); } } .board-card { border-radius: 12px; overflow: hidden; border: 1px solid #1a1208; background: #0d0a06; } .board-cover { height: 80px; background: linear-gradient(135deg, #1a1208, #050403); display: flex; align-items: center; justify-content: center; } .board-info { padding: 12px; } .board-actions { display: flex; gap: 8px; margin-top: 10px; } .board-edit-btn, .board-del-btn { flex: 1; padding: 6px; border-radius: 6px; font-size: 11px; cursor: pointer; background: transparent; } .board-edit-btn { border: 1px solid #2a1f0e; color: #8a6a4a; } .board-edit-btn:hover { border-color: #c0521a; color: #c0521a; } .board-del-btn { border: 1px solid #3a1a1a; color: #e53e3e; } .board-del-btn:hover { background: rgba(229,62,62,0.1); }
        .modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(5,4,3,0.9); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.4s ease; backdrop-filter: blur(10px); }
        .modal-box { background: #080604; border: 1px solid #1a1208; border-radius: 12px; width: 100%; max-width: 1000px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; scroll-behavior: smooth; animation: slideUp 0.3s ease; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
        .modal-top { display: flex; flex-direction: column; } @media (min-width: 768px) { .modal-top { flex-direction: row; } }
        .modal-img-wrap { flex: 1.5; background: #050403; display: flex; align-items: center; justify-content: center; padding: 20px; } .modal-img { width: 100%; max-height: 70vh; object-fit: contain; display: block; border-radius: 4px; }
        .modal-info { flex: 1; padding: 32px; display: flex; flex-direction: column; background: #0d0a06; } .modal-bottom { padding: 32px; border-top: 1px solid #1a1208; background: #080604; }
        .related-masonry { columns: 2; gap: 12px; } @media (min-width: 640px) { .related-masonry { columns: 3; } } @media (min-width: 1024px) { .related-masonry { columns: 4; } }
        .primary-btn { background: #1a1208; color: #d4b896; border: 1px solid #2a1f0e; border-radius: 4px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; } .primary-btn:hover { background: #2a1f0e; border-color: #4a3520; color: #fff; } .primary-btn.pinned-state { background: transparent; color: #c0521a; border: 1px solid #c0521a; }
        .ghost-btn, .outline-btn, .danger-btn { border-radius: 4px; padding: 12px 24px; cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.2s; background: transparent; text-transform: uppercase; letter-spacing: 1px; } .ghost-btn { color: #8a6a4a; border: 1px solid transparent; } .ghost-btn:hover { background: #1a1208; color: #d4b896; } .outline-btn { color: #8a6a4a; border: 1px solid #2a1f0e; width: 100%; } .outline-btn:hover { border-color: #c0521a; color: #c0521a; } .danger-btn { color: #e53e3e; border: 1px solid #e53e3e; width: 100%; } .danger-btn:hover { background: rgba(229,62,62,0.1); }
        .field { width: 100%; padding: 12px 16px; border-radius: 4px; border: 1px solid #1a1208; background: #0d0a06; color: #d4b896; font-size: 14px; outline: none; transition: border-color 0.2s; } .field:focus { border-color: #2a1f0e; }
        
        /* СТИЛИ ДЛЯ CURRENTS LOADER */
        .currents-wrapper { width: 44px; height: 26px; display: flex; align-items: center; justify-content: center; margin: 0 auto; position: relative; }
        .currents-svg { width: 100%; height: 100%; overflow: visible; }
        .wave-core { animation: pulseCore 1.5s infinite alternate; }
        .wave-path { stroke-dasharray: 105; stroke-dashoffset: 105; animation: flowWave 1.4s ease-in-out infinite; }
        .wave-bot { animation-delay: -0.7s; }
        
        @keyframes flowWave { 
            0% { stroke-dashoffset: 105; opacity: 0; } 
            20% { opacity: 1; } 80% { opacity: 1; } 
            100% { stroke-dashoffset: -105; opacity: 0; } 
        }
        @keyframes pulseCore { 
            0% { r: 3; fill: #c0521a; filter: drop-shadow(0 0 2px rgba(192,82,26,0.6)); } 
            100% { r: 4.5; fill: #e3b378; filter: drop-shadow(0 0 8px rgba(227,179,120,1)); } 
        }

        .spinner { width: 28px; height: 28px; border: 2px solid #1a1208; border-top-color: #8a6a4a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; } @keyframes spin { to { transform: rotate(360deg); } }
        
        .empty { text-align: center; padding: 100px 20px; color: #4a3520; font-size: 16px; font-family: 'Crimson Text', serif; font-style: italic; } .modal-close { background: none; border: none; color: #4a3520; cursor: pointer; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; } .modal-close:hover { background: #1a1208; color: #8a6a4a; }
        .toast-container { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #150f08; border: 1px solid #2a1f0e; color: #d4b896; padding: 14px 28px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 10px 40px rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
        
        .ai-global-loader { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; width: 56px; height: 40px; border-radius: 20px; background: #080604; border: 1px solid #2a1f0e; box-shadow: 0 10px 30px rgba(0,0,0,0.9), 0 0 20px rgba(192,82,26,0.1); animation: slideUp 0.3s ease, floatOrb 3s infinite ease-in-out; display: flex; align-items: center; justify-content: center; }
        @keyframes floatOrb { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-5px); } }
      `}} />

      <main style={{ minHeight: "100vh" }}>
        <header className="header">
          <button className="hbtn" onClick={() => setShowMenu(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          <span className="logo" onClick={clearSearch}>GELBET</span>
          <form className={`search-form ${isMobileSearchOpen ? 'mobile-active' : ''}`} onSubmit={handleSearch}>
            <div className="search-container" ref={searchContainerRef}>
              <div className="search-wrap" onClick={() => { if (!isMobileSearchOpen) { setIsMobileSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); } }}>
                <input ref={searchInputRef} className="search-input" placeholder="Search visual archives..." value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setIsSearchFocused(true)} />
                {search && isMobileSearchOpen && <button type="button" onClick={() => { setSearch(""); setIsMobileSearchOpen(false); setIsSearchFocused(false); }} className="search-btn" style={{ fontSize: 16 }}>✕</button>}
                <button type="submit" className="search-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
              </div>
              {isSearchFocused && (
                <div className="search-dropdown">
                  {userTags.length > 0 && (<><div className="search-dropdown-header"><span>Recent Searches</span><button type="button" onClick={clearAllTags} className="search-dropdown-clear-all">Clear All</button></div>{userTags.map(tag => (<div key={tag} className="search-dropdown-item" onClick={() => handleTagClick(tag)}><span className="search-dropdown-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span className="search-dropdown-text">{tag}</span><button type="button" className="search-dropdown-remove" onClick={(e) => removeUserTag(tag, e)}>✕</button></div>))} <div style={{ height: 1, background: "#1a1208", margin: "4px 16px 8px" }} /></>)}
                  <div className="search-dropdown-header"><span>Trending Vibes</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 16px 12px" }}>{defaultTags.map(tag => (<button type="button" key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>))}</div>
                </div>
              )}
            </div>
          </form>
          <button className="hbtn" title="AI Vibe Assistant" onClick={() => setShowAIModal(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg></button>
          <button className={`hbtn ${showBoards ? "active" : ""}`} onClick={() => { setShowBoards(!showBoards); setShowSaved(false); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
          <button className={`hbtn ${showSaved ? "active" : ""}`} onClick={() => { setShowSaved(!showSaved); setShowBoards(false); }}><svg width="17" height="17" viewBox="0 0 24 24" fill={showSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{pins.length > 0 && <span className="badge">{pins.length}</span>}</button>
          {user ? (<a href="/profile">{userAvatar ? <img src={userAvatar} className="avatar" alt="avatar" /> : <div className="avatar-placeholder">{(userName[0] || "U").toUpperCase()}</div>}</a>) : (<a href="/auth" className="sign-btn">Enter</a>)}
        </header>

        {(showSaved || showBoards) && (<div style={{ padding: "12px 20px", fontSize: 13, color: "#8a6a4a", borderBottom: "1px solid #1a1208", display: "flex", alignItems: "center", gap: 12 }}>{showSaved && <span>Saved Collection (<span style={{ color: "#d4b896" }}>{pins.length}</span>)</span>}{showBoards && <span>My Boards (<span style={{ color: "#d4b896" }}>{boards.length}</span>)</span>}</div>)}

        {showBoards && (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontSize: 16, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>MY BOARDS</h2><button className="primary-btn" style={{ width: "auto", padding: "8px 16px", fontSize: 11 }} onClick={() => setShowNewBoard(true)}>+ New Board</button></div>
            {boards.length === 0 ? <div className="empty">No boards yet. Create your first collection.</div> : (<div className="boards-grid">{boards.map(board => (<div key={board.id} className="board-card"><div className="board-cover"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a1f0e" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div><div className="board-info"><div style={{ fontSize: 14, fontWeight: 600, color: "#d4b896" }}>{board.name}</div>{board.description && <div style={{ fontSize: 12, color: "#4a3520", marginTop: 4, fontFamily: "'Crimson Text', serif", fontStyle: "italic" }}>{board.description}</div>}<div style={{ fontSize: 11, color: "#8a6a4a", marginTop: 8 }}>{pins.filter(p => p.board_id === board.id).length} pins</div><div className="board-actions"><button className="board-edit-btn" onClick={() => setEditBoard(board)}>Edit</button><button className="board-del-btn" onClick={() => deleteBoard(board.id)}>Delete</button></div></div></div>))}</div>)}
          </div>
        )}

        {!showBoards && (
          <><div className="grid-wrap"><div className="masonry">{displayPhotos.map((photo, i) => (<PinCard key={`${photo.id}-${i}`} photo={photo} nsfwAllowed={nsfwAllowed} isPinned={isPinned(photo)} showSaved={showSaved} onClick={() => { feedLocalAI(photo.src, photo.id); const isBlurred = photo.isNsfw && !nsfwAllowed; if (isBlurred) setShowAgeGate(true); else setSelected(photo); }} onSaveClick={(e: any) => { e.stopPropagation(); if (!isPinned(photo)) savePin(photo); }} onShareClick={(e: any) => { e.stopPropagation(); sharePhoto(photo); }} onRemoveClick={(e: any) => { e.stopPropagation(); deletePin(photo.id); }} />))}</div></div>{displayPhotos.length === 0 && !loading && <div className="empty">{showSaved ? "Archive is empty." : "Nothing found."}</div>}{!showSaved && <div ref={bottomRef} style={{ padding: "40px", textAlign: "center" }}>{loading && <div className="spinner" />}</div>}</>
        )}

        {showMenu && (<><div className="burger-overlay" onClick={closeAllPanels} /><div className="burger-panel"><div className="burger-header"><span className="burger-logo">GELBET</span><button className="burger-close" onClick={closeAllPanels}>✕</button></div>{user && (<div style={{ padding: "24px 16px", borderBottom: "1px solid #1a1208", display: "flex", alignItems: "center", gap: 14 }}>{userAvatar ? <img src={userAvatar} className="avatar" style={{ width: 44, height: 44 }} alt="" /> : <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: 16 }}>{(userName[0] || "U").toUpperCase()}</div>}<div><div style={{ fontWeight: 600, fontSize: 14, color: "#d4b896" }}>{userName}</div><a href="/profile" style={{ color: "#8a6a4a", fontSize: 12, textDecoration: "none", marginTop: 4, display: "block" }}>Edit profile</a></div></div>)}<div style={{ padding: "0 16px", fontSize: 10, color: "#4a3520", textTransform: "uppercase", letterSpacing: 2, marginTop: 24, marginBottom: 16 }}>Explore Archives</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 16px 20px" }}>{defaultTags.map(tag => <button key={tag} className="tag-pill" onClick={() => handleTagClick(tag)}>{tag}</button>)}</div><div style={{ height: 1, background: "#1a1208", margin: "10px 0" }} /><div style={{ padding: "10px 0" }}><button className="burger-action" onClick={() => { setShowBoards(true); setShowMenu(false); }}><span className="burger-action-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span><span>My Boards</span></button><button className="burger-action" onClick={() => { setShowSaved(true); setShowMenu(false); }}><span className="burger-action-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span><span>Saved Pins</span></button></div></div></>)}

        {showNewBoard && (
          <div className="modal-backdrop" style={{ zIndex: 300 }} onClick={() => setShowNewBoard(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#080604", border: "1px solid #1a1208", borderRadius: 8, padding: 32, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>CREATE NEW ARCHIVE</h2>
              <input className="field" placeholder="Board Name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} autoFocus />
              <textarea className="field" placeholder="Description (optional)" value={newBoardDesc} onChange={e => setNewBoardDesc(e.target.value)} style={{ height: 80, resize: "none" }} />
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button className="ghost-btn" onClick={() => setShowNewBoard(false)}>Cancel</button>
                <button className="primary-btn" style={{ flex: 1, opacity: !newBoardName.trim() ? 0.4 : 1 }} disabled={!newBoardName.trim()} onClick={createBoard}>Establish</button>
              </div>
            </div>
          </div>
        )}

        {showAIModal && (<div className="modal-backdrop" onClick={() => setShowAIModal(false)}><div onClick={e => e.stopPropagation()} style={{ background: "#080604", border: "1px solid #1a1208", borderRadius: 8, padding: 32, maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 16, animation: "slideUp 0.3s ease" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 14, fontWeight: 700, color: "#8a6a4a", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>AI VIBE ASSISTANT</h2><button className="modal-close" onClick={() => setShowAIModal(false)}>✕</button></div><textarea className="field" placeholder="Describe a specific mood or aesthetic..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} style={{ height: 100, resize: "none" }} /><div style={{ display: "flex", gap: 12, marginTop: 10 }}><button className="ghost-btn" onClick={() => setShowAIModal(false)}>Cancel</button><button className="primary-btn" style={{ flex: 1, opacity: !aiPrompt.trim() ? 0.4 : 1 }} onClick={handleAIGenerate}>Synthesize</button></div></div></div>)}

        {showAgeGate && (
          <div className="modal-backdrop" style={{ zIndex: 99999 }} onClick={() => setShowAgeGate(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#050403", border: "1px solid #1a1208", borderRadius: 4, padding: "40px", maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, animation: "slideUp 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.9)" }}>
              <CurrentsLoader />
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 4, margin: "0 0 12px 0" }}>RESTRICTED ARCHIVE</h2>
                <p style={{ color: "#8a6a4a", fontSize: 14, lineHeight: 1.6, fontFamily: "'Crimson Text', serif", fontStyle: "italic", margin: 0 }}>This sector contains sensitive visual material.<br/>Confirmation of maturity is required to proceed.</p>
              </div>
              <div style={{ display: "flex", gap: 16, width: "100%", marginTop: 10 }}>
                <button className="ghost-btn" style={{ flex: 1 }} onClick={() => setShowAgeGate(false)}>Withdraw</button>
                <button className="primary-btn" style={{ flex: 1, borderColor: "#c0521a", color: "#c0521a" }} onClick={() => { setNsfwAllowed(true); localStorage.setItem("gelbet_nsfw_18plus", "true"); setShowAgeGate(false); showToast("Archive unlocked"); }}>I am 18+</button>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-top">
                <div className="modal-img-wrap" style={{ position: "relative" }}>
                  {!mainImgLoaded && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <CurrentsLoader />
                    </div>
                  )}
                  <img src={selected.src} alt="" className="modal-img" onLoad={() => setMainImgLoaded(true)} style={{ opacity: mainImgLoaded ? 1 : 0, transition: "opacity 0.4s ease" }} />
                </div>
                <div className="modal-info"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}><button className="hbtn" style={{ background: "#1a1208" }} onClick={() => sharePhoto(selected)} title="Share"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button><button className="modal-close" onClick={() => setSelected(null)}>✕</button></div><div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}><button className={`primary-btn ${isPinned(selected) ? "pinned-state" : ""}`} onClick={() => isPinned(selected) ? null : savePin(selected)}>{isPinned(selected) ? "Saved" : "Save to Archive"}</button>{selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer"><button className="outline-btn">View Original ↗</button></a>}</div></div>
              </div>
              <div className="modal-bottom">
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "#8a6a4a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>Curated Matches</h3>
                
                {activeVibe && (
                   <div style={{ fontSize: 12, color: "#c0521a", marginBottom: 24, fontStyle: "italic", fontFamily: "'Crimson Text', serif", letterSpacing: 1 }}>
                     AI Search: {activeVibe.toLowerCase()}
                   </div>
                )}

                <div className="related-masonry">{relatedPhotos.map((photo, i) => (<PinCard key={`related-${photo.id}-${i}`} photo={photo} nsfwAllowed={nsfwAllowed} isPinned={isPinned(photo)} onClick={() => { feedLocalAI(photo.src, photo.id); const isBlurred = photo.isNsfw && !nsfwAllowed; if (isBlurred) setShowAgeGate(true); else { document.querySelector('.modal-box')?.scrollTo({top: 0, behavior: 'smooth'}); setSelected(photo); } }} onSaveClick={(e: any) => { e.stopPropagation(); if (!isPinned(photo)) savePin(photo); }} onShareClick={(e: any) => { e.stopPropagation(); sharePhoto(photo); }} />))}</div>
                <div ref={modalBottomRef} style={{ textAlign: "center" }}>
                  {relatedLoading && (
                    <div style={{ padding: "40px 0" }}>
                      <CurrentsLoader />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSaveToBoard && (<div className="modal-backdrop" onClick={() => setShowSaveToBoard(null)}><div onClick={e => e.stopPropagation()} style={{ background: "#080604", border: "1px solid #1a1208", borderRadius: 8, padding: 32, maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}><button className="primary-btn" onClick={() => savePin(showSaveToBoard)}>Save directly</button><button className="ghost-btn" onClick={() => { setShowNewBoard(true); setShowSaveToBoard(null); }}>+ Create new board</button></div></div>)}
        
        {isAILoading && <div className="ai-global-loader"><CurrentsLoader /></div>}
        {toastMsg && <div className="toast-container">{toastMsg}</div>}
      </main>
    </>
  );
}