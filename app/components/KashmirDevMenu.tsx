"use client";
import { useState, useEffect, useRef } from "react";

const SYNTH_USERS = [
    { id: "", name: "Real User (You)", query: "aesthetic", color: "#8a6a4a", desc: "No AI memory" },
    { id: "synth-001-dark-academia", name: "Victoria", query: "library", color: "#8b5a2b", desc: "Dark Academia" },
    { id: "synth-002-cyberpunk", name: "Max", query: "neon city", color: "#00ffcc", desc: "Cyberpunk" },
    { id: "synth-003-minimalist", name: "Elena", query: "white room", color: "#f5f5dc", desc: "Minimalism" },
    { id: "synth-004-cottagecore", name: "Oliver", query: "cottage", color: "#7ba05b", desc: "Cottagecore" },
    { id: "synth-005-vaporwave", name: "Luna", query: "mall", color: "#ff71ce", desc: "Vaporwave & Y2K" },
    { id: "synth-006-dark-fantasy", name: "Raven", query: "castle", color: "#4a0e4e", desc: "Dark Fantasy" },
    { id: "synth-007-noir", name: "Vincent", query: "detective", color: "#a9a9a9", desc: "Cinematic Noir" },
    { id: "synth-008-textile-art", name: "Iris", query: "fabric", color: "#d2b48c", desc: "Textile & Embroidery" },
    { id: "synth-009-blueprint", name: "Arthur", query: "structure", color: "#4682b4", desc: "Technical Blueprints" },
    { id: "synth-010-terminal", name: "Ctrl", query: "server", color: "#39ff14", desc: "Terminal & CLI" },
    { id: "synth-011-zoso", name: "Jimmy", query: "guitar", color: "#5c3a21", desc: "Occult Psychedelia" },
    { id: "synth-012-golden-god", name: "Robert", query: "forest", color: "#e3b378", desc: "Celtic Myth & Fantasy" },
    { id: "synth-013-maestro", name: "Jonesy", query: "studio", color: "#3e4a59", desc: "Studio Elegance" },
    { id: "synth-014-bonzo", name: "Bonzo", query: "engine", color: "#8a1c1c", desc: "Thunderous Power" }
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
        <div ref={menuRef} style={{ position: "fixed", bottom: 30, right: 30, zIndex: 99999 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .kashmir-core-container { position: relative; display: flex; align-items: center; justify-content: center; }
                .kashmir-sphere {
                    width: 50px; height: 50px; border-radius: 50%;
                    background: linear-gradient(270deg, #0a0604, #3a1508, #a04010, #0a0604); background-size: 600% 600%;
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.9), inset -5px -5px 15px rgba(0,0,0,0.9);
                    cursor: pointer; animation: ambientFlow 6s ease infinite, pulseSphereDark 4s infinite alternate;
                    position: relative; z-index: 10; border: 1px solid rgba(227, 179, 120, 0.05);
                }
                .kashmir-sphere:hover { transform: scale(1.1); }
                @keyframes ambientFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes pulseSphereDark { 0% { box-shadow: 0 0 10px rgba(0,0,0, 0.9), inset -5px -5px 15px rgba(0,0,0,0.9); } 100% { box-shadow: 0 0 25px rgba(192, 82, 26, 0.25), inset -2px -2px 10px rgba(0,0,0,0.8); } }
                
                .kashmir-menu {
                    position: absolute; bottom: 70px; right: 0; background: rgba(8, 6, 4, 0.95); backdrop-filter: blur(16px);
                    border: 1px solid #1a1208; border-radius: 12px; width: 260px; padding: 8px;
                    transform-origin: bottom right; transition: all 0.4s; opacity: 0; transform: scale(0.8) translateY(20px); pointer-events: none;
                    max-height: 60vh; overflow-y: auto;
                }
                .kashmir-menu::-webkit-scrollbar { width: 4px; }
                .kashmir-menu::-webkit-scrollbar-track { background: transparent; }
                .kashmir-menu::-webkit-scrollbar-thumb { background: #2a1f0e; border-radius: 4px; }
                .kashmir-menu::-webkit-scrollbar-thumb:hover { background: #c0521a; }
                
                .kashmir-menu.open { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
                .kashmir-user-row { display: flex; align-items: center; gap: 16px; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .kashmir-user-row:hover { background: rgba(192, 82, 26, 0.05); }
                .kashmir-user-row.active { background: rgba(192, 82, 26, 0.1); border-color: rgba(192, 82, 26, 0.2); }
                .kashmir-header { font-family: 'Cinzel', serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; color: #8a6a4a; text-align: center; margin: 8px 0 12px 0; border-bottom: 1px solid #150f08; padding-bottom: 12px; }
            `}} />
            <div className="kashmir-core-container">
                <div className={`kashmir-menu ${isOpen ? "open" : ""}`}>
                    <div className="kashmir-header">Kashmir Core</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {SYNTH_USERS.map(user => (
                            <div key={user.id} className={`kashmir-user-row ${synthUser === user.id ? "active" : ""}`} onClick={() => switchUser(user)}>
                                <div style={{ display: "flex", flexDirection: "column", borderLeft: synthUser === user.id ? `2px solid ${user.color}` : "2px solid transparent", paddingLeft: "10px", transition: "border-color 0.2s" }}>
                                    <span style={{ color: synthUser === user.id ? "#d4b896" : "#8a6a4a", fontSize: "13px", fontWeight: 500 }}>{user.name}</span>
                                    <span style={{ color: "#5a4a3a", fontSize: "10px", fontStyle: "italic" }}>{user.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="kashmir-sphere" onClick={() => setIsOpen(!isOpen)} title={`Active: ${activeData.name}`}></div>
            </div>
        </div>
    );
}
