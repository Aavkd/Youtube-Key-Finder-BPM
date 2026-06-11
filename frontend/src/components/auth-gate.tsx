"use client";

import * as React from "react";

import { API_BASE_URL } from "@/lib/api/client";
import { clearToken, getToken, setToken } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null);
  const [candidate, setCandidate] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const stored = getToken();
    if (stored) {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
  }, []);

  React.useEffect(() => {
    const onExpired = () => {
      setAuthenticated(false);
      setError("Session expirée. Saisis à nouveau le token.");
    };
    window.addEventListener("kf-auth-expired", onExpired);
    return () => window.removeEventListener("kf-auth-expired", onExpired);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/tracks?limit=1`, {
        headers: { Authorization: `Bearer ${candidate.trim()}` },
      });
      if (res.ok) {
        setToken(candidate.trim());
        setAuthenticated(true);
      } else {
        setError("Token invalide. Réessaie.");
      }
    } catch {
      setError("Impossible de joindre le backend. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
    setCandidate("");
    setError("");
  };

  // Still checking localStorage
  if (authenticated === null) return null;

  if (!authenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0f]">
        <div
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: "0 0 80px rgba(99,102,241,0.15)" }}
        >
          <div className="mb-8 text-center">
            <div className="mb-3 text-3xl font-bold tracking-tight text-white">
              Key Finder
            </div>
            <p className="text-sm text-white/40">Saisis le token d&apos;accès pour continuer.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              placeholder="Token d'accès"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
            />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !candidate.trim()}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Vérification…" : "Accéder"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={handleLogout}
        title="Se déconnecter"
        className="fixed bottom-4 right-4 z-50 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/30 backdrop-blur transition hover:bg-white/10 hover:text-white/60"
      >
        Déconnexion
      </button>
    </>
  );
}
