"use client";
import { useState, useEffect, useRef } from "react";

const SYNTH_USERS = [
    { id: "", name: "Real User (You)", query: "", icon: "👤", color: "#8a6a4a", desc: "No AI memory" },
    { id: "synth-001-dark-academia", name: "Victoria", query: "Dark Academia Library", icon: "🔮", color: "#8b5a2b", desc: "Dark Academia" },
    { id: "synth-002-cyberpunk", name: "Max", query: "Cyberpunk City Neon", icon: "⚡", color: "#00ffcc", desc: "Cyberpunk" },
    { id: "synth-003-minimalist", name: "Elena", query: "Minimalist Architecture White", icon: "🤍", color: "#f5f5dc", desc: "Minimalism" },
];

export default function KashmirDevMenu() {
    const [synthUser, setSynthUser] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
        const savedUser = localStorage.getItem("kashmir_synth_user") || "";
        setSynthUser(savedUser);

        // ХАК СОЗДАТЕЛЯ: Перехватчик запросов
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            let [resource, config] = args;
            if (typeof resource === "string" && resource.includes("/api/search")) {
                const devUser = localStorage.getItem("kashmir_synth_user");
                if (devUser) {
                    const url = new URL(resource, window.location.origin);
                    url.searchParams.set("userId", devUser);
                    resource = url.toString();
                }
            }
            return originalFetch(resource, config);
        };

        // Закрытие по клику вне меню
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const switchUser = (user: typeof SYNTH_USERS[0]) => {
        localStorage.setItem("kashmir_synth_user", user.id);
        setSynthUser(user.id);
        setIsOpen(false);
        
        // Магия: автоматический редирект на вайб юзера с принудительным включением Kashmir-режима
        if (user.id && user.query) {
            window.location.href = `/?q=${encodeURIComponent(user.query)}&mode=kashmir`;
        } else {
            window.location.href = "/";
        }
    };

    if (!isMounted) return null;

    const activeData = SYNTH_USERS.find(u => u.id === synthUser) || SYNTH_USERS[0];

    return (
        <div ref={menuRef} style={{ position: "fixed", bottom: 30, right: 30, zIndex: 99999 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .kashmir-core-container { position: relative; display: flex; align-items: center; justify-content: center; }
                
                /* Анимированная сфера */
                .kashmir-sphere {
                    width: 56px; height: 56px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%, #e3b378, #c0521a, #050403);
                    box-shadow: 0 0 20px rgba(192, 82, 26, 0.4), inset -10px -10px 20px rgba(0,0,0,0.8);
                    cursor: pointer;
                    animation: pulseSphere 3s infinite alternate;
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    z-index: 10;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(227, 179, 120, 0.3);
                }
                .kashmir-sphere:hover { transform: scale(1.1); }
                .kashmir-sphere:active { transform: scale(0.95); }
                
                /* Внутреннее свечение (зрачок) */
                .kashmir-pupil {
                    width: 12px; height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    box-shadow: 0 0 15px #fff, 0 0 30px #e3b378;
                    animation: blinkPupil 4s infinite;
                }

                @keyframes pulseSphere {
                    0% { box-shadow: 0 0 15px rgba(192, 82, 26, 0.3), inset -10px -10px 20px rgba(0,0,0,0.8); }
                    100% { box-shadow: 0 0 35px rgba(227, 179, 120, 0.7), inset -5px -5px 15px rgba(0,0,0,0.6); filter: brightness(1.2); }
                }
                @keyframes blinkPupil {
                    0%, 90%, 100% { transform: scale(1); opacity: 1; }
                    95% { transform: scale(0.1); opacity: 0.5; }
                }

                /* Выпадающее меню */
                .kashmir-menu {
                    position: absolute;
                    bottom: 80px; right: 0;
                    background: rgba(10, 8, 6, 0.85);
                    backdrop-filter: blur(16px);
                    border: 1px solid #3a2512;
                    border-radius: 16px;
                    width: 260px;
                    padding: 8px;
                    transform-origin: bottom right;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0; transform: scale(0.8) translateY(20px);
                    pointer-events: none;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.9);
                }
                .kashmir-menu.open {
                    opacity: 1; transform: scale(1) translateY(0);
                    pointer-events: auto;
                }

                .kashmir-user-row {
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 16px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .kashmir-user-row:hover { background: rgba(192, 82, 26, 0.1); border-color: rgba(192, 82, 26, 0.3); }
                .kashmir-user-row.active { background: rgba(192, 82, 26, 0.15); border-color: #c0521a; }
                
                .kashmir-header {
                    font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 3px;
                    color: #c0521a; text-align: center; margin: 12px 0;
                    border-bottom: 1px solid #2a1a0d; padding-bottom: 12px;
                }
            `}} />

            <div className="kashmir-core-container">
                <div className={`kashmir-menu ${isOpen ? "open" : ""}`}>
                    <div className="kashmir-header">Kashmir Neural Core</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {SYNTH_USERS.map(user => (
                            <div 
                                key={user.id} 
                                className={`kashmir-user-row ${synthUser === user.id ? "active" : ""}`}
                                onClick={() => switchUser(user)}
                            >
                                <span style={{ fontSize: "20px", textShadow: `0 0 10px ${user.color}` }}>{user.icon}</span>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ color: "#d4b896", fontSize: "14px", fontWeight: 600, fontFamily: "sans-serif" }}>{user.name}</span>
                                    <span style={{ color: "#8a6a4a", fontSize: "11px", fontStyle: "italic", fontFamily: "'Crimson Text', serif" }}>{user.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ядро */}
                <div className="kashmir-sphere" onClick={() => setIsOpen(!isOpen)} title={`Current: ${activeData.name}`}>
                    <div className="kashmir-pupil"></div>
                </div>
            </div>
        </div>
    );
}