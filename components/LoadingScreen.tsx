"use client";
import { useEffect, useState } from "react";

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 2800);
    const t4 = setTimeout(() => onDone(), 3500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0d0a06",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      transition: "opacity 0.7s ease",
      opacity: phase === 3 ? 0 : 1,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        @keyframes grain {
          0%, 100% { transform: translate(0,0); }
          10% { transform: translate(-2%,-3%); }
          20% { transform: translate(3%,2%); }
          30% { transform: translate(-1%,4%); }
          40% { transform: translate(4%,-1%); }
          50% { transform: translate(-3%,3%); }
          60% { transform: translate(2%,-4%); }
          70% { transform: translate(-4%,1%); }
          80% { transform: translate(3%,-2%); }
          90% { transform: translate(-2%,4%); }
        }
        @keyframes burnIn {
          0% { opacity: 0; filter: brightness(3) sepia(1); transform: scale(1.05); }
          100% { opacity: 1; filter: brightness(0.7) sepia(0.4) saturate(0.8); transform: scale(1); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.4; }
          94% { opacity: 1; }
          96% { opacity: 0.6; }
          97% { opacity: 1; }
        }
        @keyframes revealText {
          0% { opacity: 0; letter-spacing: 12px; }
          100% { opacity: 1; letter-spacing: 6px; }
        }
        @keyframes lineGrow {
          0% { width: 0; }
          100% { width: 120px; }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .photo-wrap {
          position: relative;
          width: min(340px, 85vw);
          height: min(420px, 60vh);
          overflow: hidden;
          border-radius: 2px;
        }
        .photo-main {
          width: 100%; height: 100%;
          object-fit: cover;
          animation: burnIn 1.2s ease forwards;
          filter: brightness(0.7) sepia(0.4) saturate(0.8);
        }
        .photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(13,10,6,0.2) 0%,
            transparent 30%,
            transparent 60%,
            rgba(13,10,6,0.8) 100%
          );
        }
        .grain-overlay {
          position: absolute; inset: -50%;
          width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
          animation: grain 0.5s steps(1) infinite;
          opacity: 0.4;
          pointer-events: none;
        }
        .vignette {
          position: absolute; inset: 0;
          box-shadow: inset 0 0 80px rgba(13,10,6,0.9);
          animation: flicker 4s infinite;
        }
        .border-frame {
          position: absolute; inset: 8px;
          border: 1px solid rgba(192,82,26,0.3);
          pointer-events: none;
        }
        .corner {
          position: absolute;
          width: 16px; height: 16px;
          border-color: #c0521a;
          border-style: solid;
          border-width: 0;
        }
        .corner-tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
        .corner-tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
        .corner-bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
        .corner-br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }
      `}</style>

      {/* Фото */}
      <div className="photo-wrap" style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.5s" }}>
        <img src="/loading-band.webp" className="photo-main" alt="" />
        <div className="photo-overlay" />
        <div className="grain-overlay" />
        <div className="vignette" />
        <div className="border-frame" />
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />
      </div>

      {/* Текст */}
      <div style={{
        marginTop: 28, textAlign: "center",
        opacity: phase >= 2 ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}>
        <div style={{
          fontFamily: "Cinzel, Georgia, serif",
          fontSize: "clamp(18px, 5vw, 26px)",
          fontWeight: 700,
          color: "#c0521a",
          letterSpacing: "6px",
          textTransform: "uppercase",
          animation: phase >= 2 ? "revealText 0.8s ease forwards" : "none",
          textShadow: "0 0 30px rgba(192,82,26,0.5)",
        }}>
          SCHIELE
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
          marginTop: 10,
        }}>
          <div style={{
            height: 1, background: "#c0521a", opacity: 0.4,
            animation: phase >= 2 ? "lineGrow 0.6s ease forwards" : "none",
          }} className="line-l" />
          <span style={{
            color: "#4a3520", fontSize: 9, letterSpacing: 3,
            fontFamily: "Cinzel, serif", textTransform: "uppercase",
            animation: phase >= 2 ? "fadeUp 0.6s 0.3s ease both" : "none",
          }}>Visual Discovery</span>
          <div style={{
            height: 1, background: "#c0521a", opacity: 0.4,
            animation: phase >= 2 ? "lineGrow 0.6s ease forwards" : "none",
          }} className="line-r" />
        </div>

        <style>{`
          .line-l, .line-r { width: 0; animation: lineGrow 0.6s 0.2s ease forwards !important; }
        `}</style>
      </div>
    </div>
  );
}