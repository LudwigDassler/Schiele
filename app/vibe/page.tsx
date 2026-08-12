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
          const aiRes = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze_image", payload: src, userId: identity, title, ignore_cache: forceRescan }) });
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
          return { ...p, id: p.id || mappedSrc, src: mappedSrc, thumb: p.thumb || p.thumbnail || p.image || mappedSrc, link: p.link || p.url || p.source_url || mappedSrc, isNsfw: isNsfwQuery || checkNsfw(p.title || "") };
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

      {/* Cosmic + Blurred Image Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020104]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] border-[1px] border-white/5 rounded-full opacity-20 animate-[volvelle-spin_120s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
        <img src={currentPhoto.src} alt="" aria-hidden="true" className="absolute -inset-[10%] w-[120%] h-[120%] object-cover blur-[100px] opacity-20 scale-110" style={{ animation: 'bg-drift 40s ease-in-out infinite alternate' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020104]/80 via-[#020104]/60 to-[#020104]/95"></div>
      </div>

      <button className="fixed top-8 left-8 z-50 text-white/40 hover:text-white transition w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.8)] cursor-pointer" onClick={() => router.push("/")}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>

      <div className="flex-shrink-0 flex items-center justify-center p-4 md:p-10 pt-28">
        <div className="w-full max-w-7xl bg-[#050308]/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-[0_30px_80px_rgba(0,0,0,0.9),_0_0_40px_rgba(168,85,247,0.1)] relative z-10 prism-hover">
          
          <div className="w-full md:w-1/2 min-w-0 p-6 md:p-8 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] group bg-[#0a0a0a]">
              <img src={currentPhoto.src} alt={title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                <button onClick={() => sharePhoto(currentPhoto)} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]" title="Share">
                   <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 min-w-0 p-8 md:p-14 flex flex-col justify-between relative bg-gradient-to-l from-white/5 to-transparent">
            
            <div className="relative z-20">
              <h1 className="text-3xl md:text-4xl font-syncopate tracking-[0.2em] font-bold text-white leading-tight uppercase line-clamp-4 break-words text-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {title}
              </h1>

              {link && link !== "undefined" && (
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-6 text-[10px] font-syncopate tracking-widest text-[#a855f7] hover:text-white hover:text-shadow-[0_0_10px_#fff] transition-all uppercase font-bold">
                  ↗ Access Source Matrix
                </a>
              )}
              
              <div className="mt-8 flex flex-col gap-4">
                <p className="text-[#888] text-[10px] font-syncopate tracking-[0.3em] uppercase m-0 leading-relaxed font-bold">
                  {activeVibe === "Scanning..." ? "ANALYZING FREQUENCY..." : "RESONANCE DETECTED:"} <br/>
                  <span className="text-white text-sm tracking-[0.2em]">{activeVibe !== "Scanning..." && activeVibe}</span>
                </p>
                
                <button onClick={handleRecalibrate} disabled={activeVibe === "Scanning..."} className={`relative overflow-hidden w-max px-6 py-3 rounded-full text-[10px] font-syncopate font-bold uppercase tracking-[0.3em] transition-all duration-500 group ${activeVibe === "Scanning..." ? "border border-white/5 text-white/20 cursor-not-allowed bg-transparent" : "border border-[#f97316]/50 text-white hover:border-[#f97316] cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] bg-[#050308]"}`}>
                  {activeVibe !== "Scanning..." && (
                    <>
                      <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-500 blur-[8px] mix-blend-screen">
                          <div className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%] bg-gradient-to-r from-[#3a0088] via-[#f97316] to-[#ff0055]" style={{ animation: 'ooze 8s infinite alternate ease-in-out' }}></div>
                      </div>
                      <div className="absolute inset-0 opacity-40 group-hover:opacity-80 mix-blend-screen transition-opacity duration-500 force-fluid-filter" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.2) 3px, rgba(255, 255, 255, 0.2) 4px)', animation: 'flow-lines 10s linear infinite' }}></div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/20 transition-colors duration-500"></div>
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500">
                    {activeVibe === "Scanning..." ? "PURGING..." : "RECALIBRATE"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6 mt-12 relative z-10 w-full items-center">
              
              {/* THE ABYSS (MUTATE) */}
              <div onClick={handleMutate} className={`relative w-full max-w-sm aspect-square flex justify-center items-center cursor-pointer group ${isMutating ? 'is-mutating' : ''}`}>
                
                {/* LZ III Inner Runes / Dashes */}
                <div className="absolute inset-4 border-[1px] border-[#a855f7]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-[volvelle-spin_15s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                
                {/* DSOTM + Currents Plasma Core */}
                <div className="absolute w-[120%] h-[120%] blur-[40px] opacity-70 mix-blend-screen transition-all duration-1000 group-hover:opacity-100 group-hover:scale-110" style={{ WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', filter: isMutating ? 'blur(60px)' : 'blur(40px)' }}>
                  <div className="absolute w-[60%] h-[60%] -top-[10%] left-0 rounded-full bg-[#3a0088]" style={{ animation: 'ooze 12s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[50%] h-[50%] -bottom-[10%] right-0 rounded-full bg-[#f97316]" style={{ animation: 'ooze 10s infinite alternate-reverse ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                  <div className="absolute w-[40%] h-[40%] top-[30%] left-[30%] rounded-full bg-[#d946ef] opacity-80" style={{ animation: 'ooze 15s infinite alternate ease-in-out', animationPlayState: isMutating ? 'running' : 'paused' }}></div>
                </div>

                <div className="absolute -inset-[10%] opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-90 force-fluid-filter" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.2) 3px, rgba(255, 255, 255, 0.2) 4px)', WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', maskImage: 'radial-gradient(ellipse 70% 45% at 50% 50%, black 20%, transparent 80%)', animation: isMutating ? 'flow-lines 5s linear infinite' : 'flow-lines 20s linear infinite' }}></div>

                <div className="absolute w-[160px] h-[160px] rounded-full z-5 transition-all duration-[1.5s] ease-[cubic-bezier(0.19,1,0.22,1)] shadow-[inset_0_0_50px_rgba(0,0,0,1)]" style={{ background: 'radial-gradient(circle, rgba(2,1,4,0.95) 0%, rgba(2,1,4,0.6) 40%, rgba(0,0,0,0) 80%)', filter: isMutating ? 'blur(20px)' : 'blur(5px)', transform: isMutating ? 'scale(1.8)' : 'scale(1)', opacity: isMutating ? 0.8 : 1 }}></div>

                <div className="relative z-10 text-white uppercase font-syncopate font-bold" style={{ fontSize: '14px', letterSpacing: isMutating ? '0.2em' : '0.5em', textShadow: isMutating ? '0 0 40px white, 0 0 80px #a855f7' : '0 0 20px rgba(255, 255, 255, 0.5)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)', animation: isMutating ? 'text-pulse 1s infinite alternate' : 'none' }}>
                  {isMutating ? 'SYNTHESIZING...' : 'MUTATE'}
                </div>
              </div>
              
              {isPinned(currentPhoto) ? (
                <div className="text-[10px] text-[#a855f7] tracking-[0.3em] font-syncopate font-bold uppercase text-center w-full mt-4 cursor-default drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  ✓ STORED IN ARCHIVE
                </div>
              ) : (
                <button type="button" onClick={() => savePin(currentPhoto)} className="text-[10px] text-[#888] border border-[#888] px-6 py-3 rounded-full hover:text-white hover:border-white hover:bg-white/5 tracking-[0.3em] transition-all font-syncopate font-bold uppercase text-center mt-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  STORE ARTIFACT
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>

      <div className="flex-grow w-full max-w-[1600px] mx-auto p-6 md:p-10 relative z-10 mt-12">
        <div className="flex items-center justify-center gap-6 mb-16 relative">
          <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10"></div>
          <span className="text-xs font-syncopate font-bold tracking-[0.4em] text-[#666] uppercase">CURATED RESONANCE</span>
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
