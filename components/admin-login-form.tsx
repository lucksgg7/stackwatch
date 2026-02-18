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
      setError("Contraseña incorrecta.");
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
      <h1 className="text-xl font-semibold text-white">Admin Login</h1>
      <p className="text-sm text-slate-300">Acceso privado al panel de monitores.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin password"
        className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

