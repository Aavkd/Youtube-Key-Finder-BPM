"use client";

import * as React from "react";
import { Download, Play, RefreshCw, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { GlassPanel } from "@/components/glass-panel";
import { KeyChip } from "@/components/key-chip";
import type { Job, Track } from "@/lib/api/client";
import { mood } from "@/lib/mood";

interface QueueRowProps {
  job: Job;
  track?: Track;
  onRetry?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

const STATE_META: Record<
  Job["status"],
  { c: string; labelKey: string }
> = {
  done: { c: "150 70% 55%", labelKey: "stateReady" },
  analyzing: { c: "280 85% 68%", labelKey: "stateAnalyzing" },
  downloading: { c: "200 90% 62%", labelKey: "stateDownloading" },
  queued: { c: "210 12% 62%", labelKey: "stateQueued" },
  error: { c: "8 88% 62%", labelKey: "stateFailed" },
};

/** A single processing-queue card (faithful to the design handoff QueueRow). */
export function QueueRow({ job, track, onRetry, onDelete }: QueueRowProps) {
  const t = useTranslations("home");
  const meta = STATE_META[job.status];
  const ready = job.status === "done";
  const m = ready && track?.key ? mood(track.key, track.bpm ?? undefined) : null;

  const title =
    track?.title ??
    (job.status === "error"
      ? t("queueFailedTitle")
      : t("queueFetchingTitle"));

  const sub =
    job.status === "error"
      ? job.error_msg ?? t("stateFailed")
      : job.status === "queued"
        ? t("queueWaiting")
        : job.status === "downloading"
          ? t("queueDownloading")
          : t("queueAnalyzing");

  const showProgress = job.status === "downloading" || job.status === "analyzing";

  return (
    <GlassPanel
      variant="soft"
      className="relative flex items-center gap-3.5 overflow-hidden rounded-[14px] px-3.5 py-3"
    >
      {/* thumb / status orb */}
      <div
        className="relative flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px]"
        style={{
          background: m
            ? `linear-gradient(135deg, ${m.primary}, ${m.deep})`
            : `hsla(${meta.c} / 0.18)`,
          border: `1px solid hsla(${meta.c} / 0.4)`,
        }}
      >
        {ready && <Play size={16} fill="currentColor" className="text-white" />}
        {job.status === "analyzing" && (
          <span
            className="h-[18px] w-[18px] rounded-full border-2 border-white/25"
            style={{
              borderTopColor: "#fff",
              animation: "kfSpin 0.9s linear infinite",
            }}
          />
        )}
        {job.status === "downloading" && (
          <Download size={16} style={{ color: `hsl(${meta.c})` }} />
        )}
        {job.status === "queued" && (
          <span
            className="h-[18px] w-[18px] rounded-full border-2 border-white/20"
            style={{
              borderTopColor: "rgba(255,255,255,0.7)",
              animation: "kfSpin 1.4s linear infinite",
            }}
          />
        )}
        {job.status === "error" && (
          <X size={16} style={{ color: `hsl(${meta.c})` }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="max-w-[230px] overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-white">
            {title}
          </span>
        </div>
        {ready && track?.key ? (
          <div className="mt-[5px] flex items-center gap-2">
            <KeyChip keyName={track.key} bpm={track.bpm ?? undefined} size="sm" />
            {track.bpm != null && (
              <span className="kf-mono text-[12px] font-semibold text-ink-muted">
                {Number(track.bpm).toFixed(1)} BPM
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-ink-subtle">
              {sub}
            </div>
            {showProgress && (
              <div className="mt-[7px] h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${job.progress}%`,
                    background: `linear-gradient(90deg, hsla(${meta.c} / 0.5), hsl(${meta.c}))`,
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-none items-center gap-2">
        {showProgress && (
          <span className="kf-mono text-[12px] font-semibold text-ink-muted">
            {job.progress}%
          </span>
        )}
        {job.status === "error" && (
          <div className="flex items-center gap-1.5">
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(job.id)}
                className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-1.5 text-[12px] font-semibold"
                style={{
                  border: "1px solid hsla(8 88% 62% / 0.4)",
                  background: "hsla(8 88% 62% / 0.14)",
                  color: "hsl(8 90% 70%)",
                }}
              >
                <RefreshCw size={13} /> {t("retry")}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(job.id)}
                title={t("deleteJob")}
                className="flex items-center justify-center rounded-[9px] px-[9px] py-1.5"
                style={{
                  border: "1px solid hsla(8 88% 62% / 0.25)",
                  background: "hsla(8 88% 62% / 0.08)",
                  color: "hsl(8 70% 65%)",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
        {ready && (
          <span
            className="flex items-center gap-1.5 text-[11.5px] font-semibold"
            style={{ color: `hsl(${meta.c})` }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }}
            />
            {t(meta.labelKey)}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}
