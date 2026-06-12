"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { API_BASE_URL } from "@/lib/api/client";
import { clearToken, getToken, setToken } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null);
  const [candidate, setCandidate] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setAuthenticated(Boolean(getToken())), []);

  React.useEffect(() => {
    const onExpired = () => {
      setAuthenticated(false);
      setError(t("expired"));
    };
    window.addEventListener("kf-auth-expired", onExpired);
    return () => window.removeEventListener("kf-auth-expired", onExpired);
  }, [t]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        setError(t("invalid"));
      }
    } catch {
      setError(t("unreachable"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = React.useCallback(() => {
    clearToken();
    setAuthenticated(false);
    setCandidate("");
    setError("");
  }, []);

  React.useEffect(() => {
    window.addEventListener("kf-logout", handleLogout);
    return () => window.removeEventListener("kf-logout", handleLogout);
  }, [handleLogout]);

  if (authenticated === null) return null;

  if (!authenticated) {
    return (
      <div className="kf-viewport kf-scrollable flex w-full items-start justify-center bg-[#0a0a0f] px-4 py-[max(24px,env(safe-area-inset-top))] sm:items-center">
        <div
          className="my-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
          style={{ boxShadow: "0 0 80px rgba(99,102,241,0.15)" }}
        >
          <div className="mb-8 text-center">
            <div className="mb-3 text-3xl font-bold tracking-tight text-white">Key Finder</div>
            <p className="text-sm text-white/40">{t("prompt")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={candidate}
              onChange={(event) => setCandidate(event.target.value)}
              placeholder={t("placeholder")}
              autoFocus
              className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/20 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !candidate.trim()}
              className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? t("checking") : t("submit")}
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
        title={t("logout")}
        className="fixed bottom-4 right-4 z-50 hidden min-h-11 rounded-full border border-white/10 bg-white/5 px-4 text-xs text-white/30 backdrop-blur transition hover:bg-white/10 hover:text-white/60 lg:block"
      >
        {t("logout")}
      </button>
    </>
  );
}
