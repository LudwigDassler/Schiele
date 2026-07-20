"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "phone">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm registration!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }
    setLoading(false);
  }

  async function handlePhoneSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) setError(error.message);
    else setOtpSent(true);
    setLoading(false);
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error) setError(error.message);
    else router.push("/");
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
        
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 4, fontFamily: "Georgia, serif", color: "#111" }}>
            SCH<span style={{ color: "#c0521a" }}>IE</span>LE
          </h1>
          <p style={{ color: "#999", fontSize: 13, marginTop: 6 }}>Discover and save inspiring images</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f0f0f0", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[["login", "Sign In"], ["register", "Register"], ["phone", "Phone"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m as "login" | "register" | "phone"); setError(""); setMessage(""); setOtpSent(false); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "-apple-system, sans-serif", background: mode === m ? "white" : "transparent", color: mode === m ? "#111" : "#888", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Email/Password form */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input style={inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            {error && <p style={{ color: "#e53e3e", fontSize: 13, textAlign: "center" }}>{error}</p>}
            {message && <p style={{ color: "#38a169", fontSize: 13, textAlign: "center" }}>{message}</p>}
            <button type="submit" disabled={loading} style={btn}>{loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}</button>
            {mode === "login" && (
              <button type="button" onClick={async () => {
                if (!email) { setError("Enter your email first"); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) setError(error.message);
                else setMessage("Password reset link sent to your email!");
              }} style={{ background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
                Forgot password?
              </button>
            )}
          </form>
        )}

        {/* Phone form */}
        {mode === "phone" && (
          <form onSubmit={otpSent ? handleOtpVerify : handlePhoneSend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!otpSent ? (
              <>
                <p style={{ color: "#666", fontSize: 13, textAlign: "center" }}>Enter your phone number with country code</p>
                <input style={inp} type="tel" placeholder="+79001234567" value={phone} onChange={e => setPhone(e.target.value)} required />
                {error && <p style={{ color: "#e53e3e", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button type="submit" disabled={loading} style={btn}>{loading ? "Sending..." : "Send Code"}</button>
              </>
            ) : (
              <>
                <p style={{ color: "#666", fontSize: 13, textAlign: "center" }}>Enter the code sent to {phone}</p>
                <input style={inp} type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} />
                {error && <p style={{ color: "#e53e3e", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button type="submit" disabled={loading} style={btn}>{loading ? "Verifying..." : "Verify"}</button>
                <button type="button" onClick={() => setOtpSent(false)} style={{ background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer" }}>Change number</button>
              </>
            )}
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/" style={{ color: "#999", fontSize: 12, textDecoration: "none" }}>← Back to Schiele</Link>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e0e0e0", background: "#fafafa", color: "#111", fontSize: 14, outline: "none", fontFamily: "-apple-system, sans-serif", boxSizing: "border-box" };
const btn: React.CSSProperties = { width: "100%", padding: "13px 24px", background: "#c0521a", color: "white", border: "none", borderRadius: 24, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "-apple-system, sans-serif" };