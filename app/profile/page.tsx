"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      setDisplayName(u?.user_metadata?.full_name || u?.email?.split('@')[0] || "");
      setAvatarUrl(u?.user_metadata?.avatar_url || "");
    });
  }, []);

  async function updateProfile() {
    setLoading(true);
    setMessage("");

    const updates = {
      display_name: displayName,
      bio: bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer 
      },
      body: JSON.stringify(updates)
    });
    
    const data = await res.json();
    if (data.success) {
      setMessage("✅ Profile updated!");
    } else {
      setMessage("❌ " + data.error);
    }
    setLoading(false);
  }

  if (!user) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h1>
      
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <img 
          src={avatarUrl || https://ui-avatars.com/api/?name=&background=c0521a&color=fff} 
          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} 
          alt="avatar" 
        />
        <div>
          <div style={{ fontWeight: 600 }}>{displayName || user.email}</div>
          <div style={{ color: "#999", fontSize: 12 }}>{user.email}</div>
        </div>
      </div>

      <input 
        className="field" 
        placeholder="Display name" 
        value={displayName} 
        onChange={e => setDisplayName(e.target.value)} 
        style={{ marginBottom: 12 }}
      />
      
      <textarea 
        className="field" 
        placeholder="Bio (optional)" 
        rows={3}
        value={bio} 
        onChange={e => setBio(e.target.value)} 
        style={{ marginBottom: 16, height: 80 }}
      />

      <button 
        className="primary-btn" 
        onClick={updateProfile} 
        disabled={loading}
        style={{ marginBottom: 12 }}
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>

      {message && (
        <p style={{ color: message.includes("✅") ? "green" : "red", marginTop: 8 }}>
          {message}
        </p>
      )}

      <a href="/" style={{ display: "block", textAlign: "center", color: "#999", fontSize: 13, marginTop: 16 }}>
        ← Back to home
      </a>
    </div>
  );
}
