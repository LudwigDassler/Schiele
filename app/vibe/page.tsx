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

  // Стейты выдачи
  const [relatedPhotos, setRelatedPhotos] = useState<Photo[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedHasMore, setRelatedHasMore] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  
  // Стейты Троицы (Оракул + Мутатор)
  const [isMutating, setIsMutating] = useState(false);
  const [displayVibe, setDisplayVibe] = useState("ANALYZING TENSOR...");

  // Стейты Comm-Link (Комментарии)
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Refs для предотвращения состояний гонки
  const currentQueryRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const lastAnalyzedSrcRef = useRef<string | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

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

  // ==========================================
  // СИНХРОНИЗАЦИЯ БАЗЫ ДАННЫХ КОММЕНТАРИЕВ
  // ==========================================
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
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

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

    // Оптимистичный UI
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

  // ==========================================
  // ВЫДАЧА (Парсер DDG + Гильотина)
  // ==========================================
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
            ...p,
            id: p.id || mappedSrc,
            src: mappedSrc,
            thumb: p.thumb || p.thumbnail || p.image || mappedSrc,
            link: p.link || p.url || p.source_url || mappedSrc,
            isNsfw: isNsfwQuery || checkNsfw(p.title || ""),
            rank: Math.random() > 0.8 ? 'S' : (Math.random() > 0.4 ? 'A' : 'B')
          };
        })
        .filter((p: any) => p.src && p.src.startsWith("http") && p.src !== src);

      setRelatedPhotos(prev => {
        const combined = reset ? fetched : [...prev, ...fetched];
        const map = new Map();
        combined.forEach((p: any) => map.set(p.src, p));
        return Array.from(map.values());
      });
      setRelatedHasMore(fetched.length > 0);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("[FETCH IMAGES ERROR]", e);
      }
    } finally {
      setRelatedLoading(false);
    }
  }, [src]);

  // ==========================================
  // АРХИТЕКТУРА ТРОИЦЫ (Мутатор + Оракул)
  // ==========================================
  const handleMutate = useCallback(async (isInitial = false) => {
    if (isMutating || !src) return;
    setIsMutating(true);

    if (isInitial) {
      setDisplayVibe("ANALYZING TENSOR...");
      setRelatedLoading(true);
    }

    try {
      const res = await fetch("/api/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: src,
          history: historyRef.current
        })
      });

      const data = await res.json();

      if (data.smartQuery && data.displayVibe) {
        setDisplayVibe(data.displayVibe);
        currentQueryRef.current = data.smartQuery;

        historyRef.current.push(data.displayVibe);

        setRelatedPhotos([]);
        setRelatedPage(1);
        setRelatedHasMore(true);
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

  // Автозапуск при смене картинки
  useEffect(() => {
    if (!src || lastAnalyzedSrcRef.current === src) return;
    lastAnalyzedSrcRef.current = src;
    currentQueryRef.current = "";
    historyRef.current = [];
    setRelatedPhotos([]);
    setRelatedPage(1);
    setRelatedHasMore(true);

    handleMutate(true);
  }, [src, handleMutate]);

  // INFINITE SCROLL OBSERVER
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && relatedHasMore && !relatedLoading && currentQueryRef.current) {
        setRelatedPage(prev => {
          const next = prev + 1;
          fetchImages(currentQueryRef.current, next, false);
          return next;
        });
      }
    }, { threshold: 0.1 });

    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [relatedHasMore, relatedLoading, fetchImages]);

  // ==========================================
  // SOCIALS
  // ==========================================
  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  async function toggleSavePin(photo: Photo) {
    if (!user) { router.push("/auth"); return; }
    
    const existingPin = pins.find(p => p.image_url === photo.src);
    if (existingPin) {
      setPins(prev => prev.filter(p => p.id !== existingPin.id)); 
      try { 
        await fetch(`/api/pins?id=${existingPin.id}`, { method: "DELETE" }); 
        showToast("Artifact removed");
      } catch (e) {}
    } else {
      try {
        const res = await fetch("/api/pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    if (navigator.share) navigator.share({ title: displayVibe, url });
    else {
      navigator.clipboard.writeText(url);
      showToast("Coordinates copied");
    }
  }

  function openPhoto(photo: Photo) {
    feedLocalAI(photo.src, photo.id);
    const isBlurred = photo.isNsfw && !nsfwAllowed;
    if (isBlurred) { setShowAgeGate(photo); return; }
    router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
  }

  const currentPhoto: Photo = { id: src || "", src: src || "", thumb: src || "", title: fallbackTitle, link: link || "" };
  const vectorId = btoa((src || "V").substring(0, 15)).substring(0, 6).toUpperCase();

  if (!src) return <div style={{ color: "#fff", padding: 40, textAlign: "center", background: "#020104", minHeight: "100vh", fontFamily: 'Space Mono' }}>ARTIFACT NOT FOUND.</div>;

  return (
    <div className="min-h-screen bg-[#020104] text-white font-sans overflow-x-hidden overflow-y-auto flex flex-col relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
        .font-mono { font-family: 'Space Mono', monospace; }
        
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #020104; } 
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; } 
        ::-webkit-scrollbar-thumb:hover { background: #666; }

        .math-border { border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; }
        .grid-bg { background-image: linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 30px 30px; }
        
        .btn-strict { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; font-family: 'Space Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; padding: 8px 16px; cursor: pointer; transition: all 0.2s; border-radius: 2px; }
        .btn-strict:hover:not(:disabled) { background: #fff; color: #000; }
        .btn-strict:disabled { opacity: 0.5; cursor: not-allowed; }

        .toast-popup { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); padding: 10px 20px; border-radius: 2px; font-family: 'Space Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #000; z-index: 9999; animation: floatUp 0.3s ease-out; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        @keyframes floatUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }

        /* Стерильная сетка (как на главной) */
        .v-masonry { column-count: 2; column-gap: 12px; }
        @media (min-width: 768px) { .v-masonry { column-count: 3; column-gap: 16px; } }
        @media (min-width: 1024px) { .v-masonry { column-count: 4; } }
        @media (min-width: 1440px) { .v-masonry { column-count: 5; } }
        
        .pin-card { break-inside: avoid; margin-bottom: 12px; border-radius: 2px; overflow: hidden; position: relative; background: #08070a; cursor: pointer; border: 1px solid transparent; transition: all 0.3s; }
        @media (min-width: 768px) { .pin-card { margin-bottom: 16px; } }
        .pin-card img { width: 100%; display: block; transition: all 0.4s ease; filter: brightness(0.7); }
        .pin-card:hover { border-color: rgba(255,255,255,0.1); transform: scale(1.01); z-index: 10; }
        .pin-card:hover img { filter: brightness(1); }

        .pin-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%); opacity: 0; transition: opacity 0.3s; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; pointer-events: none; }
        .pin-card:hover .pin-overlay { opacity: 1; pointer-events: auto; }
        
        .icon-btn { width: 28px; height: 28px; border-radius: 2px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.2s; }
        .icon-btn:hover { background: #fff; color: #000; }
        .icon-btn svg { width: 12px; height: 12px; transition: fill 0.3s; }
      `}} />

      {/* HEADER */}
      <header className="w-full px-6 py-4 flex justify-between items-center fixed top-0 z-50 bg-[#020104]/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => router.back()} className="font-mono text-[9px] md:text-[10px] text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
          <span>←</span> <span>RETURN</span>
        </button>
        <div className="font-mono text-[10px] md:text-xs tracking-[4px] font-bold text-white uppercase">
          TENSOR <span className="text-neutral-600">MANIFOLD</span>
        </div>
        <button onClick={() => sharePhoto(currentPhoto)} className="font-mono text-[9px] md:text-[10px] text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
          TRANSMIT
        </button>
      </header>

      {/* MAIN LAYOUT (Blueprint Split) */}
      <div className="w-full max-w-7xl mx-auto mt-24 px-4 flex flex-col lg:flex-row gap-8 z-10 relative items-start">
        
        {/* ЛЕВАЯ КОЛОНКА: Исходный вектор */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="w-full p-2 math-border bg-[#08070a] relative group">
            <img src={currentPhoto.src} alt={currentPhoto.title} className="w-full relative z-10 rounded-sm shadow-2xl object-contain max-h-[65vh]" />
          </div>
          
          <div className="flex justify-between items-center px-2">
            <div className="font-mono text-[8px] text-neutral-600 uppercase tracking-widest">
              RES: {currentPhoto.title.substring(0,30)}...
            </div>
            <div className="font-mono text-[8px] text-neutral-600 uppercase tracking-widest">
              ID: {vectorId}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Контрольная панель */}
        <div className="w-full lg:w-1/2 flex flex-col gap-8">
          
          {/* Метаданные */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 mt-4 lg:mt-0">
            <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-[4px]">
              Oracle 3.0 Output:
            </div>
            <h1 className="font-mono text-lg md:text-xl text-white uppercase tracking-[3px] leading-tight">
              {displayVibe}
            </h1>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <button className={`btn-strict ${isPinned(currentPhoto) ? 'bg-white text-black' : ''}`} onClick={() => toggleSavePin(currentPhoto)}>
                {isPinned(currentPhoto) ? "[ UNLINK ]" : "[ STORE ARTIFACT ]"}
              </button>
              {link && (
                <a href={link} target="_blank" rel="noreferrer" className="btn-strict border-neutral-800 text-neutral-500 hover:border-white hover:text-black flex items-center justify-center">
                  [ SOURCE ]
                </a>
              )}
            </div>
          </div>

          {/* КОНСОЛЬ МУТАТОРА */}
          <div className="w-full grid-bg math-border p-6 md:p-8 flex flex-col gap-5 relative overflow-hidden bg-[#050408]">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="font-mono text-[8px] text-[#10b981] uppercase tracking-[4px]">
                MUTATOR_NODE_ACTIVE
              </div>
              <div className="font-mono text-[8px] text-neutral-600 uppercase tracking-widest">
                DEPTH: {historyRef.current.length}
              </div>
            </div>
            
            <div className="font-mono text-[9px] text-neutral-400 leading-relaxed uppercase tracking-widest">
              Initiate tensor iteration. Oracle will inject current resonance into global data-stream to derive deeper vectors.
            </div>

            <button 
              onClick={() => handleMutate(false)}
              disabled={isMutating}
              className="mt-2 font-mono text-[10px] md:text-[11px] text-white tracking-[4px] uppercase border border-white/20 px-8 py-3 rounded-sm hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:border-neutral-700 w-full sm:w-auto self-start"
            >
              {isMutating ? "EXECUTING..." : "ƒ(X) = MUTATE TENSOR"}
            </button>
          </div>

          {/* ВСТРОЕННЫЙ COMM-LINK (Логи) */}
          <div className="w-full math-border flex flex-col bg-[#050408]">
            <div className="border-b border-white/10 p-3 text-[9px] font-mono flex justify-between uppercase tracking-widest">
              <span className="text-white">COMM_LINK // SECURE</span>
              <span className="text-neutral-500">{comments.length} LOGS</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 font-mono text-[10px] h-[250px]">
               <div className="border-l-2 border-[#10b981] pl-3">
                 <div className="text-[#10b981] mb-1 uppercase tracking-widest">System_Node</div>
                 <div className="text-neutral-300">Data-stream connected. Ready for human input.</div>
               </div>
               
               {comments.map((c) => (
                 <div key={c.id} className="border-l-2 border-white/30 pl-3 mt-2">
                   <div className="flex justify-between items-end mb-1">
                     <span className="text-white uppercase tracking-widest">{c.sender_name}</span>
                     <span className="text-neutral-700 text-[8px]">{new Date(c.created_at).toLocaleTimeString()}</span>
                   </div>
                   <div className="text-neutral-400 text-[10px] leading-relaxed break-words">{c.content}</div>
                 </div>
               ))}
               <div ref={commentsEndRef} />
            </div>
            
            <div className="border-t border-white/10 flex bg-[#030205]">
               <div className="flex items-center text-neutral-500 px-3 font-mono text-[10px]">{'>'}</div>
               <input 
                 type="text" 
                 value={commentInput}
                 onChange={(e) => setCommentInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                 className="w-full bg-transparent border-none text-white font-mono text-[10px] py-3 outline-none focus:ring-0 placeholder-neutral-700" 
                 placeholder="Transmit sequence..." 
               />
               <button 
                 onClick={submitComment}
                 className="bg-transparent border-l border-white/10 text-white font-mono text-[9px] uppercase tracking-[2px] px-6 hover:bg-white hover:text-black transition-colors" 
               >
                 Send
               </button>
            </div>
          </div>

        </div>
      </div>

      {/* ВЫДАЧА (Сетка) */}
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-10 relative z-10 mt-12 md:mt-20">
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-10 md:mb-16 relative">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10"></div>
          <span className="text-[10px] font-mono font-bold tracking-[4px] text-neutral-500 uppercase">
             Derived Vectors {isMutating ? "[ CALC ]" : `[ n = ${relatedPhotos.length} ]`}
          </span>
          <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10"></div>
        </div>

        <div className="v-masonry">
          {relatedPhotos.map((photo, i) => {
             const isLiked = false; 
             return (
              <div key={`${photo.id}-${i}`} className="pin-card" onClick={() => openPhoto(photo)}>
                <img src={photo.thumb || photo.src} alt="Derivative" loading="lazy" />
                <div className="pin-overlay">
                  <div className="flex justify-end w-full">
                    <button className={`btn-strict ${isPinned(photo) ? 'bg-white text-black' : ''} text-[8px] px-3 py-1.5`} onClick={(e) => { e.stopPropagation(); toggleSavePin(photo); }}>
                      {isPinned(photo) ? 'UNLINK' : 'SAVE'}
                    </button>
                  </div>
                  <div className="flex justify-between items-end w-full mt-auto">
                    <div className="font-mono text-[8px] text-white/50 tracking-widest uppercase font-bold drop-shadow-md">
                      ID: {photo.id.substring(0,6).toUpperCase()}
                    </div>
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
          <div className="text-center p-16 text-[#555] font-mono tracking-[4px] uppercase text-[10px] font-bold">
            NO RESONANCE FOUND.
          </div>
        )}
        
        <div ref={bottomRef}>
          {relatedLoading && (
            <div className="text-center py-16">
              <div className="w-6 h-6 border border-white/20 border-t-[#10b981] rounded-full animate-spin mx-auto"></div>
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
    </div>
  );
}

export default function VibePage() {
  return (
    <Suspense fallback={<div style={{ background: "#020104", minHeight: "100vh" }}></div>}>
      <VibeContent />
    </Suspense>
  );
}
