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

  const fetchRelated = useCallback(async (pageNum: number, reset: boolean, queryOverride?: string) => {
    if (!src) return;
    setRelatedLoading(true);
    if (reset) {
      relatedAbortRef.current?.abort();
      relatedAbortRef.current = new AbortController();
    }

    try {
      let aiQuery = queryOverride || currentQueryRef.current;

      if (reset && !aiQuery) {
        setActiveVibe("Scanning...");
        try {
          const aiRes = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze_image", payload: src, userId: identity }) });
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
    <div style={{ minHeight: "100vh", background: "#050403", color: "#d4b896", paddingBottom: 60 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        .v-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1a1208; position: sticky; top: 0; background: rgba(5,4,3,0.9); backdrop-filter: blur(12px); z-index: 10; }
        .v-logo { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: #c0521a; letter-spacing: 4px; cursor: pointer; text-decoration: none; }
        .v-close { background: none; border: none; color: #8a6a4a; cursor: pointer; font-size: 22px; width: 38px; height: 38px; border-radius: 50%; transition: all 0.2s; }
        .v-close:hover { background: #1a1208; color: #d4b896; }
        .v-container { display: flex; flex-direction: column; max-width: 1200px; margin: 0 auto; padding: 24px; gap: 24px; }
        @media(min-width: 800px) { .v-container { flex-direction: row; align-items: flex-start; } }
        .v-imgwrap { flex: 1.5; background: #080604; border: 1px solid #1a1208; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center; min-height: 200px; }
        .v-mainimg { max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 4px; }
        .v-actions { flex: 1; display: flex; flex-direction: column; gap: 14px; background: #080604; padding: 28px; border: 1px solid #1a1208; border-radius: 8px; position: sticky; top: 80px; }
        .v-title { font-size: 15px; color: #8a6a4a; font-style: italic; font-family: 'Crimson Text', serif; line-height: 1.5; }

        .v-btn { padding: 14px 20px; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: all 0.25s; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .v-btn-primary { background: #1a1208; color: #d4b896; border: 1px solid #2a1f0e; }
        .v-btn-primary:hover { border-color: #4a3520; color: #fff; }
        .v-btn-saved { background: rgba(192,82,26,0.1); color: #c0521a; border: 1px solid #c0521a; cursor: default; }

        .v-btn-mutate { position: relative; overflow: hidden; background: linear-gradient(135deg, #c0521a, #7a1810); color: #fff; border: none; box-shadow: 0 4px 18px rgba(192,82,26,0.35); text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
        .v-btn-mutate::before { content: ''; position: absolute; top: 0; left: -120%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: skewX(-20deg); transition: left 0.6s ease; }
        .v-btn-mutate:hover:not(:disabled)::before { left: 130%; }
        .v-btn-mutate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(192,82,26,0.55); filter: brightness(1.08); }
        .v-btn-mutate:active:not(:disabled) { transform: translateY(0); }
        .v-btn-mutate:disabled { opacity: 0.65; cursor: wait; }
        .v-btn-mutate .spin-icon { display: inline-block; animation: v-spin 0.9s linear infinite; }
        @keyframes v-spin { to { transform: rotate(360deg); } }

        .v-matches-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .v-matches-label { font-size: 11px; font-weight: 700; color: #8a6a4a; text-transform: uppercase; letter-spacing: 2px; }
        .v-matches-vibe { font-size: 13px; color: #c0521a; font-style: italic; font-family: 'Crimson Text', serif; }
        .v-masonry { columns: 2; gap: 12px; } @media (min-width: 640px) { .v-masonry { columns: 3; } } @media (min-width: 1024px) { .v-masonry { columns: 4; } }
        .v-spinner { width: 28px; height: 28px; border: 2px solid #1a1208; border-top-color: #c0521a; border-radius: 50%; animation: v-spin 0.8s linear infinite; margin: 30px auto; }
      `}} />

      <header className="v-header">
        <a href="/" className="v-logo">GELBET</a>
        <button className="v-close" onClick={() => router.push("/")}>✕</button>
      </header>

      <div className="v-container">
        <div className="v-imgwrap">
          <img src={src} alt={title} className="v-mainimg" />
        </div>

        <div className="v-actions">
          <div className="v-title">{title}</div>

          {isPinned(currentPhoto) ? (
            <button className="v-btn v-btn-saved">✓ Saved to Archive</button>
          ) : (
            <button className="v-btn v-btn-primary" onClick={() => savePin(currentPhoto)}>Save to Archive</button>
          )}

          <button className="v-btn v-btn-mutate" onClick={handleMutate} disabled={isMutating}>
            {isMutating ? (<><span className="spin-icon">◈</span> Synthesizing...</>) : (<>Mutate 🧬</>)}
          </button>

          {link && link !== "undefined" && <a href={link} target="_blank" rel="noopener noreferrer" className="v-btn v-btn-primary">View Original ↗</a>}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px", borderTop: "1px solid #1a1208" }}>
        <div className="v-matches-head">
          <span className="v-matches-label">Curated Matches</span>
          <span className="v-matches-vibe">{activeVibe.toLowerCase()}</span>
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

        {relatedPhotos.length === 0 && !relatedLoading && <div style={{ textAlign: "center", padding: 60, color: "#4a3520", fontStyle: "italic" }}>No matches found.</div>}
        <div ref={bottomRef}>{relatedLoading && <div className="v-spinner" />}</div>
      </div>

      {showAgeGate && <AgeGateModal onConfirm={() => { setNsfwAllowed(true); try { localStorage.setItem("gelbet_nsfw_18plus", "true"); } catch (e) {} const p = showAgeGate; setShowAgeGate(null); if (p) openPhoto(p); }} onCancel={() => setShowAgeGate(null)} />}
    </div>
  );
}

export default function VibePage() {
  return (
    <Suspense fallback={<div style={{ background: "#050403", minHeight: "100vh" }}></div>}>
      <VibeContent />
    </Suspense>
  );
}
