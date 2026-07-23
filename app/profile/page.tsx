"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
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
  
  const [toastMsg, setToastMsg] = useState<{text: string, type: "success" | "error"} | null>(null);
  
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
      
      try {
        const [pinsRes, boardsRes] = await Promise.all([
          fetch(`/api/pins?user_id=${u.id}`),
          fetch(`/api/boards?user_id=${u.id}`)
        ]);
        if (pinsRes.ok) {
          const pinsData = await pinsRes.json();
          if (pinsData.pins) setPins(pinsData.pins);
        }
        if (boardsRes.ok) {
          const boardsData = await boardsRes.json();
          if (boardsData.boards) setBoards(boardsData.boards);
        }
      } catch (e) { console.error(e); }
      
      setLoading(false);
    });
  }, [router]);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  }

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
    setSaving(true);

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
        
      if (uploadError) { 
        showToast(uploadError.message, "error"); 
        setSaving(false); 
        return; 
      }
      
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = data.publicUrl;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name, bio, website, avatar_url: newAvatarUrl }
    });

    if (updateError) {
      showToast(updateError.message, "error");
    } else { 
      showToast("Profile aesthetics updated"); 
      setAvatarUrl(newAvatarUrl); 
      setAvatarFile(null); 
      setAvatarPreview(""); 
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0a06" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #2a1f0e", borderTopColor: "#c0521a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = (name || user?.email || "U")[0].toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#0d0a06", fontFamily: "-apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        
        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,10,6,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid #2a1f0e; padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
        }

        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 700; color: #c0521a; letter-spacing: 4px; }
        
        .hbtn { background: transparent; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6a4a2a; transition: all 0.2s; }
        .hbtn:hover { background: #1a1208; color: #c0521a; }

        .field { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #2a1f0e; background: #1a1208; color: #d4b896; font-size: 14px; outline: none; transition: all 0.2s; font-family: inherit; }
        .field:focus { border-color: #c0521a; box-shadow: 0 0 0 2px rgba(192,82,26,0.1); }
        .field::placeholder { color: #4a3520; }
        
        .primary-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 24px; padding: 14px 24px; cursor: pointer; font-weight: 700; font-size: 14px; width: 100%; transition: all 0.2s; }
        .primary-btn:hover:not(:disabled) { background: #d4621a; transform: translateY(-1px); }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .danger-btn { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; border-radius: 24px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 14px; width: 100%; transition: all 0.2s; }
        .danger-btn:hover { background: rgba(229,62,62,0.1); }

        .tab-btn { flex: 1; padding: 14px; border: none; background: transparent; cursor: pointer; font-size: 13px; font-weight: 600; color: #6a4a2a; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; }
        .tab-btn.active { color: #d4b896; border-bottom-color: #c0521a; }
        .tab-btn:hover:not(.active) { color: #8a6a4a; }
        
        .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (min-width: 480px) { .pin-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; } }
        .pin-thumb { aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #1a1208; cursor: pointer; position: relative; border: 1px solid #2a1f0e; }
        .pin-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .pin-thumb:hover img { transform: scale(1.05); filter: brightness(0.8); }
        
        .board-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #1a1208; border-radius: 16px; border: 1px solid #2a1f0e; transition: all 0.2s; }
        .board-item:hover { border-color: #4a3520; transform: translateY(-2px); }
        .board-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2a1f0e, #1a1208); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #4a3520; }
        
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 700; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .toast.success { background: #c0521a; color: #0d0a06; }
        .toast.error { background: #e53e3e; color: #fff; }
      `}</style>

      <header className="header">
        <button onClick={() => router.push("/")} className="hbtn" title="Back to Explore">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <span className="logo">GELBET</span>
        <button onClick={handleSignOut} className="hbtn" title="Sign Out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", animation: "fadeIn 0.3s ease" }}>

        {/* PROFILE EDIT CARD */}
        <div style={{ background: "#0d0a06", borderRadius: 24, padding: 32, marginBottom: 24, border: "1px solid #2a1f0e", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 32, color: "#d4b896", fontFamily: "Cinzel, serif", letterSpacing: 2, textAlign: "center" }}>Edit Profile</h2>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {displayAvatar
                  ? <img src={displayAvatar} style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "2px solid #4a3520" }} alt="avatar" />
                  : <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#c0521a", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0a06", fontSize: 32, fontWeight: 700, border: "2px solid #2a1f0e" }}>{initials}</div>
                }
                <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "#1a1208", border: "2px solid #0d0a06", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#c0521a"} onMouseOut={e => e.currentTarget.style.background = "#1a1208"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" color="#d4b896"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 18, color: "#d4b896", letterSpacing: 0.5 }}>{name || "Your name"}</p>
                <p style={{ color: "#6a4a2a", fontSize: 13, marginTop: 4 }}>{user?.email}</p>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: "#c0521a", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Change Image
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8a6a4a", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Display Name</label>
              <input className="field" placeholder="Enter your aesthetic name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8a6a4a", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Bio</label>
              <textarea className="field" placeholder="What's your vibe? Tell us about yourself..." value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ resize: "none" }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8a6a4a", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Website / Link</label>
              <input className="field" placeholder="https://yourspace.com" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="submit" disabled={saving} className="primary-btn">
                {saving ? "Saving..." : "Update Aesthetic"}
              </button>
            </div>
          </form>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[["Saved Pins", pins.length], ["Boards", boards.length]].map(([label, count]) => (
            <div key={label as string} style={{ background: "#1a1208", borderRadius: 20, padding: "24px", textAlign: "center", border: "1px solid #2a1f0e" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#c0521a", fontFamily: "Cinzel, serif" }}>{count}</div>
              <div style={{ fontSize: 11, color: "#8a6a4a", marginTop: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CONTENT TABS */}
        <div style={{ background: "#0d0a06", borderRadius: 24, overflow: "hidden", border: "1px solid #2a1f0e" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1a1208", background: "#1a1208" }}>
            <button className={`tab-btn ${tab === "pins" ? "active" : ""}`} onClick={() => setTab("pins")}>Pins</button>
            <button className={`tab-btn ${tab === "boards" ? "active" : ""}`} onClick={() => setTab("boards")}>Boards</button>
          </div>

          <div style={{ padding: 20 }}>
            {tab === "pins" && (
              pins.length === 0
                ? <p style={{ textAlign: "center", color: "#4a3520", padding: "60px 0", fontSize: 15, fontStyle: "italic", fontFamily: "Crimson Text, serif" }}>Your collection is empty.</p>
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
                ? <p style={{ textAlign: "center", color: "#4a3520", padding: "60px 0", fontSize: 15, fontStyle: "italic", fontFamily: "Crimson Text, serif" }}>You haven't curated any boards yet.</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {boards.map(board => (
                      <div key={board.id} className="board-item">
                        <div className="board-icon">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c0521a" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: "#d4b896" }}>{board.name}</div>
                          {board.description && <div style={{ fontSize: 12, color: "#8a6a4a", marginTop: 4 }}>{board.description}</div>}
                          <div style={{ fontSize: 11, color: "#4a3520", marginTop: 6, fontWeight: 600 }}>{pins.filter(p => p.board_id === board.id).length} PINS</div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>
        
        {/* DANGER ZONE */}
        <div style={{ marginTop: 40, padding: "0 16px" }}>
           <button onClick={handleSignOut} className="danger-btn">Log Out Securely</button>
        </div>

      </div>

      {toastMsg && (
        <div className={`toast ${toastMsg.type}`}>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
