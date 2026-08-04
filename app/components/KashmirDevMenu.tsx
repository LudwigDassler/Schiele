"use client";
import { useState, useEffect } from "react";

export default function KashmirDevMenu() {
    const [synthUser, setSynthUser] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedUser = localStorage.getItem("kashmir_synth_user") || "";
        setSynthUser(savedUser);

        // ХАК СОЗДАТЕЛЯ: Перехватываем все запросы к API и подшиваем ID синтетического юзера
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
    }, []);

    const switchUser = (id: string) => {
        localStorage.setItem("kashmir_synth_user", id);
        setSynthUser(id);
        window.location.reload();
    };

    if (!isMounted) return null;

    return (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "rgba(5,4,3,0.95)", border: "1px solid #c0521a", padding: "16px", borderRadius: "8px", zIndex: 99999, color: "#d4b896", fontSize: "13px", backdropFilter: "blur(12px)", boxShadow: "0 20px 50px rgba(0,0,0,0.9)" }}>
            <div style={{ marginBottom: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "3px", color: "#c0521a", fontFamily: "Cinzel, serif", textAlign: "center" }}>Kashmir Lab</div>
            <select 
                value={synthUser} 
                onChange={(e) => switchUser(e.target.value)}
                style={{ background: "#0d0a06", color: "#d4b896", border: "1px solid #2a1f0e", padding: "8px 12px", borderRadius: "4px", width: "100%", outline: "none", cursor: "pointer", fontFamily: "'Crimson Text', serif", fontSize: "14px" }}
            >
                <option value="">👤 Real User (You)</option>
                <option value="synth-001-dark-academia">🔮 Victoria (Dark Academia)</option>
                <option value="synth-002-cyberpunk">⚡ Max (Cyberpunk)</option>
                <option value="synth-003-minimalist">🤍 Elena (Minimalist)</option>
            </select>
        </div>
    );
}