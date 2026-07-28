"use client";
import React from "react";

interface PinCardProps {
  photo: { id: string; src: string; thumb?: string; title?: string; link?: string; isNsfw?: boolean };
  nsfwAllowed: boolean;
  isPinned: boolean;
  showSaved?: boolean;
  onClick: () => void;
  onSaveClick: (e: React.MouseEvent) => void;
  onShareClick: (e: React.MouseEvent) => void;
  onRemoveClick?: (e: React.MouseEvent) => void;
}

export default function PinCard({ 
  photo, nsfwAllowed, isPinned, showSaved = false, 
  onClick, onSaveClick, onShareClick, onRemoveClick 
}: PinCardProps) {
  const isBlurred = photo.isNsfw && !nsfwAllowed;

  return (
    <div className="card" onClick={onClick} style={{ cursor: isBlurred ? "pointer" : "zoom-in" }}>
      <img 
        src={photo.thumb || photo.src} 
        alt={photo.title || ""} 
        loading="lazy" 
        style={isBlurred ? { filter: 'blur(35px) brightness(0.6)', transform: 'scale(1.1)' } : {}} 
        onError={e => { const p = (e.currentTarget as HTMLImageElement).parentElement; if (p) p.style.display = "none"; }} 
      />
      
      {isBlurred && <div className="nsfw-badge">18+</div>}
      
      {!isBlurred && (
        <div className="overlay">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className={`save-btn ${isPinned ? "pinned" : ""}`} onClick={onSaveClick}>
              {isPinned ? "Saved" : "Save"}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", gap: 8 }}>
            <button className="card-action-btn" onClick={onShareClick} title="Share">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            {showSaved && onRemoveClick && (
              <button className="card-action-btn" style={{ background: "rgba(229,62,62,0.8)" }} onClick={onRemoveClick}>✕</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}