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
        showToast("Success! Check your email (and Spam folder) to verify your account.", "success");
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

  // РЕАЛЬНЫЙ ОБРАБОТЧИК OAUTH
  async function handleOAuth(provider: 'google' | 'twitter' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: provider 
    });
    
    if (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0a06", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "-apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        .auth-card { background: #1a1208; border-radius: 24px; padding: 40px 32px; max-width: 420px; width: 100%; border: 1px solid #2a1f0e; box-shadow: 0 32px 64px rgba(0,0,0,0.6); animation: fadeIn 0.4s ease; }
        
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 28px; font-weight: 700; color: #d4b896; letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 0 20px rgba(192,82,26,0.3); }
        .logo span { color: #c0521a; }

        .tab-wrap { display: flex; gap: 4px; background: #0d0a06; border-radius: 12px; padding: 4px; border: 1px solid #2a1f0e; margin-bottom: 32px; }
        .tab-btn { flex: 1; padding: 10px 4px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; }
        .tab-btn.active { background: #1a1208; color: #c0521a; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 1px solid #2a1f0e; }
        .tab-btn.inactive { background: transparent; color: #6a4a2a; }
        .tab-btn.inactive:hover { color: #d4b896; }

        .field { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #2a1f0e; background: #0d0a06; color: #d4b896; font-size: 14px; outline: none; transition: all 0.2s; }
        .field:focus { border-color: #c0521a; box-shadow: 0 0 0 2px rgba(192,82,26,0.1); }
        .field::placeholder { color: #4a3520; }

        .primary-btn { background: #c0521a; color: #0d0a06; border: none; border-radius: 24px; padding: 14px 24px; cursor: pointer; font-weight: 700; font-size: 14px; width: 100%; transition: all 0.2s; margin-top: 8px; }
        .primary-btn:hover:not(:disabled) { background: #d4621a; transform: translateY(-1px); }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .oauth-btn { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 12px 24px; background: transparent; border: 1px solid #2a1f0e; border-radius: 24px; color: #d4b896; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .oauth-btn:hover { background: #0d0a06; border-color: #4a3520; }

        .divider { display: flex; align-items: center; text-align: center; color: #4a3520; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #2a1f0e; }
        .divider::before { margin-right: 12px; }
        .divider::after { margin-left: 12px; }

        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 700; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 90vw; }
        .toast.success { background: #c0521a; color: #0d0a06; }
        .toast.error { background: #e53e3e; color: #fff; }
      `}</style>

      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 className="logo">GEL<span>BE</span>T</h1>
          <p style={{ color: "#8a6a4a", fontSize: 13, marginTop: 12, fontFamily: "Crimson Text, serif", fontStyle: "italic", letterSpacing: 1 }}>Curate your aesthetic universe</p>
        </div>

        {/* Tabs */}
        <div className="tab-wrap">
          {[["login", "Sign In"], ["register", "Register"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m as any); setToastMsg(null); }} className={`tab-btn ${mode === m ? "active" : "inactive"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input className="field" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          
          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Authenticating..." : mode === "login" ? "Enter the void" : "Create identity"}
          </button>
          
          {mode === "login" && (
            <button type="button" onClick={async () => {
              if (!email) { showToast("Enter your email first", "error"); return; }
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) showToast(error.message, "error");
              else showToast("Password reset link sent to your email", "success");
            }} style={{ background: "none", border: "none", color: "#6a4a2a", fontSize: 12, cursor: "pointer", textAlign: "center", marginTop: 4, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "#c0521a"} onMouseOut={e => e.currentTarget.style.color = "#6a4a2a"}>
              Lost your keys? Reset password
            </button>
          )}

          {/* OAuth Buttons */}
          <div className="divider">or</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('google')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('twitter')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Continue with X (Twitter)
            </button>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('github')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Continue with GitHub
            </button>
          </div>
        </form>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href="/" style={{ color: "#4a3520", fontSize: 11, textDecoration: "none", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "#c0521a"} onMouseOut={e => e.currentTarget.style.color = "#4a3520"}>
            ← Return to Explore
          </a>
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
