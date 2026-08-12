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
  const title = searchParams.get("title") || "Aesthetic Artifact";
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
  
  // Анимация мутации и статус
  const [isMutating, setIsMutating] = useState(false);
  const [activeVibe, setActiveVibe] = useState("Scanning...");

  const currentQueryRef = useRef("");
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
        fetch(`/api/pins?user_id=${data.session.user.id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setPins(d.pins || d.data || []); }).catch(() => {});
      } else {
        setIdentity(getAnonId());
      }
    });
  }, []);

  const fetchRelated = useCallback(async (pageNum: number, reset: boolean, queryOverride?: string, forceRescan: boolean = false) => {
    if (!src) return;
    setRelatedLoading(true);
    if (reset) {
      relatedAbortRef.current?.abort();
      relatedAbortRef.current = new AbortController();
    }

    try {
      let aiQuery = queryOverride || currentQueryRef.current;

      if ((reset && !aiQuery) || forceRescan) {
        setActiveVibe("Scanning...");
        try {
          const aiRes = await fetch("/api/ai", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ 
                action: "analyze_image", 
                payload: src, 
                userId: identity, 
                title,
                ignore_cache: forceRescan
            }) 
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (aiData.result) aiQuery = aiData.result;
          }
        } catch (err) { console.error("Vision failed", err); }

        if (!aiQuery || aiQuery.length < 3) {
          const stopWords = new Set(["photo", "image", "picture", "wallpaper", "background", "free", "download", "high", "resolution", "by", "of", "the", "in", "on", "a", "and", "is", "with", "for", "hd", "4k", "stock", "quality"]);
          const rawWords = title.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, "").split(/\s+/);
          const keywords = Array.from(new Set(rawWords.filter(w => w.length > 2 && !stopWords.has(w)))).slice(0, 3);
          aiQuery = keywords.length > 0 ? keywords.join(" ") : "aesthetic";
        }
        aiQuery = aiQuery.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      }

      currentQueryRef.current = aiQuery;
      setActiveVibe(aiQuery);

      const params = new URLSearchParams({ page: String(pageNum), query: aiQuery });
      const res = await fetch(`/api/search?${params}`, { signal: relatedAbortRef.current?.signal });
      const data = await res.json();
      const rawArray = Array.isArray(data) ? data : (data.data || data.photos || data.items || data.results || []);
      const isNsfwQuery = checkNsfw(aiQuery);

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
    } finally {
      setRelatedLoading(false);
    }
  }, [src, title, identity]);

  useEffect(() => {
    if (!src || identity === null) return;
    currentQueryRef.current = "";
    setRelatedPhotos([]);
    setRelatedPage(1);
    setRelatedHasMore(true);
    fetchRelated(1, true);
  }, [src, identity]);

  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && relatedHasMore && !relatedLoading && currentQueryRef.current) {
        const next = relatedPage + 1;
        setRelatedPage(next);
        fetchRelated(next, false);
      }
    }, { threshold: 0.1 });
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [relatedHasMore, relatedLoading, relatedPage, fetchRelated]);

  async function handleMutate() {
    if (isMutating || !src) return;
    setIsMutating(true);
    try {
      const concept = (activeVibe && activeVibe !== "Scanning..." ? activeVibe : title).slice(0, 120);
      const res = await fetch("/api/mutate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concept, userId: identity }) });
      const data = await res.json();
      const newQuery = data.mutated_query;
      if (newQuery) {
        setRelatedPhotos([]);
        setRelatedPage(1);
        setRelatedHasMore(true);
        await fetchRelated(1, true, newQuery);
      }
    } catch (e) {
      console.error("Mutation failed", e);
    } finally {
      setIsMutating(false);
    }
  }

  const handleRecalibrate = () => {
    if (activeVibe === "Scanning...") return;
    currentQueryRef.current = "";
    setRelatedPhotos([]);
    setRelatedPage(1);
    setRelatedHasMore(true);
    fetchRelated(1, true, undefined, true);
  };

  function isPinned(photo: Photo) { return pins.some(p => p.image_url === photo.src); }

  async function savePin(photo: Photo) {
    if (!user) { router.push("/auth"); return; }
    try {
      const res = await fetch("/api/pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, image_url: photo.src, title: photo.title, source_url: photo.link }) });
      if (res.ok) {
        const data = await res.json();
        if (data.pin || data.data) setPins(prev => [data.pin || data.data, ...prev]);
      }
    } catch (e) {}
  }

  function sharePhoto(photo: Photo) {
    const url = photo.link || window.location.href;
    if (navigator.share) navigator.share({ title: photo.title || "Gelbet Vibe", url });
    else navigator.clipboard.writeText(url);
  }

  function openPhoto(photo: Photo) {
    feedLocalAI(photo.src, photo.id);
    const isBlurred = photo.isNsfw && !nsfwAllowed;
    if (isBlurred) { setShowAgeGate(photo); return; }
    router.push(`/vibe?src=${encodeURIComponent(photo.src)}&title=${encodeURIComponent(photo.title || "")}&link=${encodeURIComponent(photo.link || "")}`);
  }

  const currentPhoto: Photo = { id: src || "", src: src || "", thumb: src || "", title, link: link || "" };

  if (!src) return <div style={{ color: "#d4b896", padding: 40, textAlign: "center", background: "#050403", minHeight: "100vh" }}>Artifact not found.</div>;

  return (
    <div className="min-h-screen bg-[#030105] text-white font-sans overflow-x-hidden overflow-y-auto flex flex-col relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@700&family=Inter:wght@300;400;500&display=swap');
        .font-syncopate { font-family: 'Syncopate', sans-serif; }
        @keyframes ooze { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(10%, -10%) scale(1.1); } }
        @keyframes bg-drift { 0% { transform: translate(0, 0) scale(1.25); } 100% { transform: translate(-4%, 3%) scale(1.35); } }
        @keyframes flow-lines { 0% { background-position: 0 0; } 100% { background-position: 500px 500px; } }
        @keyframes text-pulse { 0% { opacity: 0.5; text-shadow: 0 0 20px rgba(255,255,255,0.3); } 100% { opacity: 1; text-shadow: 0 0 40px white, 0 0 80px rgba(255,0,100,0.8); } }
        
        .v-masonry { columns: 2; gap: 12px; } @media (min-width: 640px) { .v-masonry { columns: 3; } } @media (min-width: 1024px) { .v-masonry { columns: 4; } }
        .v-spinner { width: 28px; height: 28px; border: 2px solid #1a1208; border-top-color: #c0521a; border-radius: 50%; animation: v-spin 0.8s linear infinite; margin: 30px auto; }
        @keyframes v-spin { to { transform: rotate(360deg); } }
        
        .force-fluid-filter { -webkit-filter: url('#fluid-warp'); filter: url('#fluid-warp'); }
      `}} />

      {/* SVG Фильтры для плазмы и искажений */}
      <svg style={{ width: 0, height: 0, position: 'absolute', zIndex: -1 }}>
        <defs>
            <filter id="fluid-warp" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves={3} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="150" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>
      </svg>

      {/* Чистый эмбиентный фон без зерна */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src={currentPhoto.src}
          alt=""
          aria-hidden="true"
          className="absolute -inset-[10%] w-[120%] h-[120%] object-cover blur-[90px] opacity-25 scale-125"
          style={{ animation: 'bg-drift 30s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 bg-[#030105]/60"></div>
      </div>

      {/* Кнопка закрытия жестко зафиксирована */}
      <button 
        className="fixed top-6 left-6 z-50 text-white/50 hover:text-white transition w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer" 
        onClick={() => router.push("/")}
      >
        ✕
      </button>

      {/* ВЕРХНЯЯ ЧАСТЬ: ГЛАВНАЯ КАРТОЧКА */}
      <div className="flex-shrink-0 flex items-center justify-center p-4 md:p-10 pt-24">
        <div className="w-full max-w-6xl bg-[#0a0612]/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-[0_0_80px_rgba(58,0,136,0.15)] relative z-10 md:sticky md:top-24">
          
          {/* ЛЕВАЯ ЧАСТЬ: ИЗОБРАЖЕНИЕ */}
          <div className="w-full md:w-1/2 min-w-0 p-4 md:p-6 flex items-center justify-center bg-black/40">
            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl group bg-[#1a1520]">
              <img 
                src={currentPhoto.src} 
                alt={title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={() => sharePhoto(currentPhoto)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition text-white"
                  title="Share"
                >
                   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                     <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                   </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* ПРАВАЯ ЧАСТЬ: МЕТАДАННЫЕ */}
          <div className="w-full md:w-1/2 min-w-0 p-8 md:p-12 flex flex-col">
            
            <div className="relative z-20 flex-grow">
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-syncopate tracking-widest text-white leading-tight uppercase line-clamp-3 break-words">
                  {title}
                </h1>
              </div>

              {link && link !== "undefined" && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mb-6 text-[10px] font-syncopate tracking-widest text-neutral-500 hover:text-white transition uppercase">
                  ↗ Source Link
                </a>
              )}
              
              <div className="mt-4 flex flex-wrap items-center gap-4 min-h-[40px]">
                <p className="text-neutral-500 text-xs font-syncopate tracking-[0.2em] uppercase m-0 leading-tight">
                  {activeVibe === "Scanning..." ? "Analyzing frequency..." : "Vibe Resonance:"} <br/>
                  <span className="text-white/80">{activeVibe !== "Scanning..." && activeVibe}</span>
                </p>
                
                {/* НОВАЯ КНОПКА RECALIBRATE (CURRENTS VIBE) */}
                <button
                  onClick={handleRecalibrate}
                  disabled={activeVibe === "Scanning..."}
                  className={`relative overflow-hidden px-5 py-2 rounded-full text-[10px] font-syncopate uppercase tracking-[0.2em] transition-all duration-500 group ${
                    activeVibe === "Scanning..."
                      ? "border border-white/10 text-white/30 cursor-not-allowed bg-transparent"
                      : "border border-white/20 text-white hover:border-white/50 cursor-pointer shadow-[0_0_15px_rgba(192,82,26,0.15)] hover:shadow-[0_0_30px_rgba(192,82,26,0.4)] bg-[#0a0612]"
                  }`}
                >
                  {activeVibe !== "Scanning..." && (
                    <>
                      <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-500 blur-[8px] mix-blend-screen">
                          <div className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%] bg-gradient-to-r from-[#3a0088] via-[#ff0055] to-[#ff4500]" style={{ animation: 'ooze 8s infinite alternate ease-in-out' }}></div>
                      </div>
                      <div 
                        className="absolute inset-0 opacity-40 group-hover:opacity-80 mix-blend-screen transition-opacity duration-500 force-fluid-filter"
                        style={{
                          background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.25) 3px, rgba(255, 255, 255, 0.25) 4px)',
                          animation: 'flow-lines 10s linear infinite'
                        }}
                      ></div>
                    </>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-500"></div>
                  
                  <span className="relative z-10 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-500">
                    {activeVibe === "Scanning..." ? "Purging..." : "Recalibrate"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-auto relative z-10 w-full items-center pt-8">
              
              {/* ГЛАВНАЯ КНОПКА MUTATE (БЕЗДНА) */}
              <div 
                onClick={handleMutate}
                className={`relative w-full h-[240px] flex justify-center items-center cursor-pointer group ${isMutating ? 'is-mutating' : ''}`}
              >
                <div 
                  className="absolute w-[150%] h-[150%] blur-[50px] opacity-80 mix-blend-screen transition-all duration-1000"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 90%)',
                    maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 90%)',
                    transform: isMutating ? 'scale(1.2)' : 'scale(1)',
                    filter: isMutating ? 'blur(60px)' : 'blur(50px)'
                  }}
                >
                  <div className="absolute w-[60%] h-[60%] -top-[10%] left-0 rounded-full bg-[#3a0088]" style={{ animation: 'ooze 15s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[50%] h-[50%] -bottom-[10%] right-0 rounded-full bg-[#ff0055]" style={{ animation: 'ooze 12s infinite alternate-reverse ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[40%] h-[40%] top-[30%] left-[30%] rounded-full bg-[#ff4500] opacity-60" style={{ animation: 'ooze 18s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                </div>

                <div 
                  className="absolute -inset-[20%] opacity-50 pointer-events-none transition-opacity duration-300 group-hover:opacity-80 force-fluid-filter"
                  style={{
                    background: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255, 255, 255, 0.15) 4px, rgba(255, 255, 255, 0.15) 5px)',
                    WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 90%)',
                    maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 90%)',
                    animation: isMutating ? 'flow-lines 10s linear infinite' : 'none'
                  }}
                ></div>

                <div 
                  className="absolute w-[180px] h-[180px] rounded-full z-5 transition-all duration-[1.5s] ease-[cubic-bezier(0.19,1,0.22,1)]"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 75%)',
                    filter: isMutating ? 'blur(25px)' : 'blur(15px)',
                    transform: isMutating ? 'scale(2.2)' : 'scale(1)',
                    opacity: isMutating ? 0.6 : 1
                  }}
                ></div>

                <div 
                  className="relative z-10 text-white uppercase ml-[0.5em] transition-all duration-[0.8s] ease-[cubic-bezier(0.19,1,0.22,1)] font-syncopate"
                  style={{ 
                    fontSize: '1rem',
                    letterSpacing: isMutating ? '0.15em' : '0.5em',
                    textShadow: isMutating ? '0 0 40px white, 0 0 80px rgba(255,0,100,0.8)' : '0 0 30px rgba(255, 255, 255, 0.4)',
                    opacity: isMutating ? 0.8 : 0.9,
                    animation: isMutating ? 'text-pulse 1s infinite alternate' : 'none'
                  }}
                >
                  {isMutating ? 'Synthesizing...' : 'Mutate'}
                </div>
              </div>
              
              {isPinned(currentPhoto) ? (
                <div className="text-[9px] text-white/50 tracking-[0.2em] font-syncopate uppercase text-center w-full mt-2 cursor-default">
                  ✓ Saved to archive
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => savePin(currentPhoto)}
                  className="text-[9px] text-neutral-500 hover:text-white tracking-[0.2em] transition-colors font-syncopate uppercase text-center w-full mt-2" 
                >
                  Save to archive
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>

      {/* НИЖНЯЯ ЧАСТЬ: ЛЕНТА ПОХОЖИХ КАРТИНОК */}
      <div className="flex-grow w-full max-w-[1200px] mx-auto p-6 md:p-10 relative z-10 border-t border-white/5 mt-10">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="text-xs font-syncopate tracking-[0.2em] text-neutral-500 uppercase">Curated Matches</span>
          {activeVibe !== "Scanning..." && (
            <span className="text-sm text-neutral-400 font-light italic">for {activeVibe.toLowerCase()}</span>
          )}
        </div>

        <div className="v-masonry">
          {relatedPhotos.map((photo, i) => (
            <PinCard
              key={`${photo.src}-${i}`}
              photo={photo}
              nsfwAllowed={nsfwAllowed}
              isPinned={isPinned(photo)}
              onClick={() => openPhoto(photo)}
              onSaveClick={(e: any) => { e.stopPropagation(); if (!isPinned(photo)) savePin(photo); }}
              onShareClick={(e: any) => { e.stopPropagation(); sharePhoto(photo); }}
            />
          ))}
        </div>

        {relatedPhotos.length === 0 && !relatedLoading && (
          <div className="text-center p-12 text-neutral-600 font-light italic">No matches found in the current frequency.</div>
        )}
        <div ref={bottomRef}>{relatedLoading && <div className="v-spinner border-white/10 border-t-purple-500" />}</div>
      </div>

      {/* ВОЗРАСТНОЙ ШЛЮЗ */}
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
    <Suspense fallback={<div style={{ background: "#030105", minHeight: "100vh" }}></div>}>
      <VibeContent />
    </Suspense>
  );
}
