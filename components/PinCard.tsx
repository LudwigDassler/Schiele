import React, { useState } from "react";

export default function PinCard({ photo, nsfwAllowed, isPinned, showSaved, onClick, onSaveClick, onRemoveClick, onShareClick }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const isBlurred = photo.isNsfw && !nsfwAllowed;

  return (
    <div
      style={{ position: "relative", marginBottom: 12, breakInside: "avoid", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "#1a1208", border: "1px solid #1a1208", transition: "border-color 0.3s" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={photo.thumb || photo.src}
        alt={photo.title}
        style={{ width: "100%", display: "block", filter: isBlurred ? "blur(20px) brightness(0.7)" : "none", transition: "filter 0.3s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)", transform: isHovered && !isBlurred ? "scale(1.03)" : "scale(1)" }}
      />

      {isHovered && !isBlurred && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,10,6,0.85) 0%, transparent 40%, rgba(13,10,6,0.3) 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14, opacity: 1, animation: "fadeIn 0.2s ease" }}>
          
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onShareClick} style={{ background: "rgba(13,10,6,0.6)", border: "none", color: "#d4b896", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)", transition: "all 0.2s" }} title="Share">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
            <div style={{ color: "#d4b896", fontSize: 13, fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
              {photo.title}
            </div>

            {showSaved ? (
              <button onClick={onRemoveClick} style={{ background: "rgba(229,62,62,0.8)", border: "none", color: "#fff", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", transition: "background 0.2s", flexShrink: 0 }} title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ) : (
              <button onClick={onSaveClick} style={{ background: isPinned ? "#c0521a" : "rgba(13,10,6,0.6)", border: "none", color: isPinned ? "#0d0a06" : "#d4b896", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)", transition: "all 0.2s", flexShrink: 0 }} title="Save">
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {isBlurred && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,4,3,0.4)" }}>
          <div style={{ background: "rgba(13,10,6,0.85)", padding: "8px 16px", borderRadius: 4, color: "#c0521a", fontSize: 11, fontFamily: "Cinzel, serif", fontWeight: 700, letterSpacing: 2, backdropFilter: "blur(6px)", border: "1px solid #2a1f0e" }}>RESTRICTED</div>
        </div>
      )}
    </div>
  );
}