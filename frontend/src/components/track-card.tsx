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

// ─── Waveform decoration ──────────────────────────────────────────────────────

function WaveformDecor({ trackId, color }: { trackId: string; color: string }) {
  const heights = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < trackId.length; i++) h = (h * 31 + trackId.charCodeAt(i)) >>> 0;
    return Array.from({ length: 28 }, (_, i) => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return 18 + (h % 72);
    });
  }, [trackId]);

  return (
    <div className="flex items-end gap-[2px] h-[32px] px-1 w-full">
      {heights.map((ht, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${ht}%`, background: color, opacity: 0.45 }}
        />
      ))}
    </div>
  );
}

// ─── More menu ────────────────────────────────────────────────────────────────

interface MoreMenuProps {
  track: Track;
  playlists: Playlist[];
  currentPlaylistId?: string;
  onCorrect: () => void;
  onClose: () => void;
}

function MoreMenu({ track, playlists, currentPlaylistId, onCorrect, onClose }: MoreMenuProps) {
  const t = useTranslations("library");
  const [subMenu, setSubMenu] = React.useState<"playlist" | "tags" | "confirmDelete" | null>(null);
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

  function handleReanalyze() {
    reanalyze.mutate(track.id);
    onClose();
  }

  function handleDelete() {
    deleteTrack.mutate(track.id);
    onClose();
  }

  function handleAddToPlaylist(playlistId: string) {
    addToPlaylist.mutate({ playlistId, trackId: track.id });
    onClose();
  }

  function handleRemoveFromPlaylist() {
    if (currentPlaylistId) removeFromPlaylist.mutate({ playlistId: currentPlaylistId, trackId: track.id });
    onClose();
  }

  function handleCreateAndAttachTag() {
    if (!newTagName.trim()) return;
    createTag.mutate(newTagName.trim(), {
      onSuccess: (tag) => attachTag.mutate({ tagId: tag.id, trackId: track.id }),
    });
    setNewTagName("");
  }

  const trackTagIds = new Set(track.tags.map((t) => t.id));

  return (
    <div ref={ref} className="relative">
      {subMenu === "confirmDelete" ? (
        <GlassPanel className="kf-track-menu absolute bottom-full right-0 z-20 mb-1 min-w-[180px] rounded-[14px] p-3">
          <p className="text-[12.5px] text-ink-muted mb-3">{t("deleteTrack")}?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSubMenu(null)}
              className="flex-1 rounded-lg py-1.5 text-[12px] text-ink-muted"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {t("confirmDeleteNo")}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-lg py-1.5 text-[12px] font-semibold"
              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              {t("confirmDeleteYes")}
            </button>
          </div>
        </GlassPanel>
      ) : subMenu === "playlist" ? (
        <GlassPanel className="kf-track-menu absolute bottom-full right-0 z-20 mb-1 min-w-[200px] rounded-[14px] p-1.5">
          <p className="kf-mono px-3 py-1.5 text-[10.5px] text-ink-subtle tracking-widest">
            {t("addToPlaylist")}
          </p>
          {playlists.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-ink-subtle">{t("noPlaylists")}</p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
              >
                <Plus size={12} /> {pl.name}
              </button>
            ))
          )}
          <button
            onClick={() => setSubMenu(null)}
            className="mt-1 flex w-full items-center justify-center rounded-lg py-1.5 text-[11.5px] text-ink-subtle hover:text-ink-muted border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            ← {t("cancelAction")}
          </button>
        </GlassPanel>
      ) : subMenu === "tags" ? (
        <GlassPanel className="kf-track-menu absolute bottom-full right-0 z-20 mb-1 min-w-[220px] rounded-[14px] p-1.5">
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
            onClick={() => setSubMenu(null)}
            className="mt-1 flex w-full items-center justify-center rounded-lg py-1.5 text-[11.5px] text-ink-subtle hover:text-ink-muted border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            ← {t("cancelAction")}
          </button>
        </GlassPanel>
      ) : (
        <GlassPanel className="kf-track-menu absolute bottom-full right-0 z-20 mb-1 min-w-[200px] rounded-[14px] p-1.5">
          <Link
            href={`/player?track=${track.id}`}
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <Play size={13} /> {t("openPlayer")}
          </Link>
          <button
            onClick={() => setSubMenu("playlist")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <Plus size={13} /> {t("addToPlaylist")}
          </button>
          {currentPlaylistId && (
            <button
              onClick={handleRemoveFromPlaylist}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            >
              <HeartOff size={13} /> {t("removeFromPlaylist")}
            </button>
          )}
          <button
            onClick={() => setSubMenu("tags")}
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
            onClick={handleReanalyze}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <RefreshCw size={13} /> {t("reanalyze")}
          </button>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <button
            onClick={() => setSubMenu("confirmDelete")}
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

// ─── Download split button ────────────────────────────────────────────────────

function DownloadSplit({ track, moodPrimary, moodAccent }: { track: Track; moodPrimary: string; moodAccent: string }) {
  const t = useTranslations("library");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-stretch overflow-hidden rounded-[10px]">
        <a
          href={trackDownloadUrl(track.id, "wav")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#0a0912]"
          style={{ background: `linear-gradient(120deg, ${moodPrimary}, ${moodAccent})` }}
          title={t("download")}
        >
          <Download size={13} strokeWidth={2.3} />
          {t("downloadWav")}
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center px-1.5 text-[#0a0912]"
          style={{ borderLeft: "1px solid rgba(0,0,0,0.18)", background: moodAccent }}
          aria-label="Choose format"
        >
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>
      </div>
      {open && (
        <GlassPanel className="absolute bottom-full mb-1 right-0 z-10 w-[120px] rounded-[10px] p-1 overflow-hidden">
          {(["wav", "mp3"] as const).map((fmt) => (
            <a
              key={fmt}
              href={trackDownloadUrl(track.id, fmt)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            >
              <Download size={12} />
              {fmt === "wav" ? t("downloadWav") : t("downloadMp3")}
            </a>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}

// ─── TrackCard (grid view) ────────────────────────────────────────────────────

export interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onPlay: (id: string) => void;
  playlists: Playlist[];
  currentPlaylistId?: string;
}

export function TrackCard({ track, isActive, onPlay, playlists, currentPlaylistId }: TrackCardProps) {
  const t = useTranslations("library");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [correcting, setCorrecting] = React.useState(false);
  const updateTrack = useUpdateTrack();

  const m = mood(track.key, track.bpm ?? undefined);

  const title = track.title ?? "Untitled";
  const bpmDisplay = track.bpm != null
    ? (Number.isInteger(track.bpm) ? String(track.bpm) : track.bpm.toFixed(1))
    : "—";

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    updateTrack.mutate({ id: track.id, patch: { is_favorite: !track.is_favorite } });
  }

  return (
    <>
      <GlassPanel
        className="touch-no-scale group relative flex flex-col overflow-visible rounded-[20px] transition-transform hover:scale-[1.01]"
        style={{ boxShadow: isActive ? `0 0 0 2px ${m.primary}, 0 20px 50px -12px rgba(0,0,0,0.8)` : "0 8px 30px -8px rgba(0,0,0,0.7)" }}
      >
        {/* Thumbnail / mood bg */}
        <div className="relative aspect-square overflow-hidden">
          {track.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.thumbnail_url}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${m.primary} 0%, ${m.deep} 70%)` }}
            />
          )}

          {/* gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(6,4,16,0.85) 0%, rgba(6,4,16,0.1) 50%, transparent 100%)",
            }}
          />

          {/* waveform decoration at bottom */}
          <div className="absolute bottom-0 left-0 right-0 pb-1 px-1">
            <WaveformDecor trackId={track.id} color={m.primary} />
          </div>

          {/* play button overlay */}
          <button
            type="button"
            onClick={() => onPlay(track.id)}
            className="touch-visible absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={t("play")}
          >
            <span
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-white"
              style={{
                background: "rgba(10,9,18,0.55)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,0.5)",
                boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 30px -8px ${m.glow}`,
              }}
            >
              <Play size={22} fill="currentColor" />
            </span>
          </button>

          {/* "now playing" EQ indicator */}
          {isActive && (
            <div className="absolute bottom-[10px] left-[11px] flex items-center gap-[7px]">
              <EQ color={m.primary} bars={4} h={14} bpm={track.bpm ?? 120} />
            </div>
          )}

          {/* manual indicator */}
          {(track.bpm_manual || track.key_manual) && (
            <div
              className="kf-mono absolute top-[10px] right-[10px] rounded-full px-2 py-0.5 text-[9.5px] font-semibold"
              style={{ background: "rgba(167,139,250,0.25)", color: "#c4b5fd" }}
            >
              {t("manualBadge")}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col p-3.5 flex-1">
          <h3 className="truncate text-[13.5px] font-semibold text-ink leading-tight">
            {title}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {track.key && <KeyChip keyName={track.key} bpm={track.bpm} size="sm" />}
            <span className="kf-mono text-[11.5px] text-ink-subtle">{bpmDisplay} bpm</span>
            {track.duration_sec != null && (
              <span className="kf-mono text-[11.5px] text-ink-subtle opacity-60">
                {fmtDur(track.duration_sec)}
              </span>
            )}
          </div>
          <div className="mt-2">
            {(track.bpm_confidence != null || track.key_confidence != null) && (
              <Confidence value={Math.min(track.bpm_confidence ?? 0, track.key_confidence ?? 1)} compact />
            )}
          </div>

          {/* Actions row */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap relative">
            {/* favorite */}
            <button
              type="button"
              onClick={toggleFavorite}
              className="kf-touch-target rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
              aria-label="Favorite"
            >
              <Heart
                size={13}
                fill={track.is_favorite ? "#f472b6" : "none"}
                style={{ color: track.is_favorite ? "#f472b6" : "rgba(255,255,255,0.45)" }}
              />
            </button>
            {/* YouTube */}
            <a
              href={track.source_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={t("openYoutube")}
              className="kf-touch-target rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
            >
              <ExternalLink size={13} />
            </a>

            {/* download */}
            {track.audio_path_wav && (
              <DownloadSplit track={track} moodPrimary={m.primary} moodAccent={m.accent} />
            )}

            <div className="flex-1" />

            {/* more menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                aria-label={t("trackActions")}
                aria-expanded={menuOpen}
                className="kf-touch-target rounded-lg text-ink-subtle hover:text-ink transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <MoreMenu
                  track={track}
                  playlists={playlists}
                  currentPlaylistId={currentPlaylistId}
                  onCorrect={() => setCorrecting(true)}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Tags (hover only) */}
          {track.tags.length > 0 && (
            <div className="mt-2 hidden group-hover:flex flex-wrap gap-1">
              {track.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
                  style={{ background: "rgba(167,139,250,0.18)", color: "#c4b5fd" }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* filename preview on hover */}
        <div
          className="hidden group-hover:block border-t px-3.5 py-2"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <span className="kf-mono text-[10px] text-ink-subtle truncate block">
            [{bpmDisplay}][{track.key ? keyAbbrev(track.key) : "—"}] {title}.wav
          </span>
        </div>
      </GlassPanel>

      {/* Correction modal */}
      {correcting && (
        <CorrectionModal track={track} onClose={() => setCorrecting(false)} />
      )}
    </>
  );
}
