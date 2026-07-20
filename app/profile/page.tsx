"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { authHeaders } from "../../lib/authHeaders";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pins, setPins] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [tab, setTab] = useState<"pins" | "boards">("pins");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u) { router.push("/auth"); return; }
      setUser(u);
      setName(u.user_metadata?.full_name || u.user_metadata?.name || "");
      setBio(u.user_metadata?.bio || "");
      setWebsite(u.user_metadata?.website || "");
      setAvatarUrl(u.user_metadata?.avatar_url || "");
      const headers = await authHeaders();
      const [pinsRes, boardsRes] = await Promise.all([
        fetch(`/api/pins`, { headers }),
        fetch(`/api/boards`, { headers })
      ]);
      const pinsData = await pinsRes.json();
      const boardsData = await boardsRes.json();
      if (pinsData.pins) setPins(pinsData.pins);
      if (boardsData.boards) setBoards(boardsData.boards);
      setLoading(false);
    });
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(""); setMessage("");

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) { setError(uploadError.message); setSaving(false); return; }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = data.publicUrl;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name, bio, website, avatar_url: newAvatarUrl }
    });

    if (updateError) setError(updateError.message);
    else { setMessage("Profile saved!"); setAvatarUrl(newAvatarUrl); setAvatarFile(null); setAvatarPreview(""); }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f8" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e0e0e0", borderTopColor: "#c0521a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = (name || user?.email || "U")[0].toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", fontFamily: "-apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .field { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e0e0e0; background: #fafafa; color: #111; font-size: 14px; outline: none; transition: all 0.2s; font-family: -apple-system, sans-serif; box-sizing: border-box; }
        .field:focus { border-color: #c0521a; background: white; box-shadow: 0 0 0 3px rgba(192,82,26,0.1); }
        .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-size: 13px; font-weight: 600; color: #999; border-bottom: 2px solid transparent; transition: all 0.2s; font-family: -apple-system, sans-serif; }
        .tab-btn.active { color: #c0521a; border-bottom-color: #c0521a; }
        .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        @media (min-width: 480px) { .pin-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; } }
        .pin-thumb { aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #f0f0f0; cursor: pointer; }
        .pin-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
        .pin-thumb:hover img { transform: scale(1.05); }
        .board-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border-radius: 12px; border: 1.5px solid #f0f0f0; transition: all 0.2s; }
        .board-item:hover { border-color: #c0521a; }
        .board-icon { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #f0e6dc, #e8d5c4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>

      <header style={{ background: "white", borderBottom: "1px solid #ebebeb", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </a>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 3, fontFamily: "Georgia, serif", color: "#111" }}>
          SCH<span style={{ color: "#c0521a" }}>IE</span>LE
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={handleSignOut} style={{ background: "none", border: "1.5px solid #e0e0e0", borderRadius: 24, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#666" }}>
          Sign out
        </button>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px", animation: "fadeIn 0.3s ease" }}>

        <div style={{ background: "white", borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: "#111" }}>Edit Profile</h2>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 8 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {displayAvatar
                  ? <img src={displayAvatar} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #f0f0f0" }} alt="avatar" />
                  : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#c0521a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 28, fontWeight: 700, border: "3px solid #f0f0f0" }}>{initials}</div>
                }
                <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#111", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{name || "Your name"}</p>
                <p style={{ color: "#999", fontSize: 12, marginTop: 2 }}>{user?.email}</p>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: "#c0521a", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4, fontWeight: 600 }}>
                  Change photo
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 6 }}>Display name</label>
              <input className="field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 6 }}>Bio</label>
              <textarea className="field" placeholder="Tell about yourself..." value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 6 }}>Website</label>
              <input className="field" placeholder="https://yourwebsite.com" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            {error && <p style={{ color: "#e53e3e", fontSize: 13, textAlign: "center" }}>{error}</p>}
            {message && <p style={{ color: "#38a169", fontSize: 13, textAlign: "center" }}>{message}</p>}

            <button type="submit" disabled={saving} style={{ background: "#c0521a", color: "white", border: "none", borderRadius: 24, padding: "13px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14, width: "100%", opacity: saving ? 0.7 : 1, fontFamily: "-apple-system, sans-serif" }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[["Pins", pins.length], ["Boards", boards.length]].map(([label, count]) => (
            <div key={label as string} style={{ background: "white", borderRadius: 16, padding: "20px 24px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#c0521a" }}>{count}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
            <button className={`tab-btn ${tab === "pins" ? "active" : ""}`} onClick={() => setTab("pins")}>Pins</button>
            <button className={`tab-btn ${tab === "boards" ? "active" : ""}`} onClick={() => setTab("boards")}>Boards</button>
          </div>

          <div style={{ padding: 16 }}>
            {tab === "pins" && (
              pins.length === 0
                ? <p style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>No pins yet</p>
                : <div className="pin-grid">
                    {pins.map(pin => (
                      <div key={pin.id} className="pin-thumb">
                        <img src={pin.image_url} alt={pin.title} loading="lazy" />
                      </div>
                    ))}
                  </div>
            )}

            {tab === "boards" && (
              boards.length === 0
                ? <p style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>No boards yet</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {boards.map(board => (
                      <div key={board.id} className="board-item">
                        <div className="board-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{board.name}</div>
                          {board.description && <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{board.description}</div>}
                          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{pins.filter(p => p.board_id === board.id).length} pins</div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: 20, background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#999", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Account</p>
          <button onClick={handleSignOut} style={{ width: "100%", padding: "12px 24px", background: "transparent", border: "1.5px solid #e0e0e0", borderRadius: 24, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#666", fontFamily: "-apple-system, sans-serif" }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}