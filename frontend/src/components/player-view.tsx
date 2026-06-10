"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  ExternalLink,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Aurora, type AuroraBlob } from "@/components/aurora";
import { Confidence } from "@/components/confidence";
import { EQ } from "@/components/eq";
import { GlassPanel } from "@/components/glass-panel";
import { KeyChip } from "@/components/key-chip";
import { trackAudioUrl, trackDownloadUrl, type Track } from "@/lib/api/client";
import { useTrack, useUpdateTrack } from "@/lib/api/hooks";
import {
  fmtDur,
  keyAbbrev,
  moodPalette,
  moodWord,
  type Mood,
} from "@/lib/mood";
import { moodFromBpmTone, moodWithPreset } from "@/lib/mood-presets";
import { useUiStore, resolveActivePreset } from "@/lib/store";
import { useWavePlayer } from "@/lib/use-wave-player";

interface BpmAlt {
  bpm: number;
  reason: string;
}
interface KeyAlt {
  key: string;
  reason: string;
}

function asBpmAlts(value: unknown): BpmAlt[] {
  return Array.isArray(value)
    ? (value.filter((a) => a && typeof a.bpm === "number") as BpmAlt[])
    : [];
}
function asKeyAlts(value: unknown): KeyAlt[] {
  return Array.isArray(value)
    ? (value.filter((a) => a && typeof a.key === "string") as KeyAlt[])
    : [];
}

function moodBlobs(m: Mood): AuroraBlob[] {
  return [
    { x: "6%", y: "-12%", size: 520, color: m.primary, anim: "kfDrift1", dur: 16, opacity: 0.75 },
    { x: "58%", y: "-18%", size: 560, color: m.accent, anim: "kfDrift2", dur: 19, opacity: 0.7 },
    { x: "68%", y: "38%", size: 460, color: `hsl(${(m.hue + 50) % 360} 85% 58%)`, anim: "kfDrift3", dur: 21, opacity: 0.5 },
    { x: "16%", y: "52%", size: 500, color: m.deep, anim: "kfDrift1", dur: 24, delay: 2, opacity: 0.55 },
    { x: "40%", y: "70%", size: 380, color: m.primary, anim: "kfPulse", dur: 6, opacity: 0.45 },
  ];
}

export function PlayerView() {
  const t = useTranslations("player");
  const params = useSearchParams();
  const trackId = params.get("track");

  const { data: track, isLoading, isError } = useTrack(trackId);

  if (!trackId) return <EmptyState message={t("noTrack")} />;
  if (isLoading) return <LoadingState />;
  if (isError || !track) return <EmptyState message={t("notFound")} />;

  return <PlayerCard track={track} />;
}

function PlayerCard({ track }: { track: Track }) {
  const t = useTranslations("player");
  const autoTransition = useUiStore((s) => s.autoTransition);
  const moodSource = useUiStore((s) => s.moodSource);
  const moodPresets = useUiStore((s) => s.moodPresets);
  const activeMoodPresetId = useUiStore((s) => s.activeMoodPresetId);
  const defaultExportFormat = useUiStore((s) => s.defaultExportFormat);
  const updateTrack = useUpdateTrack();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const activePreset = React.useMemo(
    () => resolveActivePreset({ moodPresets, activeMoodPresetId }),
    [moodPresets, activeMoodPresetId],
  );

  const m = React.useMemo(() => {
    if (moodSource === "thumbnail") return moodFromBpmTone(track.key, track.bpm ?? undefined);
    return moodWithPreset(track.key, track.bpm ?? undefined, activePreset);
  }, [track.key, track.bpm, moodSource, activePreset]);
  const blobs = React.useMemo(() => moodBlobs(m), [m]);
  const speed = 0.8 + m.energy * 1.6;

  const hasAudio = Boolean(track.audio_path_wav);
  // D27: when auto-transition/auto-play is OFF, the Player is download-only.
  // Gate on `mounted` so SSR (store default ON) and client agree before hydration.
  const playbackEnabled = (!mounted || autoTransition) && hasAudio;

  // Persist the computed mood palette once (D43/D44) if not already stored.
  const persistedRef = React.useRef(false);
  React.useEffect(() => {
    if (persistedRef.current) return;
    if (!track.key || track.mood_palette) return;
    persistedRef.current = true;
    updateTrack.mutate({ id: track.id, patch: { mood_palette: moodPalette(m) } });
  }, [track.id, track.key, track.mood_palette, m, updateTrack]);

  const player = useWavePlayer({
    url: playbackEnabled ? trackAudioUrl(track.id) : null,
    waveColor: "rgba(255,255,255,0.22)",
    progressColor: m.primary,
    autoplay: mounted && autoTransition,
  });

  const dur = track.duration_sec ?? player.duration ?? 0;
  const pos = player.currentTime;
  const bpmAlts = asBpmAlts(track.bpm_alternatives);
  const keyAlts = asKeyAlts(track.key_alternatives);
  const word = moodWord(m);
  const title = track.title ?? t("untitled");

  return (
    <div
      className="relative flex h-full min-h-screen w-full flex-col"
      style={{ overflow: "hidden" }}
    >
      <Aurora
        blobs={blobs}
        speed={speed}
        base={`radial-gradient(120% 120% at 50% 30%, ${m.deep} 0%, #0a0712 55%, #050409 100%)`}
      />

      {/* top bar */}
      <div className="relative z-[2] flex items-center px-[34px] py-[22px]">
        <Link
          href="/"
          className="kf-glass-soft flex items-center gap-2 rounded-full py-2 pl-[11px] pr-3.5 text-[13.5px] font-medium text-ink-muted"
        >
          <ChevronLeft size={16} /> {t("backHome")}
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[12.5px] text-ink-subtle">
          <Sparkles size={14} style={{ color: m.primary }} />
          {t("moodFrom")}{" "}
          <span style={{ color: m.primary, fontWeight: 600 }}>
            {t(`label_${m.label}`)} {m.hue}&deg;
          </span>
        </div>
      </div>

      {/* result card */}
      <div className="relative z-[2] flex flex-1 items-center justify-center px-10 pb-6">
        <GlassPanel
          className="flex w-[1000px] max-w-full gap-[26px] rounded-[30px] p-[22px]"
          style={{
            boxShadow: `0 40px 110px -30px rgba(0,0,0,0.9), 0 0 90px -30px ${m.glow}`,
          }}
        >
          {/* artwork */}
          <div className="relative w-[320px] flex-none">
            <div
              className="relative h-[320px] w-[320px] overflow-hidden rounded-[22px]"
              style={{ border: "1px solid var(--kf-line-2, rgba(255,255,255,0.16))" }}
            >
              {track.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.thumbnail_url}
                  alt={title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${m.primary}, ${m.deep} 70%)` }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(0,0,0,0.16) 0 11px, transparent 11px 22px)",
                      mixBlendMode: "overlay",
                    }}
                  />
                </>
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3), transparent 55%)",
                }}
              />

              {playbackEnabled && (
                <>
                  {/* play / pause overlay */}
                  <button
                    type="button"
                    onClick={player.playPause}
                    disabled={!player.isReady}
                    className="absolute inset-0 flex items-center justify-center disabled:opacity-70"
                    aria-label={player.isPlaying ? t("pause") : t("play")}
                  >
                    <span
                      className="flex h-[86px] w-[86px] items-center justify-center rounded-full text-white"
                      style={{
                        background: "rgba(10,9,18,0.42)",
                        backdropFilter: "blur(8px)",
                        border: "1.5px solid rgba(255,255,255,0.55)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                      }}
                    >
                      {player.isPlaying ? (
                        <Pause size={32} fill="currentColor" />
                      ) : (
                        <Play size={32} fill="currentColor" />
                      )}
                    </span>
                  </button>
                  {/* now playing eq */}
                  {player.isPlaying && (
                    <div className="absolute bottom-[13px] left-[14px] flex items-center gap-[9px]">
                      <EQ color="#fff" bars={5} h={16} bpm={track.bpm ?? 120} />
                      <span className="text-[11.5px] font-semibold text-white/85">
                        {t("nowPlaying")}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* mood readout under art */}
            <div className="mt-3.5 flex items-center justify-between px-0.5">
              <span className="text-[12.5px] text-ink-muted">{t("mood")}</span>
              <span className="text-[13px] font-semibold" style={{ color: m.primary }}>
                {t(`tone_${word.tone}`)} &middot; {t(`energy_${word.energy}`)}
              </span>
            </div>
          </div>

          {/* info */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className="kf-mono flex items-center gap-[7px] text-[11px] font-semibold tracking-[0.18em]"
              style={{ color: "hsl(150 70% 60%)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }}
              />
              {t("justAnalyzed")}
            </div>
            <h1 className="m-0 mb-[3px] mt-2.5 text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
              {title}
            </h1>
            <div className="flex items-center gap-2.5 text-[13.5px] text-ink-muted">
              <span className="kf-mono">{fmtDur(dur)}</span>
              <span className="opacity-40">&middot;</span>
              <a
                href={track.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-[5px] hover:text-ink"
              >
                <ExternalLink size={13} /> {t("youtube")}
              </a>
            </div>

            {/* big readouts */}
            <div className="mt-[22px] flex gap-3.5">
              <Readout
                label={t("bpm")}
                value={track.bpm != null ? `${track.bpm}` : "--"}
                conf={track.bpm_confidence ?? 0}
                alt={
                  bpmAlts[0]
                    ? { text: `${bpmAlts[0].bpm}`, label: t(`reason_${bpmAlts[0].reason}`) }
                    : null
                }
                mono
              />
              <Readout
                label={t("key")}
                value={track.key ?? "--"}
                conf={track.key_confidence ?? 0}
                alt={
                  keyAlts[0]
                    ? { text: keyAlts[0].key, label: t(`reason_${keyAlts[0].reason}`) }
                    : null
                }
                chip={track.key ? <KeyChip keyName={track.key} bpm={track.bpm} /> : undefined}
              />
            </div>

            <div className="flex-1" />

            {/* waveform + time */}
            <div className="mt-[22px]">
              {playbackEnabled ? (
                <>
                  <div
                    ref={player.containerRef}
                    className="h-[44px] w-full cursor-pointer"
                    role="slider"
                    aria-label={t("seek")}
                    aria-valuenow={Math.round(pos)}
                    aria-valuemax={Math.round(dur) || 1}
                    tabIndex={0}
                  />
                  {!player.isReady && (
                    <div className="kf-mono mt-1 text-[11px] text-ink-subtle">
                      {player.error ? t("audioError") : t("loadingAudio")}
                    </div>
                  )}
                  <div className="kf-mono mt-[7px] flex justify-between text-[11.5px] text-ink-subtle">
                    <span style={{ color: m.primary }}>{fmtDur(pos)}</span>
                    <span>-{fmtDur(Math.max(0, dur - pos))}</span>
                  </div>
                </>
              ) : (
                <div className="kf-mono text-[12px] text-ink-subtle">
                  {hasAudio ? t("downloadOnly") : t("noAudioYet")}
                </div>
              )}
            </div>

            {/* controls */}
            <div className="mt-[18px] flex items-center gap-3.5">
              {playbackEnabled && (
                <button
                  type="button"
                  onClick={player.playPause}
                  disabled={!player.isReady}
                  className="flex h-[58px] w-[58px] items-center justify-center rounded-full text-[#0a0912] disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.82))",
                    boxShadow: `0 12px 36px -8px ${m.glow}`,
                  }}
                  aria-label={player.isPlaying ? t("pause") : t("play")}
                >
                  {player.isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" />
                  )}
                </button>
              )}
              <div className="flex-1" />
              <DownloadButton track={track} mood={m} defaultFormat={defaultExportFormat} />
            </div>

            <div className="kf-mono mt-3 flex items-center gap-[7px] text-[11.5px] text-ink-subtle">
              <Download size={12} />
              <span className="text-ink-muted">
                [{track.bpm != null ? Math.round(track.bpm) : "--"}][
                {track.key ? keyAbbrev(track.key) : "--"}] {title}.wav
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

interface ReadoutProps {
  label: string;
  value: string;
  conf: number;
  alt: { text: string; label: string } | null;
  mono?: boolean;
  chip?: React.ReactNode;
}

function Readout({ label, value, conf, alt, mono, chip }: ReadoutProps) {
  return (
    <GlassPanel variant="soft" className="flex-1 rounded-[18px] px-[17px] py-[15px]">
      <div className="flex items-center justify-between">
        <span className="kf-mono text-[10.5px] font-semibold tracking-[0.18em] text-ink-subtle">
          {label}
        </span>
        <Confidence value={conf} compact />
      </div>
      <div className="mt-[9px] flex items-baseline gap-2">
        {chip ? (
          <div className="text-[27px] font-semibold tracking-[-0.01em] text-white">{value}</div>
        ) : (
          <div
            className={
              (mono ? "kf-mono " : "") +
              "text-[38px] font-semibold leading-none tracking-[-0.02em] text-white"
            }
          >
            {value}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11.5px] text-ink-subtle">{"alt"}</span>
        {alt ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border px-[9px] py-1 text-[11.5px] font-semibold text-ink-muted"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="kf-mono">{alt.text}</span>
            <span className="opacity-60">{alt.label}</span>
          </span>
        ) : (
          <span className="text-[11.5px] text-ink-subtle opacity-60">&mdash;</span>
        )}
      </div>
    </GlassPanel>
  );
}

function DownloadButton({
  track,
  mood: m,
  defaultFormat,
}: {
  track: Track;
  mood: Mood;
  defaultFormat: "wav" | "mp3";
}) {
  const t = useTranslations("player");
  const [open, setOpen] = React.useState(false);
  const hasAudio = Boolean(track.audio_path_wav);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!hasAudio) {
    return (
      <span className="kf-mono text-[12px] text-ink-subtle">{t("noAudioYet")}</span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-stretch overflow-hidden rounded-[14px]"
        style={{ boxShadow: `0 12px 30px -10px ${m.glow}` }}
      >
        <a
          href={trackDownloadUrl(track.id, defaultFormat)}
          className="flex items-center gap-[9px] px-5 py-3.5 text-[14.5px] font-semibold text-[#0a0912]"
          style={{ background: `linear-gradient(120deg, ${m.primary}, ${m.accent})` }}
        >
          <Download size={17} strokeWidth={2.3} /> {t("downloadFormat", { format: defaultFormat.toUpperCase() })}
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("chooseFormat")}
          className="flex items-center px-3 text-[#0a0912]"
          style={{ borderLeft: "1px solid rgba(0,0,0,0.18)", background: m.accent }}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
      </div>
      {open && (
        <GlassPanel className="absolute bottom-[calc(100%+8px)] right-0 z-10 w-[150px] overflow-hidden rounded-[12px] p-1">
          {(["wav", "mp3"] as const).map((fmt) => (
            <a
              key={fmt}
              href={trackDownloadUrl(track.id, fmt)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            >
              <Download size={13} /> {t("downloadFormat", { format: fmt.toUpperCase() })}
            </a>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const t = useTranslations("player");
  return (
    <div className="relative flex h-full min-h-screen w-full flex-col items-center justify-center px-10 text-center">
      <Aurora
        blobs={[
          { x: "20%", y: "10%", size: 480, color: "hsl(280 85% 58%)", anim: "kfDrift1", dur: 18, opacity: 0.5 },
          { x: "60%", y: "40%", size: 420, color: "hsl(200 85% 58%)", anim: "kfDrift2", dur: 22, opacity: 0.45 },
        ]}
      />
      <div className="relative z-[2] flex flex-col items-center gap-4">
        <Sparkles size={28} style={{ color: "hsl(280 85% 70%)" }} />
        <p className="max-w-[420px] text-[16px] text-ink-muted">{message}</p>
        <Link
          href="/"
          className="kf-glass-soft rounded-full px-5 py-2.5 text-[14px] font-semibold text-ink"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative flex h-full min-h-screen w-full items-center justify-center">
      <Aurora
        blobs={[
          { x: "20%", y: "10%", size: 480, color: "hsl(280 85% 58%)", anim: "kfDrift1", dur: 18, opacity: 0.4 },
        ]}
      />
      <span
        className="relative z-[2] h-8 w-8 rounded-full border-2 border-white/20"
        style={{ borderTopColor: "#fff", animation: "kfSpin 0.8s linear infinite" }}
      />
    </div>
  );
}
