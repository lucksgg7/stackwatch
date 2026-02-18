"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    setLoading(false);
    if (!response.ok) {
      setError("Invalid password.");
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-3 rounded-3xl border border-[#e7c866] bg-white/90 p-6 shadow-[0_20px_45px_rgba(140,103,11,0.18)]"
    >
      <h1 className="font-display text-2xl font-semibold text-[#3f2f0a]">Admin Login</h1>
      <p className="text-sm text-[#6c5418]">Private access to monitoring controls.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin password"
        className="w-full rounded-xl border border-[#dabb67] bg-[#fff9e9] px-3 py-2 text-sm text-[#3f2f0a] placeholder:text-[#9f7f2d] outline-none focus:border-[#b8881f]"
      />
      {error && <p className="text-sm text-[#b22d2d]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#c78a15] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#ae7710] disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

