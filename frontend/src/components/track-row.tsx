"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Heart,
  HeartOff,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { CorrectionModal } from "@/components/correction-modal";
import { GlassPanel } from "@/components/glass-panel";
import { KeyChip } from "@/components/key-chip";
import { Confidence } from "@/components/confidence";
import { EQ } from "@/components/eq";
import {
  trackDownloadUrl,
  type Playlist,
  type Tag,
  type Track,
} from "@/lib/api/client";
import {
  useUpdateTrack,
  useDeleteTrack,
  useReanalyzeTrack,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
  useAttachTag,
  useDetachTag,
  useCreateTag,
  useTags,
} from "@/lib/api/hooks";
import { fmtDur, keyAbbrev, mood } from "@/lib/mood";
import { cn } from "@/lib/utils";

// ─── Inline more-menu for list rows ──────────────────────────────────────────

interface RowMenuProps {
  track: Track;
  playlists: Playlist[];
  currentPlaylistId?: string;
  onCorrect: () => void;
  onClose: () => void;
}

function RowMenu({ track, playlists, currentPlaylistId, onCorrect, onClose }: RowMenuProps) {
  const t = useTranslations("library");
  const [step, setStep] = React.useState<"main" | "playlist" | "tags" | "confirmDelete">("main");
  const ref = React.useRef<HTMLDivElement>(null);

  const reanalyze = useReanalyzeTrack();
  const deleteTrack = useDeleteTrack();
  const addToPlaylist = useAddTrackToPlaylist();
  const removeFromPlaylist = useRemoveTrackFromPlaylist();
  const attachTag = useAttachTag();
  const detachTag = useDetachTag();
  const createTag = useCreateTag();
  const { data: allTags } = useTags();
  const [newTagName, setNewTagName] = React.useState("");

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  const trackTagIds = new Set(track.tags.map((t) => t.id));

  function handleCreateAndAttachTag() {
    if (!newTagName.trim()) return;
    createTag.mutate(newTagName.trim(), {
      onSuccess: (tag) => attachTag.mutate({ tagId: tag.id, trackId: track.id }),
    });
    setNewTagName("");
  }

  return (
    <div ref={ref}>
      {step === "confirmDelete" ? (
        <GlassPanel className="kf-track-menu absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-[14px] p-3">
          <p className="text-[12.5px] text-ink-muted mb-3">{t("deleteTrack")}?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("main")}
              className="flex-1 rounded-lg py-1.5 text-[12px] text-ink-muted"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {t("confirmDeleteNo")}
            </button>
            <button
              onClick={() => { deleteTrack.mutate(track.id); onClose(); }}
              className="flex-1 rounded-lg py-1.5 text-[12px] font-semibold"
              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              {t("confirmDeleteYes")}
            </button>
          </div>
        </GlassPanel>
      ) : step === "playlist" ? (
        <GlassPanel className="kf-track-menu absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-[14px] p-1.5">
          <p className="kf-mono px-3 py-1.5 text-[10.5px] text-ink-subtle tracking-widest">
            {t("addToPlaylist")}
          </p>
          {playlists.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-ink-subtle">{t("noPlaylists")}</p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => { addToPlaylist.mutate({ playlistId: pl.id, trackId: track.id }); onClose(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
              >
                <Plus size={12} /> {pl.name}
              </button>
            ))
          )}
          <button
            onClick={() => setStep("main")}
            className="mt-1 flex w-full items-center justify-center rounded-lg py-1.5 text-[11.5px] text-ink-subtle hover:text-ink-muted border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            ← {t("cancelAction")}
          </button>
        </GlassPanel>
      ) : step === "tags" ? (
        <GlassPanel className="kf-track-menu absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-[14px] p-1.5">
          <p className="kf-mono px-3 py-1.5 text-[10.5px] text-ink-subtle tracking-widest">
            {t("tagLabel")}
          </p>
          {(allTags ?? []).map((tag: Tag) => {
            const attached = trackTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() =>
                  attached
                    ? detachTag.mutate({ tagId: tag.id, trackId: track.id })
                    : attachTag.mutate({ tagId: tag.id, trackId: track.id })
                }
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[12.5px] hover:bg-white/[0.06]"
                style={{ color: attached ? "#a78bfa" : "rgba(255,255,255,0.55)" }}
              >
                <span>{tag.name}</span>
                {attached && <span className="text-[10px] opacity-70">✓</span>}
              </button>
            );
          })}
          <div className="mt-1 flex items-center gap-1.5 border-t px-2 pt-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAttachTag()}
              placeholder={t("tagNewName")}
              className="flex-1 rounded-lg bg-white/[0.07] px-2 py-1 text-[12px] text-ink outline-none placeholder:text-ink-subtle"
            />
            <button
              onClick={handleCreateAndAttachTag}
              disabled={!newTagName.trim()}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted disabled:opacity-40 hover:text-ink"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={() => setStep("main")}
            className="mt-1 flex w-full items-center justify-center rounded-lg py-1.5 text-[11.5px] text-ink-subtle hover:text-ink-muted border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            ← {t("cancelAction")}
          </button>
        </GlassPanel>
      ) : (
        <GlassPanel className="kf-track-menu absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-[14px] p-1.5">
          <Link
            href={`/player?track=${track.id}`}
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <Play size={13} /> {t("openPlayer")}
          </Link>
          <button
            onClick={() => setStep("playlist")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <Plus size={13} /> {t("addToPlaylist")}
          </button>
          {currentPlaylistId && (
            <button
              onClick={() => { removeFromPlaylist.mutate({ playlistId: currentPlaylistId, trackId: track.id }); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            >
              <HeartOff size={13} /> {t("removeFromPlaylist")}
            </button>
          )}
          <button
            onClick={() => setStep("tags")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <SlidersHorizontal size={13} /> {t("tagLabel")}
          </button>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <button
            onClick={() => { onCorrect(); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <SlidersHorizontal size={13} /> {t("correctBpmKey")}
          </button>
          <button
            onClick={() => { reanalyze.mutate(track.id); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <RefreshCw size={13} /> {t("reanalyze")}
          </button>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <button
            onClick={() => setStep("confirmDelete")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]"
            style={{ color: "#f87171" }}
          >
            <Trash2 size={13} /> {t("deleteTrack")}
          </button>
        </GlassPanel>
      )}
    </div>
  );
}

// ─── TrackRow (list view) ─────────────────────────────────────────────────────

export interface TrackRowProps {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  playlists: Playlist[];
  currentPlaylistId?: string;
  index: number;
}

export function TrackRow({
  track,
  isActive,
  isPlaying,
  onPlay,
  playlists,
  currentPlaylistId,
  index,
}: TrackRowProps) {
  const t = useTranslations("library");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [correcting, setCorrecting] = React.useState(false);
  const updateTrack = useUpdateTrack();

  const m = mood(track.key, track.bpm ?? undefined);
  const title = track.title ?? "Untitled";
  const bpmDisplay =
    track.bpm != null
      ? Number.isInteger(track.bpm)
        ? String(track.bpm)
        : track.bpm.toFixed(1)
      : "—";

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    updateTrack.mutate({ id: track.id, patch: { is_favorite: !track.is_favorite } });
  }

  return (
    <>
      <div
        className={cn(
          "group grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 rounded-[14px] px-2 py-2.5 transition-colors lg:flex lg:gap-3 lg:px-3",
          isActive
            ? "bg-white/[0.08]"
            : "hover:bg-white/[0.04]",
        )}
        style={isActive ? { boxShadow: `inset 0 0 0 1px ${m.primary}33` } : undefined}
      >
        {/* index / play button */}
        <div className="flex w-11 flex-none items-center justify-center lg:w-7">
          <button
            type="button"
            onClick={() => onPlay(track.id)}
            className="touch-visible kf-touch-target rounded-full text-ink-subtle opacity-0 transition-colors group-hover:opacity-100 hover:text-ink"
            aria-label={isPlaying ? t("pause") : t("play")}
          >
            {isActive && isPlaying ? (
              <Pause size={12} fill="currentColor" />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
          </button>
          {!isActive && (
            <span className="kf-mono hidden text-[11px] text-ink-subtle group-hover:hidden lg:inline">
              {index + 1}
            </span>
          )}
          {isActive && !isPlaying && (
            <EQ color={m.primary} bars={3} h={10} bpm={track.bpm ?? 120} />
          )}
        </div>

        {/* thumbnail */}
        <div className="hidden h-9 w-9 flex-none overflow-hidden rounded-lg lg:block">
          {track.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.thumbnail_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${m.primary}, ${m.deep})` }}
            />
          )}
        </div>

        {/* title + tags */}
        <div className="min-w-0 lg:flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium text-ink">{title}</span>
            {(track.bpm_manual || track.key_manual) && (
              <span
                className="kf-mono flex-none rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}
              >
                {t("manualBadge")}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 lg:hidden">
            {track.key && <KeyChip keyName={track.key} bpm={track.bpm} size="sm" />}
            <span className="kf-mono text-[11.5px] text-ink-muted">{bpmDisplay} BPM</span>
            <span className="kf-mono text-[11.5px] text-ink-subtle">
              {track.duration_sec != null ? fmtDur(track.duration_sec) : "—"}
            </span>
            {track.bpm_confidence != null && (
              <Confidence value={Math.min(track.bpm_confidence ?? 0, track.key_confidence ?? 1)} compact />
            )}
          </div>
          {track.tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {track.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md px-1.5 py-0 text-[10px] font-medium"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* key */}
        <div className="hidden w-[110px] flex-none lg:block">
          {track.key && <KeyChip keyName={track.key} bpm={track.bpm} size="sm" />}
        </div>

        {/* BPM */}
        <div className="hidden w-[62px] flex-none text-right lg:block">
          <span className="kf-mono text-[12.5px] text-ink-muted">{bpmDisplay}</span>
        </div>

        {/* confidence */}
        <div className="hidden w-[76px] flex-none justify-center lg:flex">
          {track.bpm_confidence != null && (
            <Confidence
              value={Math.min(track.bpm_confidence ?? 0, track.key_confidence ?? 1)}
              compact
            />
          )}
        </div>

        {/* duration */}
        <div className="hidden w-[48px] flex-none text-right lg:block">
          <span className="kf-mono text-[11.5px] text-ink-subtle">
            {track.duration_sec != null ? fmtDur(track.duration_sec) : "—"}
          </span>
        </div>

        {/* actions */}
        <div className="flex flex-none items-center justify-end gap-1">
          <button
            type="button"
            onClick={toggleFavorite}
            className="touch-visible kf-touch-target hidden rounded-lg opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Heart
              size={13}
              fill={track.is_favorite ? "#f472b6" : "none"}
              style={{ color: track.is_favorite ? "#f472b6" : "rgba(255,255,255,0.45)" }}
            />
          </button>
          <a
            href={track.source_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={t("openYoutube")}
            className="touch-visible kf-touch-target hidden rounded-lg opacity-0 transition-opacity group-hover:opacity-100 lg:flex"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
          >
            <ExternalLink size={12} />
          </a>
          {track.audio_path_wav && (
            <a
              href={trackDownloadUrl(track.id, "wav")}
              title={t("download")}
              onClick={(e) => e.stopPropagation()}
              className="touch-visible kf-touch-target hidden rounded-lg opacity-0 transition-opacity group-hover:opacity-100 lg:flex"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
            >
              <Download size={12} />
            </a>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label={t("trackActions")}
              aria-expanded={menuOpen}
              className="touch-visible kf-touch-target rounded-lg text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <RowMenu
                track={track}
                playlists={playlists}
                currentPlaylistId={currentPlaylistId}
                onCorrect={() => setCorrecting(true)}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {correcting && (
        <CorrectionModal track={track} onClose={() => setCorrecting(false)} />
      )}
    </>
  );
}
