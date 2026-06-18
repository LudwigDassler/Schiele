"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function signInWithEmail() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('✅ Welcome back!');
      setTimeout(() => window.location.reload(), 1000);
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('✅ Check your email for confirmation!');
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
  }

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 40, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Welcome to Schiele</h2>
      
      {message && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: message.includes('✅') ? '#e8f5e9' : '#ffebee', color: message.includes('✅') ? '#2e7d32' : '#c62828' }}>
          {message}
        </div>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
      />

      <button onClick={signInWithEmail} disabled={loading} style={{ width: '100%', padding: 12, marginBottom: 8, background: '#c0521a', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Sign In
      </button>
      <button onClick={signUpWithEmail} disabled={loading} style={{ width: '100%', padding: 12, marginBottom: 16, background: 'transparent', color: '#c0521a', border: '1px solid #c0521a', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Sign Up
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={signInWithGoogle} style={{ flex: 1, padding: 10, background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>G</span> Google
        </button>
        <button onClick={signInWithGitHub} style={{ flex: 1, padding: 10, background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🐙</span> GitHub
        </button>
      </div>
    </div>
  );
}
