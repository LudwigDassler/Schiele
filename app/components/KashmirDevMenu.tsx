"use client";
import { useState, useEffect, useRef } from "react";

const SYNTH_USERS = [
    { id: "", name: "Real User (You)", query: "aesthetic", color: "#737373", desc: "No AI memory" },
    { id: "synth-001-dark-academia", name: "Victoria", query: "library", color: "#8c7362", desc: "Dark Academia" },
    { id: "synth-002-cyberpunk", name: "Max", query: "neon city", color: "#ff0055", desc: "Cyberpunk" },
    { id: "synth-003-minimalist", name: "Elena", query: "white room", color: "#ffffff", desc: "Minimalism" },
    { id: "synth-004-cottagecore", name: "Oliver", query: "cottage", color: "#16a34a", desc: "Cottagecore" },
    { id: "synth-005-vaporwave", name: "Luna", query: "mall", color: "#d946ef", desc: "Vaporwave & Y2K" },
    { id: "synth-006-dark-fantasy", name: "Raven", query: "castle", color: "#581c87", desc: "Dark Fantasy" },
    { id: "synth-007-noir", name: "Vincent", query: "detective", color: "#a9a9a9", desc: "Cinematic Noir" },
    { id: "synth-008-textile-art", name: "Iris", query: "fabric", color: "#0d9488", desc: "Textile & Embroidery" },
    { id: "synth-009-blueprint", name: "Arthur", query: "structure", color: "#3b82f6", desc: "Technical Blueprints" },
    { id: "synth-010-terminal", name: "Elliot", query: "server", color: "#22c55e", desc: "Paranoid Sysadmin" },
    { id: "synth-011-zoso", name: "Jimmy", query: "guitar", color: "#d97706", desc: "Occult Alchemist" },
    { id: "synth-012-golden-god", name: "Robert", query: "forest", color: "#059669", desc: "Celtic Mystic" },
    { id: "synth-013-maestro", name: "Jonesy", query: "studio", color: "#64748b", desc: "Structural Genius" },
    { id: "synth-014-bonzo", name: "Bonzo", query: "engine", color: "#ea580c", desc: "Kinetic Juggernaut" }
];

export default function KashmirDevMenu() {
    const [synthUser, setSynthUser] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        setSynthUser(localStorage.getItem("kashmir_synth_user") || "");

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const switchUser = (user: typeof SYNTH_USERS[0]) => {
        document.cookie = `kashmir_synth_user=${user.id}; path=/; max-age=31536000`;
        localStorage.setItem("kashmir_synth_user", user.id);
        
        const mode = user.id ? "kashmir" : "classic";
        window.location.href = `/?q=${encodeURIComponent(user.query)}&mode=${mode}&userId=${user.id}&_cb=${Date.now()}`;
    };

    if (!isMounted) return null;

    const activeData = SYNTH_USERS.find(u => u.id === synthUser) || SYNTH_USERS[0];

    return (
        <div ref={menuRef} style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .kashmir-pill {
                    display: flex; align-items: center; gap: 12px; padding: 10px 20px; border-radius: 9999px;
                    background: rgba(5, 3, 8, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(168,85,247,0.15); cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .kashmir-pill:hover { border-color: rgba(255,255,255,0.3); transform: translateY(-3px); box-shadow: -10px 0 20px rgba(255,0,85,0.2), 0 0 20px rgba(0,255,0,0.1), 10px 0 20px rgba(0,255,255,0.2); }
                
                .kashmir-indicator { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; animation: pulse 2s infinite alternate; }
                .kashmir-label { font-family: 'Syncopate', sans-serif; font-size: 10px; font-weight: 700; color: #fff; letter-spacing: 2px; text-transform: uppercase; }
                
                .kashmir-popup {
                    position: absolute; bottom: calc(100% + 16px); background: rgba(5, 3, 8, 0.95); backdrop-filter: blur(30px);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; width: 320px; padding: 12px;
                    transform-origin: bottom center; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0; transform: scale(0.9) translateY(20px); pointer-events: none;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.9), 0 0 40px rgba(168,85,247,0.15);
                }
                .kashmir-popup.open { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
                
                .kashmir-scroll-area { max-height: 50vh; overflow-y: auto; padding-right: 4px; }
                .kashmir-scroll-area::-webkit-scrollbar { width: 4px; }
                .kashmir-scroll-area::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                .kashmir-scroll-area::-webkit-scrollbar-thumb:hover { background: #a855f7; }
                
                .kashmir-row { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .kashmir-row:hover { background: rgba(255,255,255,0.05); transform: translateX(4px); }
                .kashmir-row.active { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); }
                
                @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1.2); } }
            `}} />
            
            <div className={`kashmir-popup ${isOpen ? "open" : ""}`}>
                <div style={{ fontFamily: "'Syncopate', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "4px", color: "#888", textAlign: "center", marginBottom: "16px", marginTop: "8px", textTransform: "uppercase" }}>
                    Select Identity
                </div>
                <div className="kashmir-scroll-area">
                    {SYNTH_USERS.map(user => (
                        <div key={user.id} className={`kashmir-row ${synthUser === user.id ? "active" : ""}`} onClick={() => switchUser(user)}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: user.color, boxShadow: `0 0 10px ${user.color}` }}></div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: synthUser === user.id ? "#fff" : "#ccc", fontSize: "13px", fontWeight: 700, fontFamily: "'Syncopate', sans-serif", letterSpacing: "1px", textTransform: "uppercase" }}>{user.name}</span>
                                <span style={{ color: "#666", fontSize: "11px", fontStyle: "italic", fontFamily: "'Inter', sans-serif", marginTop: "2px" }}>{user.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="kashmir-pill" onClick={() => setIsOpen(!isOpen)}>
                <div className="kashmir-indicator" style={{ backgroundColor: activeData.color }}></div>
                <span className="kashmir-label">{activeData.name}</span>
            </div>
        </div>
    );
}
