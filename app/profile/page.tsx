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
  const [uploadingArtifact, setUploadingArtifact] = useState(false);
  
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
  const artifactRef = useRef<HTMLInputElement>(null);

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
      } catch (e) { 
        console.error(e); 
      }
      
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

  async function handleArtifactUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingArtifact(true);
    showToast("Uploading artifact...", "success");

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("artifacts")
        .upload(path, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from("artifacts").getPublicUrl(path);
      
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.id, 
          image_url: data.publicUrl, 
          title: "User Upload", 
          source_url: data.publicUrl 
        })
      });
      
      if (res.ok) {
        const json = await res.json();
        setPins(prev => [json.pin || json.data, ...prev]);
        showToast("Artifact synthesized successfully");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload", "error");
    } finally {
      setUploadingArtifact(false);
      if (artifactRef.current) artifactRef.current.value = "";
    }
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
      showToast("Identity synchronized"); 
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

  // ==========================================
  // ФУНКЦИЯ УДАЛЕНИЯ АРТЕФАКТА (PURGE)
  // ==========================================
  const deletePin = async (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pins?id=${pinId}`, { method: "DELETE" });
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pinId));
        showToast("Artifact purged", "success");
      } else {
        throw new Error("Failed to delete from DB");
      }
    } catch (error) {
      console.error("Error deleting pin", error);
      showToast("Failed to purge artifact", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#010101] flex items-center justify-center">
      <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = (name || user?.email || "U")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#010101] text-white font-sans overflow-x-hidden relative pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; } 
        ::-webkit-scrollbar-track { background: #010101; } 
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; } 
        ::-webkit-scrollbar-thumb:hover { background: #fff; }
        
        @keyframes slow-spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .header { 
            position: sticky; top: 0; z-index: 100; 
            background: rgba(1, 1, 1, 0.8); backdrop-filter: blur(20px); 
            border-bottom: 1px solid rgba(255,255,255,0.05); 
            padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; 
        }
        
        .logo { 
            font-family: 'Syncopate', sans-serif; font-size: 16px; font-weight: 700; color: #fff; 
            letter-spacing: 0.4em; cursor: pointer; user-select: none; transition: all 0.3s ease; 
        }
        .logo:hover { text-shadow: 0 0 15px rgba(255,255,255,0.4); }
        
        .hbtn { 
            background: transparent; border: none; width: 40px; height: 40px; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; cursor: pointer; 
            color: #666; transition: all 0.3s ease; 
        } 
        .hbtn:hover { background: rgba(255,255,255,0.05); color: #fff; } 
        
        .ghost-input {
            width: 100%; padding: 8px 0; background: transparent; 
            border: none; border-bottom: 1px solid transparent; 
            color: #fff; font-size: 12px; font-family: 'Inter', sans-serif; 
            outline: none; transition: all 0.4s ease; 
            text-align: center; opacity: 0.6;
        }
        .ghost-input:focus, .ghost-input:hover { 
            border-bottom: 1px solid rgba(255,255,255,0.2); 
            opacity: 1;
        }
        .ghost-input::placeholder { color: rgba(255,255,255,0.3); font-weight: 300; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; }

        .sync-btn {
            background: transparent; border: none; color: #666; 
            font-family: 'Syncopate', sans-serif; font-size: 10px; 
            font-weight: 700; letter-spacing: 4px; text-transform: uppercase; 
            cursor: pointer; transition: all 0.3s; padding: 12px 24px;
        }
        .sync-btn:hover:not(:disabled) { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
        .sync-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        /* ТАБЫ: Исправлено наложение */
        .tab-btn { 
            padding: 12px 24px; border: none; background: transparent; cursor: pointer; 
            font-size: 11px; font-weight: 700; color: #555; white-space: nowrap;
            transition: all 0.3s; text-transform: uppercase; letter-spacing: 3px; 
            font-family: 'Syncopate', sans-serif; position: relative;
        }
        .tab-btn::after {
            content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
            width: 0; height: 1px; background: #fff; transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        .tab-btn.active { color: #fff; }
        .tab-btn.active::after { width: 80%; }
        .tab-btn:hover:not(.active) { color: #aaa; }

        .masonry-grid { column-count: 2; column-gap: 16px; width: 100%; }
        @media (min-width: 640px) { .masonry-grid { column-count: 3; column-gap: 20px; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 4; column-gap: 24px; } }
        
        .masonry-item { 
            break-inside: avoid; margin-bottom: 16px; border-radius: 8px; overflow: hidden; 
            position: relative; transition: all 0.4s ease; transform: translateZ(0); cursor: pointer;
        }
        @media (min-width: 640px) { .masonry-item { margin-bottom: 20px; } }
        @media (min-width: 1024px) { .masonry-item { margin-bottom: 24px; } }
        
        .masonry-item img { width: 100%; display: block; filter: grayscale(20%); transition: all 0.5s ease; }
        .masonry-item:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.8); z-index: 2; border: 1px solid rgba(255,255,255,0.1); }
        .masonry-item:hover img { filter: grayscale(0%); transform: scale(1.02); }

        .upload-card {
            break-inside: avoid; margin-bottom: 24px; border-radius: 8px;
            border: 1px dashed rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);
            display: flex; flex-direction: column; items-center; justify-content: center;
            aspect-ratio: 3/4; cursor: pointer; transition: all 0.3s;
        }
        .upload-card:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); }

        .board-item { 
            display: flex; align-items: center; gap: 24px; padding: 24px 0; 
            border-bottom: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; background: transparent;
        }
        .board-item:hover { transform: translateX(10px); }
        .board-item:last-child { border-bottom: none; }
        
        .board-icon { 
            width: 64px; height: 64px; border-radius: 8px; background: rgba(255,255,255,0.02); 
            display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05); 
        }
        
        .toast { 
            position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); 
            padding: 16px 32px; border-radius: 9999px; font-size: 10px; font-weight: 700; 
            z-index: 9999; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); 
            font-family: 'Syncopate', sans-serif; letter-spacing: 3px; text-transform: uppercase; 
            backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
        }
        .toast.success { background: rgba(1,1,1,0.9); color: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        .toast.error { background: rgba(1,1,1,0.9); color: #ef4444; border-color: rgba(239,68,68,0.3); }

        .avatar-glow { transition: all 0.5s ease; }
        .group:hover .avatar-glow {
            box-shadow: 0 0 30px rgba(255,255,255,0.15), inset 0 0 20px rgba(0,0,0,0.8);
            border-color: rgba(255,255,255,0.4);
        }
      `}} />

      {/* LZ III Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30 flex justify-center items-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,20,20,0.5)_0%,_rgba(1,1,1,1)_100%)]"></div>
          <div className="absolute w-[150vw] h-[150vw] max-w-[1200px] max-h-[1200px] border-[1px] border-white/5 rounded-full opacity-20 animate-[slow-spin_100s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
      </div>

      <header className="header">
        <button onClick={() => router.back()} className="hbtn" title="Return to Archive">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <span className="logo" onClick={() => router.push("/")}>GELBET</span>
        <div className="w-10"></div> 
      </header>

      <main className="w-full flex flex-col items-center mt-12 px-6 relative z-10" style={{ animation: "fadeIn 0.6s ease-out" }}>

        {/* IDENTITY HEADER */}
        <div className="flex flex-col items-center mb-16 w-full">
            <div className="relative group cursor-pointer mb-6" onClick={() => fileRef.current?.click()}>
                <div className="absolute -inset-4 border-[1px] border-white/10 rounded-full opacity-0 group-hover:opacity-100 animate-[slow-spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                
                <div className="avatar-glow relative z-10 w-28 h-28 rounded-full overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    {displayAvatar ? (
                        <img src={displayAvatar} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                        <span className="font-syncopate text-3xl text-neutral-600 font-bold">{initials}</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <span className="font-syncopate text-[8px] tracking-widest text-white uppercase font-bold">Change</span>
                    </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <h1 className="text-xl md:text-2xl font-syncopate font-bold text-white tracking-[0.3em] uppercase text-center mb-2">
                {name || "ANONYMOUS"}
            </h1>
            <div className="text-neutral-500 font-inter text-xs tracking-widest uppercase text-center">
                {user?.email}
            </div>
        </div>

        {/* ФОРМА */}
        <form onSubmit={handleSave} className="flex flex-col items-center gap-6 w-full max-w-sm mb-16">
            <div className="w-full flex flex-col items-center">
                <input 
                    className="ghost-input" 
                    placeholder="DESIGNATION" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                />
            </div>
            <div className="w-full flex flex-col items-center">
                <input 
                    className="ghost-input" 
                    placeholder="FREQUENCY / BIO" 
                    value={bio} 
                    onChange={e => setBio(e.target.value)} 
                />
            </div>
            <div className="w-full flex flex-col items-center">
                <input 
                    className="ghost-input" 
                    placeholder="EXTERNAL LINK" 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)} 
                />
            </div>
            <div className="pt-2 w-full flex justify-center">
                <button type="submit" disabled={saving} className="sync-btn">
                    {saving ? "SYNCING..." : "[ SYNC IDENTITY ]"}
                </button>
            </div>
        </form>

        {/* ТАБЫ (С исправленным флексом) */}
        <div className="flex justify-center items-center mb-12 w-full max-w-3xl relative border-b border-white/5 pb-2">
            <div className="flex gap-8 md:gap-16">
              <button className={`tab-btn ${tab === "pins" ? "active" : ""}`} onClick={() => setTab("pins")}>
                  Artifacts <span className="text-neutral-600 ml-1">[{pins.length}]</span>
              </button>
              <button className={`tab-btn ${tab === "boards" ? "active" : ""}`} onClick={() => setTab("boards")}>
                  Archives <span className="text-neutral-600 ml-1">[{boards.length}]</span>
              </button>
            </div>
        </div>

        {/* СЕТКА КОНТЕНТА */}
        <div className="pb-16 min-h-[400px] w-full max-w-6xl">
            {tab === "pins" && (
                <div className="masonry-grid">
                    
                    {/* КАРТОЧКА ЗАГРУЗКИ */}
                    <div 
                        className="upload-card group flex flex-col items-center justify-center"
                        onClick={() => artifactRef.current?.click()}
                    >
                        {uploadingArtifact ? (
                            <div className="w-6 h-6 border border-white/20 border-t-[#a855f7] rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="text-2xl text-neutral-500 group-hover:text-white group-hover:scale-125 transition-all mb-2">+</span>
                                <span className="text-[9px] font-syncopate tracking-widest uppercase text-neutral-500 group-hover:text-white transition-colors">UPLOAD</span>
                            </>
                        )}
                        <input 
                            ref={artifactRef} 
                            type="file" 
                            accept="image/*,video/*" 
                            onChange={handleArtifactUpload} 
                            className="hidden" 
                        />
                    </div>

                    {/* ПИНЫ С КНОПКОЙ PURGE */}
                    {pins.map(pin => (
                      <div key={pin.id} className="masonry-item group" onClick={() => router.push(`/vibe?src=${encodeURIComponent(pin.image_url)}&title=${encodeURIComponent(pin.title || "")}`)}>
                        <img src={pin.image_url} alt={pin.title} loading="lazy" />
                        
                        {/* Оверлей для удаления */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                            <div className="flex justify-between items-end pointer-events-auto">
                                <span className="font-mono text-[8px] text-neutral-400 uppercase tracking-widest">
                                  ID: {pin.id.substring(0,4).toUpperCase()}
                                </span>
                                <button 
                                  onClick={(e) => deletePin(e, pin.id)}
                                  className="font-mono text-[9px] text-white bg-black/60 border border-white/20 px-3 py-1.5 hover:bg-red-900/40 hover:border-red-500 hover:text-red-400 transition-all uppercase tracking-widest"
                                >
                                  [ Purge ]
                                </button>
                            </div>
                        </div>
                      </div>
                    ))}
                </div>
            )}

            {tab === "boards" && (
              boards.length === 0
                ? <p className="text-center text-neutral-600 py-20 text-[10px] font-syncopate font-bold uppercase tracking-[0.3em]">No archives curated.</p>
                : <div className="flex flex-col w-full max-w-2xl mx-auto">
                    {boards.map(board => (
                      <div key={board.id} className="board-item group">
                        <div className="board-icon group-hover:border-white/30 transition-colors">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-syncopate font-bold text-sm text-white tracking-widest uppercase">{board.name}</div>
                          {board.description && <div className="text-xs text-neutral-500 mt-2 font-inter leading-relaxed">{board.description}</div>}
                          <div className="text-[9px] text-neutral-600 mt-3 font-bold font-syncopate tracking-[0.3em] uppercase">{pins.filter(p => p.board_id === board.id).length} ARTIFACTS</div>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
        </div>
        
        {/* DANGER ZONE */}
        <div className="flex justify-center pb-10 w-full mt-10">
           <button onClick={handleSignOut} className="text-[9px] font-syncopate font-bold tracking-[0.4em] uppercase text-neutral-600 hover:text-red-500 transition-colors">
              DISCONNECT
           </button>
        </div>

      </main>

      {toastMsg && (
        <div className={`toast ${toastMsg.type}`}>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
