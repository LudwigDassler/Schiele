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
      showToast("Aesthetic matrix updated"); 
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
    <div className="min-h-screen bg-[#020104] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/10 border-t-[#a855f7] rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.5)]"></div>
    </div>
  );

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = (name || user?.email || "U")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#020104] text-white font-sans overflow-x-hidden relative pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #020104; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        
        @keyframes ooze { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(10%, -10%) scale(1.1); } }
        @keyframes volvelle-spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .header { position: sticky; top: 0; z-index: 100; background: rgba(2, 1, 4, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-family: 'Syncopate', sans-serif; font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 0.3em; cursor: pointer; user-select: none; text-shadow: 0 0 10px rgba(255,255,255,0.2); transition: all 0.3s; }
        .logo:hover { text-shadow: -3px 0 10px rgba(255,0,85,0.5), 0 0 10px rgba(0,255,0,0.5), 3px 0 10px rgba(0,255,255,0.5); }
        
        .hbtn { background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #888; transition: all 0.3s ease; } 
        .hbtn:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.5); } 
        
        .prism-focus:focus-within { box-shadow: -10px 0 30px rgba(255,0,85,0.2), 0 0 30px rgba(0,255,0,0.1), 10px 0 30px rgba(0,255,255,0.2); border-color: rgba(255,255,255,0.4); }
        .field { width: 100%; padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; outline: none; transition: all 0.3s ease; font-family: 'Inter', sans-serif; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); } 
        .field:focus { border-color: #a855f7; background: rgba(168,85,247,0.05); } 
        .field::placeholder { color: rgba(255,255,255,0.2); }

        .primary-btn { background: #fff; color: #000; border: none; border-radius: 8px; padding: 16px 32px; cursor: pointer; font-weight: 700; font-size: 12px; width: 100%; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); text-transform: uppercase; letter-spacing: 2px; font-family: 'Syncopate', sans-serif; box-shadow: 0 10px 20px rgba(255,255,255,0.1); } 
        .primary-btn:hover:not(:disabled) { background: #ccc; transform: translateY(-2px); box-shadow: 0 15px 30px rgba(255,255,255,0.2); } 
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        
        .danger-btn { background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 14px 28px; cursor: pointer; font-weight: 700; font-size: 12px; width: 100%; transition: all 0.3s; font-family: 'Syncopate', sans-serif; letter-spacing: 2px; text-transform: uppercase; }
        .danger-btn:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.2); }

        .tab-btn { flex: 1; padding: 16px; border: none; background: transparent; cursor: pointer; font-size: 12px; font-weight: 700; color: #666; border-bottom: 2px solid transparent; transition: all 0.3s; text-transform: uppercase; letter-spacing: 2px; font-family: 'Syncopate', sans-serif; }
        .tab-btn.active { color: #fff; border-bottom-color: #a855f7; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
        .tab-btn:hover:not(.active) { color: #aaa; }

        .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (min-width: 640px) { .pin-grid { grid-template-columns: repeat(4, 1fr); } }
        .pin-thumb { aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: #111; cursor: pointer; position: relative; border: 1px solid rgba(255,255,255,0.05); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .pin-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
        .pin-thumb:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.2); box-shadow: -10px 0 20px rgba(255,0,85,0.2), 0 0 20px rgba(0,255,0,0.1), 10px 0 20px rgba(0,255,255,0.2); }
        .pin-thumb:hover img { transform: scale(1.1); filter: brightness(0.7); }

        .board-item { display: flex; align-items: center; gap: 20px; padding: 20px; background: rgba(20,20,20,0.6); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); backdrop-filter: blur(10px); }
        .board-item:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0,0,0,0.8), 0 0 20px rgba(168,85,247,0.1); }
        .board-icon { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #111, #000); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
        
        .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); padding: 16px 32px; border-radius: 9999px; font-size: 11px; font-weight: 700; z-index: 9999; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 20px 50px rgba(0,0,0,0.9); font-family: 'Syncopate', sans-serif; letter-spacing: 2px; text-transform: uppercase; backdrop-filter: blur(20px); }
        .toast.success { background: rgba(5,3,8,0.95); border: 1px solid rgba(168,85,247,0.3); color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(168,85,247,0.2); }
        .toast.error { background: rgba(5,3,8,0.95); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(239,68,68,0.2); }
      `}} />

      {/* Cosmic + LZ III Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020104]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,10,40,0.5)_0%,_rgba(2,1,4,1)_100%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] border-[1px] border-white/5 rounded-full opacity-30 animate-[volvelle-spin_120s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#a855f7]/10 rounded-full blur-[120px] animate-[ooze_15s_ease-in-out_infinite]"></div>
      </div>

      <header className="header">
        <button onClick={() => router.push("/")} className="hbtn" title="Back to Explore">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <span className="logo">GELBET</span>
        <button onClick={handleSignOut} className="hbtn" title="Disconnect">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      <div className="w-full max-w-4xl mx-auto mt-10 px-4 md:px-8 relative z-10" style={{ animation: "fadeIn 0.5s ease" }}>

        {/* PROFILE EDIT CARD */}
        <div className="bg-[#050308]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-14 mb-10 shadow-[0_30px_80px_rgba(0,0,0,0.9),_0_0_40px_rgba(168,85,247,0.1)]">
          <h2 className="text-xl md:text-2xl font-syncopate font-bold text-white tracking-[0.3em] uppercase text-center mb-12 text-shadow-[0_0_20px_rgba(255,255,255,0.3)]">Identity</h2>

          <form onSubmit={handleSave} className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-4">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="absolute -inset-2 border-[1px] border-[#a855f7]/30 rounded-full opacity-0 group-hover:opacity-100 animate-[volvelle-spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                {displayAvatar
                  ? <img src={displayAvatar} className="relative z-10 w-28 h-28 rounded-full object-cover border-[1px] border-white/20 group-hover:border-[#a855f7] transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]" alt="avatar" />
                  : <div className="relative z-10 w-28 h-28 rounded-full bg-black/50 border-[1px] border-white/20 flex items-center justify-center text-4xl font-syncopate font-bold text-[#555] group-hover:border-[#a855f7] group-hover:text-white transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]">{initials}</div>
                }
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0a0a0a] border border-white/20 flex items-center justify-center text-[#888] z-20 group-hover:text-white group-hover:bg-[#a855f7] transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </div>
              
              <div className="flex-1 w-full space-y-6">
                <div className="prism-focus rounded-xl transition-all duration-300">
                  <label className="block text-[10px] font-syncopate font-bold tracking-[0.2em] text-[#666] mb-3 uppercase pl-2">Display Name</label>
                  <input className="field" placeholder="Enter your aesthetic name" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="prism-focus rounded-xl transition-all duration-300">
                  <label className="block text-[10px] font-syncopate font-bold tracking-[0.2em] text-[#666] mb-3 uppercase pl-2">Frequency / Bio</label>
                  <textarea className="field" placeholder="What's your vibe? Tell us about yourself..." value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ resize: "none" }} />
                </div>

                <div className="prism-focus rounded-xl transition-all duration-300">
                  <label className="block text-[10px] font-syncopate font-bold tracking-[0.2em] text-[#666] mb-3 uppercase pl-2">External Link</label>
                  <input className="field" placeholder="https://yourspace.com" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" disabled={saving} className="primary-btn">
                {saving ? "SYNCING..." : "COMMIT CHANGES"}
              </button>
            </div>
          </form>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          {[["Saved Artifacts", pins.length], ["Archives", boards.length]].map(([label, count]) => (
            <div key={label as string} className="bg-[#050308]/60 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.6)] hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(168,85,247,0.1)] transition-all duration-300">
              <div className="text-4xl md:text-5xl font-bold text-white font-syncopate tracking-widest">{count}</div>
              <div className="text-[10px] color-[#888] mt-4 uppercase tracking-[0.3em] font-bold font-syncopate">{label}</div>
            </div>
          ))}
        </div>

        {/* CONTENT TABS */}
        <div className="bg-[#050308]/80 backdrop-blur-3xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
          <div className="flex border-b border-white/5 bg-black/40">
            <button className={`tab-btn ${tab === "pins" ? "active" : ""}`} onClick={() => setTab("pins")}>Artifacts</button>
            <button className={`tab-btn ${tab === "boards" ? "active" : ""}`} onClick={() => setTab("boards")}>Archives</button>
          </div>

          <div className="p-6 md:p-10">
            {tab === "pins" && (
              pins.length === 0
                ? <p className="text-center text-[#666] py-16 text-sm font-syncopate font-bold uppercase tracking-[0.2em]">Collection is empty.</p>
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
                ? <p className="text-center text-[#666] py-16 text-sm font-syncopate font-bold uppercase tracking-[0.2em]">No archives curated.</p>
                : <div className="flex flex-col gap-4">
                    {boards.map(board => (
                      <div key={board.id} className="board-item">
                        <div className="board-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        </div>
                        <div>
                          <div className="font-syncopate font-bold text-sm text-white tracking-wide uppercase">{board.name}</div>
                          {board.description && <div className="text-xs color-[#888] mt-2 font-inter leading-relaxed">{board.description}</div>}
                          <div className="text-[10px] color-[#a855f7] mt-3 font-bold font-syncopate tracking-widest">{pins.filter(p => p.board_id === board.id).length} ARTIFACTS</div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>
        
        {/* DANGER ZONE */}
        <div className="mt-16 mb-10 px-4">
           <button onClick={handleSignOut} className="danger-btn">DISCONNECT COMPLETELY</button>
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
