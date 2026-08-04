"use client";
import { useState, useEffect, useRef } from "react";

const SYNTH_USERS = [
    { id: "", name: "Real User (You)", query: "", color: "#8a6a4a", desc: "No AI memory" },
    { id: "synth-001-dark-academia", name: "Victoria", query: "Dark Academia Library", color: "#8b5a2b", desc: "Dark Academia" },
    { id: "synth-002-cyberpunk", name: "Max", query: "Cyberpunk City Neon", color: "#00ffcc", desc: "Cyberpunk" },
    { id: "synth-003-minimalist", name: "Elena", query: "Minimalist Architecture White", color: "#f5f5dc", desc: "Minimalism" },
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
        
        if (user.id && user.query) {
            const searchUrl = `/?q=${encodeURIComponent(user.query)}&mode=kashmir`;
            window.location.href = searchUrl;
        } else {
            window.location.href = "/";
        }
    };

    if (!isMounted) return null;

    const activeData = SYNTH_USERS.find(u => u.id === synthUser) || SYNTH_USERS[0];

    const WaveIcon = ({ active, color }: { active: boolean, color: string }) => (
        <div className="wave-icon" style={{ '--wave-color': color } as React.CSSProperties}>
            <div className={`bar ${active ? 'active' : ''}`} style={{ animationDelay: '0.0s' }}></div>
            <div className={`bar ${active ? 'active' : ''}`} style={{ animationDelay: '0.2s' }}></div>
            <div className={`bar ${active ? 'active' : ''}`} style={{ animationDelay: '0.4s' }}></div>
            <div className={`bar ${active ? 'active' : ''}`} style={{ animationDelay: '0.6s' }}></div>
        </div>
    );

    return (
        <div ref={menuRef} style={{ position: "fixed", bottom: 30, right: 30, zIndex: 99999 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .kashmir-core-container { position: relative; display: flex; align-items: center; justify-content: center; }
                
                /* Darker animated sphere */
                .kashmir-sphere {
                    width: 50px; height: 50px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%, #4a2511, #1a0f08, #000000);
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.8), inset -5px -5px 15px rgba(0,0,0,0.9);
                    cursor: pointer;
                    animation: pulseSphereDark 4s infinite alternate;
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    z-index: 10;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(227, 179, 120, 0.1);
                }
                .kashmir-sphere:hover { transform: scale(1.1); box-shadow: 0 0 25px rgba(192, 82, 26, 0.3); }
                .kashmir-sphere:active { transform: scale(0.95); }
                
                .kashmir-pupil-dark {
                    width: 6px; height: 6px;
                    background: #c0521a;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #c0521a, 0 0 20px #e3b378;
                    animation: blinkPupilDark 3s infinite;
                }

                @keyframes pulseSphereDark {
                    0% { box-shadow: 0 0 10px rgba(0,0,0, 0.9), inset -5px -5px 15px rgba(0,0,0,0.9); }
                    100% { box-shadow: 0 0 20px rgba(192, 82, 26, 0.2), inset -2px -2px 10px rgba(0,0,0,0.8); filter: brightness(1.1); }
                }
                @keyframes blinkPupilDark {
                    0%, 90%, 100% { transform: scale(1); opacity: 0.8; }
                    95% { transform: scale(0.2); opacity: 0.2; }
                }

                /* Dropdown menu */
                .kashmir-menu {
                    position: absolute;
                    bottom: 70px; right: 0;
                    background: rgba(8, 6, 4, 0.95);
                    backdrop-filter: blur(16px);
                    border: 1px solid #1a1208;
                    border-radius: 12px;
                    width: 240px;
                    padding: 8px;
                    transform-origin: bottom right;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0; transform: scale(0.8) translateY(20px);
                    pointer-events: none;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.95);
                }
                .kashmir-menu.open {
                    opacity: 1; transform: scale(1) translateY(0);
                    pointer-events: auto;
                }

                .kashmir-user-row {
                    display: flex; align-items: center; gap: 16px;
                    padding: 10px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    background: transparent;
                }
                .kashmir-user-row:hover { background: rgba(192, 82, 26, 0.05); }
                .kashmir-user-row.active { background: rgba(192, 82, 26, 0.1); border-color: rgba(192, 82, 26, 0.2); }
                
                .kashmir-header {
                    font-family: 'Cinzel', serif; font-size: 10px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 4px;
                    color: #8a6a4a; text-align: center; margin: 8px 0 12px 0;
                    border-bottom: 1px solid #150f08; padding-bottom: 12px;
                }

                /* Wave Icon Styles */
                .wave-icon {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    height: 16px;
                }
                .wave-icon .bar {
                    width: 2px;
                    height: 4px;
                    background-color: var(--wave-color);
                    border-radius: 2px;
                    opacity: 0.3;
                    transition: height 0.2s, opacity 0.2s;
                }
                .wave-icon .bar.active {
                    animation: waveAnim 1.2s ease-in-out infinite;
                    opacity: 1;
                }
                
                @keyframes waveAnim {
                    0%, 100% { height: 4px; }
                    50% { height: 16px; }
                }
            `}} />

            <div className="kashmir-core-container">
                <div className={`kashmir-menu ${isOpen ? "open" : ""}`}>
                    <div className="kashmir-header">Kashmir Core</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {SYNTH_USERS.map(user => (
                            <div 
                                key={user.id} 
                                className={`kashmir-user-row ${synthUser === user.id ? "active" : ""}`}
                                onClick={() => switchUser(user)}
                            >
                                <WaveIcon active={synthUser === user.id} color={synthUser === user.id ? "#c0521a" : "#4a3520"} />
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ color: synthUser === user.id ? "#d4b896" : "#8a6a4a", fontSize: "13px", fontWeight: 500, fontFamily: "sans-serif", transition: "color 0.2s" }}>{user.name}</span>
                                    <span style={{ color: "#5a4a3a", fontSize: "10px", fontStyle: "italic", fontFamily: "'Crimson Text', serif" }}>{user.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="kashmir-sphere" onClick={() => setIsOpen(!isOpen)} title={`Current: ${activeData.name}`}>
                    <div className="kashmir-pupil-dark"></div>
                </div>
            </div>
        </div>
    );
}