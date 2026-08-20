"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { checkNsfw } from "../../lib/nsfw";
import { getAnonId } from "../../lib/identity";
import PinCard from "../../components/PinCard";
import AgeGateModal from "../../components/AgeGateModal";
import { useTasteProfile } from "../hooks/useTasteProfile";

type Photo = { id: string; src: string; thumb: string; title: string; link: string; isNsfw?: boolean };
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
  
  // 🔥 РАЗДЕЛЯЕМ: displayVibe - для красоты на экране, searchQuery - для поиска под капотом
  const [displayVibe, setDisplayVibe] = useState("ANALYZING...");

  const currentQueryRef = useRef("");
  const historyRef = useRef<string[]>([]); // Память мутаций, чтобы не было зацикливаний
  const lastAnalyzedSrcRef = useRef<string | null>(null);
  const relatedAbortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // 🔥 ЧИСТЫЙ ПОИСК (Только делает запрос к DDG/Bing, больше не пытается угадывать слова)
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
            isNsfw: isNsfwQuery || checkNsfw(p.title || "")
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
      if (e.name !== "AbortError") console.error("[FETCH IMAGES ERROR]", e);
    } finally {
      setRelatedLoading(false);
    }
  }, [src]);

  // 🔥 ЕДИНЫЙ МОЗГ (Вызывается и при старте, и по кнопке MUTATE)
  const handleMutate = useCallback(async (isInitial = false) => {
    if (isMutating || !src) return;
    setIsMutating(true);

    if (isInitial) {
      setDisplayVibe("ANALYZING...");
      setRelatedLoading(true);
    }

    try {
      // Отправляем картинку + ИСТОРИЮ на наш новый бэкенд
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
        setDisplayVibe(data.displayVibe); // На экран идет красота (напр. "Jimmy Page Aura")
        currentQueryRef.current = data.smartQuery; // В поиск идет скрытый запрос (напр. "Jimmy Page guitar stage")

        // Записываем в память, чтобы ИИ больше это не повторял
        historyRef.current.push(data.displayVibe);

        setRelatedPhotos([]);
        setRelatedPage(1);
        setRelatedHasMore(true);
        await fetchImages(data.smartQuery, 1, true);
      }
    } catch (e) {
      console.error("Mutation failed", e);
      if (isInitial) setDisplayVibe("SIGNAL LOST");
    } finally {
      setIsMutating(false);
    }
  }, [src, isMutating, fetchImages]);

  // 🔥 АВТОЗАПУСК: Как только юзер открыл страницу, ИИ сразу анализирует картинку!
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

  // Бесконечный скролл вниз
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

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  async function savePin(photo: Photo) {
    if (!user) { router.push("/auth"); return; }
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, source_url: photo.link })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]);
      }
    } catch (e) {}
  }

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) navigator.share({ title: displayVibe, url });
    else navigator.clipboard.writeText(url);
  }

  function openPhoto(photo: Photo) {
    feedLocalAI(photo.src, photo.id);
    const isBlurred = photo.isNsfw && !nsfwAllowed;
    if (isBlurred) { setShowAgeGate(photo); return; }
    // При переходе на новую картинку сбрасываем память
    lastAnalyzedSrcRef.current = null;
    router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
  }

  if (!src) return <div style={{ color: "#fff", padding: 40, textAlign: "center", background: "#020104", minHeight: "100vh", fontFamily: 'Syncopate' }}>Artifact not found.</div>;

  return (
    <div className="min-h-screen bg-[#020104] text-white font-sans overflow-x-hidden overflow-y-auto flex flex-col relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        .font-syncopate { font-family: 'Syncopate', sans-serif; }
        
        @keyframes ooze { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(10%, -10%) scale(1.1); } }
        @keyframes bg-drift { 0% { transform: translate(0, 0) scale(1.1); filter: hue-rotate(0deg); } 100% { transform: translate(-2%, 2%) scale(1.15); filter: hue-rotate(15deg); } }
        @keyframes flow-lines { 0% { background-position: 0 0; } 100% { background-position: 500px 500px; } }
        @keyframes text-pulse { 0% { opacity: 0.5; text-shadow: 0 0 20px rgba(255,255,255,0.3); } 100% { opacity: 1; text-shadow: 0 0 40px white, 0 0 80px rgba(168,85,247,0.8); } }
        @keyframes volvelle-spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        
        .force-fluid-filter { -webkit-filter: url('#fluid-warp'); filter: url('#fluid-warp'); }
        .v-masonry { columns: 2; gap: 16px; } @media (min-width: 640px) { .v-masonry { columns: 3; } } @media (min-width: 1024px) { .v-masonry { columns: 4; } } @media (min-width: 1440px) { .v-masonry { columns: 5; } }
        .v-spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #a855f7; border-radius: 50%; animation: v-spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite; margin: 40px auto; box-shadow: 0 0 15px rgba(168,85,247,0.5); }
        @keyframes v-spin { to { transform: rotate(360deg); } }
        
        .prism-hover { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
        .prism-hover:hover { box-shadow: -10px 0 30px rgba(255,0,85,0.4), 0 0 30px rgba(0,255,0,0.2), 10px 0 30px rgba(0,255,255,0.4); border-color: rgba(255,255,255,0.3); transform: translateY(-5px); }
      `}} />

      <svg style={{ width: 0, height: 0, position: 'absolute', zIndex: -1 }}>
        <defs>
          <filter id="fluid-warp" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020104]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] border-[1px] border-white/5 rounded-full opacity-20 animate-[volvelle-spin_120s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
        <img src={currentPhoto.src} alt="" aria-hidden="true" className="absolute -inset-[10%] w-[120%] h-[120%] object-cover blur-[100px] opacity-20 scale-110" style={{ animation: 'bg-drift 40s ease-in-out infinite alternate' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020104]/80 via-[#020104]/60 to-[#020104]/95"></div>
      </div>

      <button className="fixed top-6 left-6 md:top-8 md:left-8 z-50 text-white/40 hover:text-white transition w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.8)] cursor-pointer" onClick={() => router.push("/")}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>

      <div className="flex-shrink-0 flex items-center justify-center p-4 pt-24 md:p-10 md:pt-28">
        <div className="w-full max-w-7xl bg-[#050308]/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_30px_80px_rgba(0,0,0,0.9),_0_0_40px_rgba(168,85,247,0.1)] relative z-10 prism-hover">
          
          <div className="flex-1 p-4 md:p-8 flex items-center justify-center relative min-h-[40vh] lg:min-h-[60vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="relative flex items-center justify-center w-full h-full max-h-[60vh] lg:max-h-[75vh] group">
              <img src={currentPhoto.src} alt="Artifact" className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform duration-1000 group-hover:scale-[1.02]" />
              <div className="absolute top-4 right-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                <button onClick={() => sharePhoto(currentPhoto)} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]" title="Share">
                   <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-[400px] xl:w-[480px] shrink-0 p-6 md:p-10 flex flex-col justify-center relative bg-gradient-to-t lg:bg-gradient-to-l from-white/5 to-transparent border-t lg:border-t-0 lg:border-l border-white/5">
            
            <div className="relative z-20 text-center lg:text-left">
              <p className="text-[#888] text-[9px] md:text-[10px] font-syncopate tracking-[0.3em] uppercase m-0 leading-relaxed font-bold mb-3">
                {displayVibe === "ANALYZING..." ? "ANALYZING FREQUENCY..." : "CURRENT RESONANCE:"}
              </p>
              <h1 className="text-xl md:text-2xl xl:text-3xl font-syncopate tracking-[0.1em] font-bold text-white leading-tight uppercase text-shadow-[0_0_20px_rgba(255,255,255,0.2)] break-words">
                {displayVibe}
              </h1>
            </div>

            <div className="flex flex-col gap-6 mt-10 md:mt-16 relative z-10 w-full items-center lg:items-start">
              
              <div onClick={() => handleMutate(false)} className={`relative w-[180px] h-[180px] md:w-[200px] md:h-[200px] flex justify-center items-center cursor-pointer group mx-auto lg:mx-0 ${isMutating ? 'is-mutating' : ''}`}>
                <div className="absolute inset-2 border-[1px] border-[#a855f7]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-[volvelle-spin_15s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                <div className="absolute w-[120%] h-[120%] blur-[25px] opacity-70 mix-blend-screen transition-all duration-1000 group-hover:opacity-100 group-hover:scale-110" style={{ WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', filter: isMutating ? 'blur(35px)' : 'blur(25px)' }}>
                  <div className="absolute w-[60%] h-[60%] -top-[10%] left-0 rounded-full bg-[#3a0088]" style={{ animation: 'ooze 12s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[50%] h-[50%] -bottom-[10%] right-0 rounded-full bg-[#f97316]" style={{ animation: 'ooze 10s infinite alternate-reverse ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[40%] h-[40%] top-[30%] left-[30%] rounded-full bg-[#d946ef] opacity-80" style={{ animation: 'ooze 15s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                </div>
                <div className="absolute -inset-[10%] opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-90 force-fluid-filter" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.2) 3px, rgba(255, 255, 255, 0.2) 4px)', WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', animation: isMutating ? 'flow-lines 5s linear infinite' : 'flow-lines 20s linear infinite' }}></div>
                <div className="absolute w-[90px] h-[90px] md:w-[100px] md:h-[100px] rounded-full z-5 transition-all duration-[1.5s] ease-[cubic-bezier(0.19,1,0.22,1)] shadow-[inset_0_0_30px_rgba(0,0,0,1)]" style={{ background: 'radial-gradient(circle, rgba(2,1,4,0.95) 0%, rgba(2,1,4,0.6) 40%, rgba(0,0,0,0) 80%)', filter: isMutating ? 'blur(10px)' : 'blur(3px)', transform: isMutating ? 'scale(1.4)' : 'scale(1)', opacity: isMutating ? 0.8 : 1 }}></div>

                <div className="relative z-10 text-white uppercase font-syncopate font-bold text-center" style={{ fontSize: '9px', letterSpacing: isMutating ? '0.2em' : '0.4em', textShadow: isMutating ? '0 0 20px white, 0 0 40px #a855f7' : '0 0 10px rgba(255, 255, 255, 0.5)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)', animation: isMutating ? 'text-pulse 1s infinite alternate' : 'none' }}>
                  {isMutating ? 'MUTATING...' : 'MUTATE'}
                </div>
              </div>
              
              {isPinned(currentPhoto) ? (
                <div className="text-[9px] md:text-[10px] text-[#a855f7] tracking-[0.3em] font-syncopate font-bold uppercase text-center w-full max-w-[200px] mx-auto lg:mx-0 mt-2 cursor-default drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  ✓ STORED IN ARCHIVE
                </div>
              ) : (
                <button type="button" onClick={() => savePin(currentPhoto)} className="text-[9px] md:text-[10px] text-[#888] border border-[#888] px-6 py-3 rounded-full hover:text-white hover:border-white hover:bg-white/5 tracking-[0.3em] transition-all font-syncopate font-bold uppercase text-center w-full max-w-[200px] mx-auto lg:mx-0 mt-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  STORE ARTIFACT
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>

      <div className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-10 relative z-10 mt-8 md:mt-12">
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-10 md:mb-16 relative">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10"></div>
          <span className="text-[10px] md:text-xs font-syncopate font-bold tracking-[0.4em] text-[#666] uppercase">CURATED RESONANCE</span>
          <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10"></div>
        </div>

        <div className="v-masonry">
          {relatedPhotos.map((photo, i) => (
            <div key={`${photo.src}-${i}`} className="prism-hover mb-4 rounded-xl overflow-hidden">
                <PinCard photo={photo} nsfwAllowed={nsfwAllowed} isPinned={isPinned(photo)} onClick={() => openPhoto(photo)} onSaveClick={(e: any) => { e.stopPropagation(); if (!isPinned(photo)) savePin(photo); }} onShareClick={(e: any) => { e.stopPropagation(); sharePhoto(photo); }} />
            </div>
          ))}
        </div>

        {relatedPhotos.length === 0 && !relatedLoading && (
          <div className="text-center p-16 text-[#555] font-syncopate tracking-[0.2em] uppercase text-sm font-bold">NO RESONANCE FOUND.</div>
        )}
        <div ref={bottomRef}>{relatedLoading && <div className="v-spinner" />}</div>
      </div>

      {showAgeGate && (
        <AgeGateModal onConfirm={() => { setNsfwAllowed(true); try { localStorage.setItem("gelbet_nsfw_18plus", "true"); } catch (e) {} const p = showAgeGate; setShowAgeGate(null); if (p) openPhoto(p); }} onCancel={() => setShowAgeGate(null)} />
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
