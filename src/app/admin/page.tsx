"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();


  setLoading(true);
  setError("");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {

    setLoading(false);
    setError(error.message);

    return;
  }

window.location.href = "/dashboard";
}

  return (
    <main className="admin-login">

      <div className="admin-background" />
      <div className="admin-overlay" />

      <div className="admin-decoration admin-decoration-one" />
      <div className="admin-decoration admin-decoration-two" />

      <div className="admin-panel">

        <div className="admin-logo">
          <img
            src="/logo-truong.png"
            alt="Logo trường"
          />
        </div>

        <div className="admin-kicker">
          BAN CHẤP HÀNH CHI ĐOÀN
        </div>

        <h1>BCH / ADMIN</h1>

        <p className="admin-school">
          CHI ĐOÀN D-K66 · THPT HÀ TRUNG
        </p>

        <div className="admin-line" />
        
        {error && (
  <div
    style={{
      color: "#dc2626",
      background: "#fee2e2",
      padding: "10px 14px",
      borderRadius: "8px",
      marginBottom: "16px",
      fontSize: "14px",
    }}
  >
    {error}
  </div>
)}

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label>Mật khẩu</label>

          <input
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            {!loading && <span>→</span>}
          </button>

        </form>

        {error && (
          <div className="admin-message">
            {error}
          </div>
        )}

        <a href="/" className="back-home">
          ← Quay lại website
        </a>

        <div className="admin-footer">
          CHI ĐOÀN D-K66
          <span> · </span>
          NHIỆM KỲ 2025 — 2028
        </div>

      </div>

    </main>
  );
}