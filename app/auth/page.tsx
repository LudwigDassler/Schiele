"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [toastMsg, setToastMsg] = useState<{text: string, type: "success" | "error"} | null>(null);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("SUCCESS! CHECK INBOX FOR VERIFICATION.", "success");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(error.message, "error");
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'twitter' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: provider 
    });
    
    if (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-[#020104] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes ooze { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(10%, -10%) scale(1.1); } }

        .auth-card { background: rgba(5,3,8,0.8); backdrop-filter: blur(30px); border-radius: 32px; padding: 48px 40px; max-width: 460px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 40px 80px rgba(0,0,0,0.9), 0 0 40px rgba(168,85,247,0.1); animation: fadeIn 0.5s cubic-bezier(0.16,1,0.3,1); position: relative; z-index: 10; }
        
        .logo { font-family: 'Syncopate', sans-serif; font-size: 32px; font-weight: 700; color: #fff; letter-spacing: 0.3em; text-transform: uppercase; text-shadow: 0 0 20px rgba(255,255,255,0.3); }

        .tab-wrap { display: flex; gap: 4px; background: rgba(0,0,0,0.5); border-radius: 16px; padding: 6px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 36px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); }
        .tab-btn { flex: 1; padding: 12px 8px; border-radius: 12px; border: none; cursor: pointer; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s; }
        .tab-btn.active { background: rgba(255,255,255,0.1); color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); text-shadow: 0 0 10px rgba(255,255,255,0.5); }
        .tab-btn.inactive { background: transparent; color: #666; }
        .tab-btn.inactive:hover { color: #aaa; background: rgba(255,255,255,0.02); }

        .prism-focus { border-radius: 12px; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
        .prism-focus:focus-within { box-shadow: -10px 0 30px rgba(255,0,85,0.2), 0 0 30px rgba(0,255,0,0.1), 10px 0 30px rgba(0,255,255,0.2); border-color: rgba(255,255,255,0.4); }
        
        .field { width: 100%; padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; outline: none; transition: all 0.3s; font-family: 'Inter', sans-serif; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); }
        .field:focus { border-color: #a855f7; background: rgba(168,85,247,0.05); }
        .field::placeholder { color: rgba(255,255,255,0.2); font-family: 'Inter', sans-serif; }

        .primary-btn { background: #fff; color: #000; border: none; border-radius: 12px; padding: 18px 24px; cursor: pointer; font-weight: 700; font-family: 'Syncopate', sans-serif; font-size: 13px; width: 100%; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); margin-top: 12px; text-transform: uppercase; letter-spacing: 3px; box-shadow: 0 10px 20px rgba(255,255,255,0.1); }
        .primary-btn:hover:not(:disabled) { background: #ccc; transform: translateY(-2px); box-shadow: 0 15px 30px rgba(255,255,255,0.2); }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        .oauth-btn { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; padding: 16px 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #aaa; font-weight: 600; font-family: 'Inter', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.3s; }
        .oauth-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.3); color: #fff; transform: translateY(-1px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

        .divider { display: flex; align-items: center; text-align: center; color: #555; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; margin: 32px 0; font-family: 'Syncopate', sans-serif; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .divider::before { margin-right: 16px; }
        .divider::after { margin-left: 16px; }

        .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); padding: 16px 32px; border-radius: 9999px; font-size: 11px; font-weight: 700; z-index: 9999; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 20px 50px rgba(0,0,0,0.9); text-align: center; max-width: 90vw; font-family: 'Syncopate', sans-serif; letter-spacing: 2px; text-transform: uppercase; backdrop-filter: blur(20px); }
        .toast.success { background: rgba(5,3,8,0.95); border: 1px solid rgba(168,85,247,0.3); color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(168,85,247,0.2); }
        .toast.error { background: rgba(5,3,8,0.95); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(239,68,68,0.2); }
      `}} />

      {/* Currents Portal Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_rgba(20,10,40,0.8)_0%,_rgba(2,1,4,1)_100%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[1000px] max-h-[1000px] mix-blend-screen filter blur-[100px] pointer-events-none opacity-30 z-0">
         <div className="absolute w-[80%] h-[80%] -top-[10%] left-0 rounded-full bg-[#3a0088]" style={{ animation: 'ooze 15s infinite alternate ease-in-out' }}></div>
         <div className="absolute w-[70%] h-[70%] -bottom-[10%] right-0 rounded-full bg-[#f97316]" style={{ animation: 'ooze 12s infinite alternate-reverse ease-in-out' }}></div>
      </div>

      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 className="logo">GELBET</h1>
          <p style={{ color: "#888", fontSize: 10, marginTop: 16, fontFamily: "Syncopate, sans-serif", letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>Synthesize Your Aesthetic</p>
        </div>

        {/* Tabs */}
        <div className="tab-wrap">
          {[["login", "Connect"], ["register", "Initialize"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m as any); setToastMsg(null); }} className={`tab-btn ${mode === m ? "active" : "inactive"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="prism-focus">
            <input className="field" type="email" placeholder="EMAIL MATRIX" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="prism-focus">
            <input className="field" type="password" placeholder="ACCESS CODE" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          
          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "SYNCING..." : mode === "login" ? "ENTER ARCHIVE" : "ESTABLISH IDENTITY"}
          </button>
          
          {mode === "login" && (
            <button type="button" onClick={async () => {
              if (!email) { showToast("ENTER EMAIL TO RESET", "error"); return; }
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) showToast("CONNECTION ERROR", "error");
              else showToast("RESET SIGNAL SENT", "success");
            }} style={{ background: "none", border: "none", color: "#666", fontSize: 10, cursor: "pointer", textAlign: "center", marginTop: 8, transition: "color 0.2s", fontFamily: 'Syncopate', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }} onMouseOver={e => e.currentTarget.style.color = "#a855f7"} onMouseOut={e => e.currentTarget.style.color = "#666"}>
              LOST SIGNAL? RESET KEY
            </button>
          )}

          {/* OAuth Buttons */}
          <div className="divider">OR</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('google')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('twitter')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#fff"/></svg>
              Continue with X
            </button>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('github')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="#fff"/></svg>
              Continue with GitHub
            </button>
          </div>
        </form>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#666", fontSize: 10, cursor: "pointer", fontFamily: 'Syncopate', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, transition: "all 0.3s" }} onMouseOver={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.letterSpacing = "4px"; }} onMouseOut={e => { e.currentTarget.style.color = "#666"; e.currentTarget.style.letterSpacing = "2px"; }}>
            ← RETURN TO EXPLORE
          </button>
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
