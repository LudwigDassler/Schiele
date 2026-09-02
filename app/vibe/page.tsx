"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../../lib/nsfw";
import { getAnonId } from "../../lib/identity";
import AgeGateModal from "../../components/AgeGateModal";
import { useTasteProfile } from "../hooks/useTasteProfile";

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean; rank?: string };
type Pin = { id: string; image_url: string; title: string; source_url?: string };

function VibeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { feedLocalAI } = useTasteProfile();

  const src = searchParams.get("src");
  const fallbackTitle = searchParams.get("title") || "Aesthetic Artifact";
  const link = searchParams.get("link");

  const [user, setUser] = useState<User | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState<Photo | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);

  const [relatedPhotos, setRelatedPhotos] = useState<Photo[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedHasMore, setRelatedHasMore] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  
  const [isMutating, setIsMutating] = useState(false);
  const [displayVibe, setDisplayVibe] = useState("ANALYZING TENSOR...");

  // Комментарии теперь в модалке
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const topRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const currentQueryRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const lastAnalyzedSrcRef = useRef<string | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // 🔥 ЖЕСТКИЙ ФИКС СКРОЛЛА 🔥
  // Используем таймаут, чтобы React успел отрендерить DOM, прежде чем мы дернем скролл
  useEffect(() => {
    if (src && topRef.current) {
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 50);
    }
  }, [src]);

  useEffect(() => {
    try {
      const allowedNsfw = localStorage.getItem("gelbet_nsfw_18plus");
      if (allowedNsfw === "true") setNsfwAllowed(true);
    } catch (e) {}

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        setIdentity(data.session.user.id);
        fetch(`/api/pins?user_id=${data.session.user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setPins(d.pins || d.data || []); })
          .catch(() => {});
      } else {
        setIdentity(getAnonId());
      }
    });
  }, []);

  useEffect(() => {
    if (!src) return;
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('pin_id', src)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        if (data) setComments(data);
      } catch (e) {
        console.error("Failed to load tensor logs:", e);
      }
    };
    fetchComments();
  }, [src]);

  useEffect(() => {
    if (showCommentsModal && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, showCommentsModal]);

  const submitComment = async () => {
    if (!commentInput.trim() || !user || !src) {
      if (!user) showToast("Authentication required");
      return;
    }

    const newLog = { 
      user_id: user.id, 
      pin_id: src, 
      content: commentInput.trim(), 
      sender_name: user.user_metadata?.full_name || "USER_ANON" 
    };
    
    const optimisticLog = { ...newLog, id: Date.now().toString(), created_at: new Date().toISOString() };
    setComments(prev => [...prev, optimisticLog]);
    setCommentInput("");

    try {
      const { error } = await supabase.from('comments').insert([newLog]);
      if (error) { 
        setComments(prev => prev.filter(c => c.id !== optimisticLog.id)); 
        throw error; 
      }
    } catch (e) {
      console.error("Log sync failed:", e);
      showToast("Transmission failed");
    }
  };

  const fetchImages = useCallback(async (query: string, pageNum: number, reset: boolean) => {
    if (!query || !src) return;
    setRelatedLoading(true);
    if (reset) { 
      relatedAbortRef.current?.abort(); 
      relatedAbortRef.current = new AbortController(); 
    }

    try {
      const params = new URLSearchParams({ page: String(pageNum), query });
      const res = await fetch(`/api/search?${params}`, { signal: relatedAbortRef.current?.signal });
      const data = await res.json();
      
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || data.results || []);
      const isNsfwQuery = checkNsfw(query);

      const fetched = rawArray
        .map((p: any) => {
          const mappedSrc = p.src || p.image || p.image_url || p.url;
          return {
            ...p, id: p.id || mappedSrc, src: mappedSrc, thumb: p.thumb || p.thumbnail || p.image || mappedSrc,
            link: p.link || p.url || p.source_url || mappedSrc, isNsfw: isNsfwQuery || checkNsfw(p.title || ""), rank: Math.random() > 0.8 ? 'S' : 'A'
          };
        })
        .filter((p: any) => p.src && p.src.startsWith("http") && p.src !== src);

      setRelatedPhotos(prev => {
        const combined = reset ? fetched : [...prev, ...fetched];
        const map = new Map(); combined.forEach((p: any) => map.set(p.src, p));
        return Array.from(map.values());
      });
      setRelatedHasMore(fetched.length > 0);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("[FETCH IMAGES ERROR]", e);
    } finally {
      setRelatedLoading(false);
    }
  }, [src]);

  const handleMutate = useCallback(async (isInitial = false) => {
    if (isMutating || !src) return;
    setIsMutating(true);
    if (isInitial) { setDisplayVibe("ANALYZING..."); setRelatedLoading(true); }

    try {
      const res = await fetch("/api/mutate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: src, history: historyRef.current })
      });
      const data = await res.json();

      if (data.smartQuery && data.displayVibe) {
        setDisplayVibe(data.displayVibe);
        currentQueryRef.current = data.smartQuery;
        historyRef.current.push(data.displayVibe);
        setRelatedPhotos([]); setRelatedPage(1); setRelatedHasMore(true);
        await fetchImages(data.smartQuery, 1, true);
      } else {
        throw new Error(data.error || "Invalid mutation response");
      }
    } catch (e) {
      console.error("[MUTATION FAILED]", e);
      if (isInitial) setDisplayVibe("RESONANCE LOST");
      showToast("Oracle iteration failed");
    } finally {
      setIsMutating(false);
    }
  }, [src, isMutating, fetchImages]);

  useEffect(() => {
    if (!src || lastAnalyzedSrcRef.current === src) return;
    lastAnalyzedSrcRef.current = src;
    currentQueryRef.current = ""; historyRef.current = [];
    setRelatedPhotos([]); setRelatedPage(1); setRelatedHasMore(true);
    handleMutate(true);
  }, [src, handleMutate]);

  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && relatedHasMore && !relatedLoading && currentQueryRef.current) {
        setRelatedPage(prev => { const next = prev + 1; fetchImages(currentQueryRef.current, next, false); return next; });
      }
    }, { threshold: 0.1 });
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [relatedHasMore, relatedLoading, fetchImages]);

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

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

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) { navigator.share({ title: displayVibe, url }); } 
    else { navigator.clipboard.writeText(url); showToast("Coordinates copied"); }
  }

  function openPhoto(photo: Photo) {
    feedLocalAI(photo.src, photo.id);
    const isBlurred = photo.isNsfw && !nsfwAllowed;
    if (isBlurred) { setShowAgeGate(photo); return; }
    router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
  }

  const currentPhoto: Photo = { id: src || "", src: src || "", thumb: src || "", title: fallbackTitle, link: link || "" };

  if (!src) return <div className="min-h-screen bg-[#020104] flex items-center justify-center text-white font-mono text-sm tracking-widest">ARTIFACT NOT FOUND</div>;

  return (
    <div className="min-h-screen bg-[#020104] text-white overflow-x-hidden overflow-y-auto flex flex-col relative font-sans">
      {/* Скрытый якорь для точного скролла */}
      <div ref={topRef} className="absolute top-0 left-0 w-full h-1" />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
        .font-mono { font-family: 'Space Mono', monospace; }
        .font-sync { font-family: 'Syncopate', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #020104; } 
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; } 
        ::-webkit-scrollbar-thumb:hover { background: #888; }

        .glass-panel { 
            background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .btn-elegant { 
            background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; 
            font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 500;
            text-transform: uppercase; letter-spacing: 2px; padding: 8px 16px; 
            cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 99px; 
        }
        .btn-elegant:hover:not(:disabled) { background: #fff; color: #000; box-shadow: 0 0 15px rgba(255,255,255,0.2); }
        .btn-elegant:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-mutate {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2);
            color: white; padding: 10px 24px; border-radius: 99px;
            font-family: 'Syncopate', sans-serif; font-size: 10px; font-weight: 700;
            letter-spacing: 3px; text-transform: uppercase; transition: all 0.4s ease;
        }
        .btn-mutate:hover:not(:disabled) { background: white; color: black; box-shadow: 0 0 15px rgba(255,255,255,0.4); transform: scale(1.02); }
        .btn-mutate:disabled { opacity: 0.5; cursor: not-allowed; }

        .toast-popup { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); padding: 12px 24px; border-radius: 99px; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #000; z-index: 9999; animation: floatUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        @keyframes floatUp { from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }

        .v-masonry { column-count: 2; column-gap: 16px; }
        @media (min-width: 768px) { .v-masonry { column-count: 3; column-gap: 20px; } }
        @media (min-width: 1024px) { .v-masonry { column-count: 4; } }
        @media (min-width: 1440px) { .v-masonry { column-count: 5; } }
        
        .pin-card { break-inside: avoid; margin-bottom: 16px; border-radius: 12px; overflow: hidden; position: relative; background: #08070a; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); transform: translateZ(0); }
        .pin-card img { width: 100%; display: block; filter: brightness(0.8); transition: filter 0.4s ease; }
        .pin-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.6); z-index: 10; }
        .pin-card:hover img { filter: brightness(1.05); }

        .pin-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%); opacity: 0; transition: opacity 0.4s ease; display: flex; flex-direction: column; justify-content: space-between; padding: 16px; pointer-events: none; }
        .pin-card:hover .pin-overlay { opacity: 1; pointer-events: auto; }
        
        .icon-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.3s; }
        .icon-btn:hover { background: #fff; color: #000; transform: scale(1.1); }
        .icon-btn svg { width: 14px; height: 14px; transition: fill 0.3s; }
      `}} />

      {/* Мягкий фоновый градиент */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      {/* HEADER */}
      <header className="w-full px-6 py-5 flex justify-between items-center fixed top-0 z-50 bg-[#020104]/60 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => router.back()} className="font-inter font-medium text-[10px] text-neutral-400 hover:text-white uppercase tracking-[2px] flex items-center gap-2 transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span className="hidden md:inline">Return</span>
        </button>
        <div className="font-sync text-xs md:text-sm tracking-[0.3em] font-bold text-white uppercase opacity-90">
          Tensor <span className="text-neutral-500 font-normal">Manifold</span>
        </div>
        <button onClick={() => sharePhoto(currentPhoto)} className="font-inter font-medium text-[10px] text-neutral-400 hover:text-white uppercase tracking-[2px] transition-colors">
          Share
        </button>
      </header>

      {/* MAIN VIEW: Огромная картинка по центру */}
      <div className="w-full max-w-6xl mx-auto mt-24 px-4 flex flex-col items-center z-10 relative">
        
        {/* ИЗОБРАЖЕНИЕ (Жесткий контейнер) */}
        <div className="w-full flex justify-center items-center mb-6 relative group min-h-[50vh] md:min-h-[70vh]">
          <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"></div>
          <img 
            src={currentPhoto.src} 
            alt={currentPhoto.title} 
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative z-10"
            onError={(e) => {
              if (!e.currentTarget.src.includes('placehold.co')) {
                e.currentTarget.src = 'https://placehold.co/800x600/111/444?text=ARTIFACT+LOST';
              }
            }}
          />
        </div>

        {/* КОНТРОЛЬНАЯ ПАНЕЛЬ (Миниатюрная) */}
        <div className="w-full max-w-3xl mx-auto glass-panel p-4 md:px-8 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
            <span className="font-sync text-sm md:text-lg text-white tracking-[2px] uppercase drop-shadow-md line-clamp-1">
              {displayVibe}
            </span>
          </div>

          <div className="flex-shrink-0 my-2 md:my-0">
            <button 
              onClick={() => handleMutate(false)}
              disabled={isMutating}
              className="btn-mutate"
            >
              {isMutating ? "Calc..." : "Mutate"}
            </button>
          </div>

          <div className="flex gap-2 justify-center md:justify-end flex-1">
            <button onClick={() => setShowCommentsModal(true)} className="btn-elegant border-neutral-700 text-neutral-300">
              Logs ({comments.length})
            </button>
            <button className={`btn-elegant ${isPinned(currentPhoto) ? 'bg-white text-black' : ''}`} onClick={() => toggleSavePin(currentPhoto)}>
              {isPinned(currentPhoto) ? "Unlink" : "Store"}
            </button>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="btn-elegant border-neutral-700 text-neutral-500 hover:border-white hover:text-black flex items-center justify-center">
                Source
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ВЫДАЧА (Производные векторы) */}
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-10 relative z-10 mt-4">
        <div className="flex items-center justify-center gap-6 mb-10 relative">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10"></div>
          <span className="text-[10px] md:text-[11px] font-sync font-bold tracking-[0.3em] text-neutral-500 uppercase">
             Derived Resonance
          </span>
          <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10"></div>
        </div>

        <div className="v-masonry">
          {relatedPhotos.map((photo, i) => {
             return (
              <div key={`${photo.id}-${i}`} className="pin-card" onClick={() => openPhoto(photo)}>
                <img src={photo.thumb || photo.src} alt="Derivative" loading="lazy" />
                <div className="pin-overlay">
                  <div className="flex justify-end w-full">
                    <button 
                      className={`btn-elegant !text-[8px] !px-4 !py-1.5 ${isPinned(photo) ? 'bg-white text-black' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); toggleSavePin(photo); }}
                    >
                      {isPinned(photo) ? 'Unlink' : 'Save'}
                    </button>
                  </div>
                  <div className="flex justify-end items-end w-full mt-auto">
                    <div className="flex gap-2">
                      <button className="icon-btn" title="Share" onClick={(e) => { e.stopPropagation(); sharePhoto(photo); }}>
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {relatedPhotos.length === 0 && !relatedLoading && !isMutating && (
          <div className="text-center py-20 text-neutral-600 font-sync tracking-[0.3em] uppercase text-xs font-bold">
            NO RESONANCE FOUND.
          </div>
        )}
        
        <div ref={bottomRef}>
          {relatedLoading && (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(168,85,247,0.4)]"></div>
            </div>
          )}
        </div>
      </div>

      {toastMsg && <div className="toast-popup">{toastMsg}</div>}

      {showAgeGate && (
        <AgeGateModal 
          onConfirm={() => { 
            setNsfwAllowed(true); 
            try { localStorage.setItem("gelbet_nsfw_18plus", "true"); } catch (e) {} 
            const p = showAgeGate; 
            setShowAgeGate(null); 
            if (p) openPhoto(p); 
          }} 
          onCancel={() => setShowAgeGate(null)} 
        />
      )}

      {/* ========================================== */}
      {/* МОДАЛКА КОММЕНТАРИЕВ (Изящная) */}
      {/* ========================================== */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={() => setShowCommentsModal(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-panel w-full max-w-xl flex flex-col overflow-hidden shadow-2xl">
            
            <div className="border-b border-white/5 px-6 py-4 flex justify-between items-center bg-white/5">
              <div className="font-inter font-semibold text-[10px] text-neutral-400 uppercase tracking-[3px]">
                Resonance Annotations
              </div>
              <button onClick={() => setShowCommentsModal(false)} className="text-neutral-500 hover:text-white font-mono text-xs transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 max-h-[50vh] scroll-smooth">
               {comments.length === 0 && (
                 <div className="text-center text-neutral-600 font-inter text-[10px] py-10 uppercase tracking-widest">No annotations yet.</div>
               )}
               {comments.map((c, idx) => (
                 <div key={idx} className="flex flex-col gap-1 mt-1">
                   <div className="flex items-end gap-3">
                     <span className="text-neutral-400 font-inter text-[9px] uppercase tracking-widest font-medium">{c.sender_name}</span>
                   </div>
                   <div className="text-neutral-200 font-inter text-[11px] font-light leading-relaxed bg-white/5 px-4 py-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-white/5 inline-block self-start max-w-[85%] shadow-sm">
                     {c.content}
                   </div>
                 </div>
               ))}
               <div ref={commentsEndRef} />
            </div>
            
            <div className="border-t border-white/5 flex bg-black/40 p-3">
               <input 
                 type="text" 
                 value={commentInput}
                 onChange={(e) => setCommentInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                 className="w-full bg-transparent border-none text-white font-inter font-light text-[11px] px-4 py-2 outline-none focus:ring-0 placeholder-neutral-600" 
                 placeholder="Add an annotation..." 
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
    </div>
  );
}

export default function VibePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020104]"></div>}>
      <VibeContent />
    </Suspense>
  );
}
