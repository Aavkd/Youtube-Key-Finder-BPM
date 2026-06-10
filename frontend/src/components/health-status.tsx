"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { useHealth } from "@/lib/api/hooks";

/**
 * Proof-of-wiring: a sample TanStack Query through the typed (OpenAPI-generated)
 * client hitting `/api/health` (Phase 5 acceptance). Strings are i18n-driven.
 */
export function HealthStatus() {
  const t = useTranslations("status");
  const { data, isLoading, isError, error } = useHealth();

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("checking")}
      </span>
    );
  }

  if (isError || !data) {
    return (
      <span className="inline-flex items-center gap-2 text-destructive">
        <XCircle className="h-4 w-4" />
        {t("offline", {
          message: error instanceof Error ? error.message : "unknown",
        })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-emerald-400">
      <CheckCircle2 className="h-4 w-4" />
      {t("online", {
        service: data.service,
        version: data.version,
        status: data.status,
      })}
    </span>
  );
}
