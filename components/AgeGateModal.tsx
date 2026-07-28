"use client";
import React from "react";

interface AgeGateModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeGateModal({ onConfirm, onCancel }: AgeGateModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: "#0d0a06", border: "1px solid #c0521a", borderRadius: 16, 
          padding: 40, maxWidth: 420, width: "100%", display: "flex", 
          flexDirection: "column", gap: 20, textAlign: "center", 
          boxShadow: "0 0 60px rgba(192,82,26,0.15)",
          animation: "slideUp 0.3s ease"
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="1.5" style={{ margin: "0 auto" }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <text x="12" y="16" fontSize="9" textAnchor="middle" fill="#c0521a" fontWeight="bold" fontFamily="sans-serif">18+</text>
        </svg>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2 }}>
          SENSITIVE CONTENT
        </h2>
        <p style={{ color: "#8a6a4a", fontSize: 14, lineHeight: 1.6 }}>
          This visual contains mature or explicit imagery not suitable for all audiences. Are you over 18 years old?
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          <button className="ghost-btn" style={{ flex: 1 }} onClick={onCancel}>Go Back</button>
          <button className="primary-btn" style={{ flex: 1.5 }} onClick={onConfirm}>I am 18+</button>
        </div>
      </div>
    </div>
  );
}