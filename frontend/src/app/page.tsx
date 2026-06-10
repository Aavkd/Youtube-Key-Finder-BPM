"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Sparkles, SlidersHorizontal, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { Aurora } from "@/components/aurora";
import { GlassPanel } from "@/components/glass-panel";
import { QueueRow } from "@/components/queue-row";
import { TransitionOverlay } from "@/components/transition-overlay";
import { useCreateJob, useDeleteJob, useJobs, useRetryJob, useTracks } from "@/lib/api/hooks";
import { backgroundBlobs, DEFAULT_BLOBS } from "@/lib/background";
import { mood, type Mood } from "@/lib/mood";
import {
  useUiStore,
  type HomeBackgroundMode,
} from "@/lib/store";

const BG_MODES: HomeBackgroundMode[] = ["library", "time", "random"];

function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i.test(value.trim());
}

export default function HomePage() {
  const t = useTranslations("home");
  const router = useRouter();

  const [url, setUrl] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [seed] = React.useState(() => Math.random());

  const homeBackgroundMode = useUiStore((s) => s.homeBackgroundMode);
  const setHomeBackgroundMode = useUiStore((s) => s.setHomeBackgroundMode);
  const autoTransition = useUiStore((s) => s.autoTransition);
  const durationLimitMinutes = useUiStore((s) => s.durationLimitMinutes);

  const { data: jobs } = useJobs();
  const { data: tracks } = useTracks();
  const createJob = useCreateJob();
  const retryJob = useRetryJob();
  const deleteJob = useDeleteJob();

  // Track which jobs were submitted from this session for auto-transition (D27).
  const submittedRef = React.useRef<Set<string>>(new Set());
  const [transition, setTransition] = React.useState<{
    mood: Mood | null;
    title: string | null;
  } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const tracksById = React.useMemo(() => {
    const map: Record<string, NonNullable<typeof tracks>[number]> = {};
    for (const tr of tracks ?? []) map[tr.id] = tr;
    return map;
  }, [tracks]);

  // Adaptive background (D42). Render the stable default until mounted to avoid
  // hydration mismatches for the time/random modes.
  const blobs = React.useMemo(() => {
    if (!mounted) return DEFAULT_BLOBS;
    return backgroundBlobs(homeBackgroundMode, tracks ?? [], seed);
  }, [mounted, homeBackgroundMode, tracks, seed]);

  // Auto-transition into the Player when a submitted job completes (D26/D27).
  React.useEffect(() => {
    if (!jobs) return;
    for (const job of jobs) {
      if (
        submittedRef.current.has(job.id) &&
        job.status === "done" &&
        job.track_id
      ) {
        submittedRef.current.delete(job.id);
        if (!autoTransition) continue;
        const tr = job.track_id ? tracksById[job.track_id] : undefined;
        const trackId = job.track_id;
        setTransition({
          mood: tr?.key ? mood(tr.key, tr.bpm ?? undefined) : null,
          title: tr?.title ?? null,
        });
        window.setTimeout(() => {
          router.push(`/player?track=${trackId}`);
        }, 1050);
      }
    }
  }, [jobs, autoTransition, tracksById, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    if (!looksLikeUrl(value)) {
      setFormError(t("invalidUrl"));
      return;
    }
    setFormError(null);
    try {
      const job = await createJob.mutateAsync(value);
      submittedRef.current.add(job.id);
      setUrl("");
    } catch {
      setFormError(t("submitError"));
    }
  };

  const sortedJobs = jobs ?? [];
  const activeCount = sortedJobs.filter((j) =>
    ["queued", "downloading", "analyzing"].includes(j.status),
  ).length;
  const doneCount = sortedJobs.filter((j) => j.status === "done").length;
  const visibleJobs = sortedJobs.slice(0, 6);

  const cycleMode = () => {
    const next =
      BG_MODES[(BG_MODES.indexOf(homeBackgroundMode) + 1) % BG_MODES.length];
    setHomeBackgroundMode(next);
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col">
      <Aurora blobs={blobs} />

      {/* faint circle-of-fifths motif */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] animate-spin-slow rounded-full"
        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[5px] w-[5px] rounded-full"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-310px)`,
              background: `hsl(${i * 30} 80% 60%)`,
              opacity: 0.5,
              boxShadow: `0 0 12px hsl(${i * 30} 80% 60%)`,
            }}
          />
        ))}
      </div>

      {/* top bar */}
      <div className="relative z-[2] flex items-center px-[34px] py-[22px]">
        <div className="kf-mono text-[12px] font-semibold tracking-[0.22em] text-ink-subtle">
          KEY&nbsp;FINDER
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={cycleMode}
          title={t("backgroundCycle")}
          className="kf-glass-soft flex items-center gap-2.5 rounded-full px-3.5 py-2"
        >
          <Sparkles size={14} style={{ color: "hsl(280 85% 70%)" }} />
          <span className="text-[12.5px] font-medium text-ink-muted">
            {t("background")}
          </span>
          <span className="text-[12.5px] font-semibold text-ink">
            {t(`backgroundMode_${homeBackgroundMode}`)}
          </span>
          <span className="ml-0.5 flex gap-[3px]">
            {blobs.slice(0, 4).map((b, i) => (
              <span
                key={i}
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: b.color }}
              />
            ))}
          </span>
        </button>
      </div>

      {/* hero */}
      <div className="relative z-[2] -mt-2.5 flex flex-1 flex-col items-center justify-center px-10 text-center">
        <div className="kf-mono mb-5 flex items-center gap-3.5 text-[12.5px] font-semibold tracking-[0.34em] text-ink-muted">
          <span>{t("kickerPaste")}</span>
          <span className="opacity-40">→</span>
          <span>{t("kickerDownload")}</span>
          <span className="opacity-40">→</span>
          <span>{t("kickerAnalyze")}</span>
        </div>
        <h1 className="m-0 text-[58px] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
          {t("titleLine1")}
          <br />
          <span
            style={{
              background:
                "linear-gradient(100deg, hsl(200 90% 70%), hsl(280 90% 72%), hsl(330 90% 70%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("titleLine2")}
          </span>
        </h1>
        <p className="mx-auto mb-9 mt-[18px] max-w-[520px] text-[16.5px] leading-[1.5] text-ink-muted">
          {t("subtitle")}
        </p>

        {/* the pill */}
        <form onSubmit={handleSubmit} className="w-[760px] max-w-[92%]">
          <GlassPanel
            className="flex items-center gap-3.5 rounded-full py-[11px] pl-6 pr-3"
            style={{
              boxShadow:
                "0 30px 80px -28px rgba(0,0,0,0.85), 0 0 60px -20px hsla(280 90% 60% / 0.4)",
            }}
          >
            <Link2 size={20} className="text-ink-muted" />
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder={t("inputPlaceholder")}
              className="kf-mono flex-1 border-none bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-subtle"
            />
            <button
              type="submit"
              disabled={createJob.isPending || !url.trim()}
              className="flex items-center gap-2.5 rounded-full px-[26px] py-3.5 text-[15.5px] font-semibold text-[#0a0912] transition-opacity disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(120deg, hsl(200 95% 72%), hsl(280 92% 74%))",
                boxShadow: "0 10px 30px -8px hsla(260 90% 60% / 0.7)",
              }}
            >
              {createJob.isPending ? (
                <span
                  className="h-[17px] w-[17px] rounded-full border-2 border-[#0a0912]/30"
                  style={{
                    borderTopColor: "#0a0912",
                    animation: "kfSpin 0.8s linear infinite",
                  }}
                />
              ) : (
                <Zap size={17} strokeWidth={2.4} />
              )}
              {t("analyze")}
            </button>
          </GlassPanel>
        </form>

        {/* hints / error */}
        <div className="mt-[18px] flex min-h-[20px] items-center gap-[18px] text-[13px] text-ink-subtle">
          {formError ? (
            <span style={{ color: "hsl(8 90% 68%)" }}>{formError}</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Check size={14} /> {t("hintSingle")}
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1.5">
                <Check size={14} /> {t("hintDuration", { limit: durationLimitMinutes })}
              </span>
              <span className="opacity-40">·</span>
              <span
                className="flex items-center gap-1.5"
                style={{ color: autoTransition ? "hsl(150 70% 60%)" : undefined }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "currentColor",
                    boxShadow: autoTransition ? "0 0 8px currentColor" : "none",
                  }}
                />
                {autoTransition ? t("hintAutoplay") : t("hintAutoplayOff")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* processing queue */}
      {visibleJobs.length > 0 && (
        <GlassPanel className="relative z-[2] mx-[34px] mb-7 rounded-[22px] px-[18px] py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <SlidersHorizontal size={15} className="text-ink-muted" />
            <span className="text-[13.5px] font-semibold text-ink">
              {t("queueTitle")}
            </span>
            <span className="kf-mono rounded-md bg-white/[0.06] px-[7px] py-0.5 text-[11px] text-ink-subtle">
              {t("queueCounts", { active: activeCount, done: doneCount })}
            </span>
            <div className="flex-1" />
            <span className="text-[12px] text-ink-subtle">{t("queueHint")}</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {visibleJobs.map((job) => (
              <QueueRow
                key={job.id}
                job={job}
                track={job.track_id ? tracksById[job.track_id] : undefined}
                onRetry={(id) => retryJob.mutate(id)}
                onDelete={(id) => deleteJob.mutate(id)}
              />
            ))}
          </div>
        </GlassPanel>
      )}

      <TransitionOverlay
        active={transition != null}
        mood={transition?.mood}
        title={transition?.title}
      />
    </div>
  );
}
