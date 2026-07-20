"use client";
import { useState, useRef, useEffect } from "react";
import type { Photo, ChatMessage } from "../lib/types";

type Props = {
  onShowResults: (photos: Photo[], query: string) => void;
  onSelectPhoto: (photo: Photo) => void;
};

type Msg = ChatMessage & { photos?: Photo[]; query?: string | null };

const GREETING: Msg = {
  role: "assistant",
  content:
    "I'm the Schiele Muse. Ask me for anything — \u201cshow me Egon Schiele portraits\u201d, \u201cmoody brutalist architecture\u201d, \u201cjazz musicians\u201d\u2026",
};

export default function AIChat({ onShowResults, onSelectPhoto }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.error || "Something went wrong." }]);
      } else {
        const photos: Photo[] = Array.isArray(data.photos) ? data.photos : [];
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply, photos, query: data.query },
        ]);
        if (photos.length > 0 && data.query) onShowResults(photos, data.query);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .muse-fab { position: fixed; bottom: 20px; right: 20px; z-index: 250; width: 54px; height: 54px; border-radius: 50%; border: 1px solid #c0521a; background: #1a1208; color: #c0521a; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(192,82,26,0.35); transition: transform 0.2s, background 0.2s; }
        .muse-fab:hover { transform: scale(1.06); background: #22160a; }
        .muse-panel { position: fixed; bottom: 20px; right: 20px; z-index: 251; width: min(380px, calc(100vw - 32px)); height: min(560px, calc(100vh - 40px)); background: #0d0a06; border: 1px solid #2a1f0e; border-radius: 18px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.7); animation: museUp 0.22s ease; }
        @keyframes museUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .muse-head { padding: 14px 16px; border-bottom: 1px solid #2a1f0e; display: flex; align-items: center; gap: 10px; }
        .muse-title { font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #c0521a; text-transform: uppercase; }
        .muse-sub { font-size: 10px; color: #4a3520; }
        .muse-x { margin-left: auto; background: none; border: none; color: #4a3520; cursor: pointer; font-size: 18px; width: 30px; height: 30px; border-radius: 50%; }
        .muse-x:hover { color: #c0521a; background: #1a1208; }
        .muse-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .muse-msg { max-width: 88%; padding: 10px 13px; border-radius: 14px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
        .muse-msg.user { align-self: flex-end; background: #c0521a; color: #0d0a06; border-bottom-right-radius: 4px; }
        .muse-msg.assistant { align-self: flex-start; background: #1a1208; color: #d4b896; border: 1px solid #2a1f0e; border-bottom-left-radius: 4px; }
        .muse-thumbs { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; max-width: 100%; }
        .muse-thumb { width: 62px; height: 62px; border-radius: 8px; object-fit: cover; cursor: pointer; flex-shrink: 0; border: 1px solid #2a1f0e; transition: transform 0.15s; }
        .muse-thumb:hover { transform: scale(1.05); border-color: #c0521a; }
        .muse-typing { align-self: flex-start; color: #6a4a2a; font-size: 12px; font-style: italic; padding: 4px 6px; }
        .muse-foot { padding: 12px; border-top: 1px solid #2a1f0e; display: flex; gap: 8px; }
        .muse-input { flex: 1; background: #1a1208; border: 1px solid #2a1f0e; border-radius: 20px; padding: 10px 14px; color: #d4b896; font-size: 13px; outline: none; }
        .muse-input:focus { border-color: #c0521a; }
        .muse-send { background: #c0521a; color: #0d0a06; border: none; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; flex-shrink: 0; font-size: 16px; }
        .muse-send:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      {!open && (
        <button className="muse-fab" onClick={() => setOpen(true)} title="Ask the Schiele Muse" aria-label="Open AI assistant">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.6 4.2L18 8.8l-4.4 1.6L12 15l-1.6-4.6L6 8.8l4.4-1.6z" />
            <path d="M18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2-2.2-.8 2.2-.8z" />
          </svg>
        </button>
      )}

      {open && (
        <div className="muse-panel">
          <div className="muse-head">
            <div>
              <div className="muse-title">Schiele Muse</div>
              <div className="muse-sub">AI art & image guide</div>
            </div>
            <button className="muse-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="muse-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                <div className={`muse-msg ${m.role}`}>{m.content}</div>
                {m.photos && m.photos.length > 0 && (
                  <div className="muse-thumbs">
                    {m.photos.slice(0, 10).map((p) => (
                      <img
                        key={p.id}
                        src={p.thumb || p.src}
                        alt={p.title}
                        className="muse-thumb"
                        loading="lazy"
                        onClick={() => onSelectPhoto(p)}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="muse-typing">The Muse is thinking…</div>}
          </div>

          <form className="muse-foot" onSubmit={send}>
            <input
              className="muse-input"
              placeholder="Ask the Muse…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="muse-send" type="submit" disabled={loading || !input.trim()} aria-label="Send">↑</button>
          </form>
        </div>
      )}
    </>
  );
}
