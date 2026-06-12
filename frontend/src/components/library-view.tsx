"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Heart,
  LayoutGrid,
  List,
  ListMusic,
  Menu,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Aurora, type AuroraBlob } from "@/components/aurora";
import { GlassPanel } from "@/components/glass-panel";
import { TrackCard } from "@/components/track-card";
import { TrackRow } from "@/components/track-row";
import { trackAudioUrl, type Playlist, type Track } from "@/lib/api/client";
import {
  useTracks,
  usePlaylists,
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
} from "@/lib/api/hooks";
import { fmtDur, mood } from "@/lib/mood";
import { useUiStore } from "@/lib/store";
import { useWavePlayer } from "@/lib/use-wave-player";
import { cn } from "@/lib/utils";

// ─── Aurora blobs ─────────────────────────────────────────────────────────────

const BLOBS: AuroraBlob[] = [
  { x: "5%",  y: "-20%", size: 560, color: "hsl(260 65% 42%)", anim: "kfDrift1", dur: 32, opacity: 0.28 },
  { x: "70%", y: "10%",  size: 480, color: "hsl(200 70% 40%)", anim: "kfDrift2", dur: 38, opacity: 0.22 },
  { x: "35%", y: "60%",  size: 420, color: "hsl(300 60% 38%)", anim: "kfDrift3", dur: 28, opacity: 0.18 },
];

// ─── Sort options ─────────────────────────────────────────────────────────────

type SortField = "created_at" | "title" | "bpm" | "key" | "bpm_confidence";
type SortOrder = "asc" | "desc";
type Section = "all" | "favorites" | string; // string = playlist id

// ─── Playlist dialogs ─────────────────────────────────────────────────────────

function PlaylistNameDialog({
  initial,
  onSave,
  onCancel,
}: {
  initial?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("library");
  const [name, setName] = React.useState(initial ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && name.trim()) onSave(name.trim());
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="px-3 py-2.5">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("playlistNameLabel")}
        className="w-full rounded-lg bg-white/[0.07] px-3 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-ink-subtle border"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg py-1 text-[11.5px] text-ink-subtle"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {t("cancelAction")}
        </button>
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="flex-1 rounded-lg py-1 text-[11.5px] font-semibold text-[#0a0912] disabled:opacity-40"
          style={{ background: "linear-gradient(120deg, #c084fc, #818cf8)" }}
        >
          {initial ? t("saveAction") : t("createPlaylistAction")}
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  section: Section;
  onSectionChange: (s: Section) => void;
  playlists: Playlist[];
  allCount: number;
  favoritesCount: number;
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

function Sidebar({
  section,
  onSectionChange,
  playlists,
  allCount,
  favoritesCount,
  collapsed,
  onToggle,
  mobile = false,
  onClose,
}: SidebarProps) {
  const t = useTranslations("library");
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const [creating, setCreating] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [playlistMenuId, setPlaylistMenuId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPlaylistMenuId(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const effectiveCollapsed = mobile ? false : collapsed;
  const w = effectiveCollapsed ? 62 : 224;

  return (
    <div
      className={cn(
        "relative z-[3] flex h-full flex-none flex-col overflow-hidden border-r border-line transition-all duration-200",
        mobile && "w-full border-r-0",
      )}
      style={{
        width: mobile ? "100%" : w,
        minWidth: mobile ? 0 : w,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={cn("items-center justify-end p-3 text-ink-subtle hover:text-ink transition-colors", mobile ? "hidden" : "flex")}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* sections */}
      <div className="flex flex-col gap-0.5 px-2">
        <SidebarItem
          icon={<Disc3 size={17} />}
          label={t("allTracks")}
          count={allCount}
          active={section === "all"}
          collapsed={effectiveCollapsed}
          onClick={() => { onSectionChange("all"); onClose?.(); }}
        />
        <SidebarItem
          icon={<Heart size={17} />}
          label={t("favorites")}
          count={favoritesCount}
          active={section === "favorites"}
          collapsed={effectiveCollapsed}
          onClick={() => { onSectionChange("favorites"); onClose?.(); }}
        />
      </div>

      {/* playlists divider */}
      {!effectiveCollapsed && (
        <div className="mx-4 my-3 flex items-center gap-2">
          <div className="flex-1 border-t border-line opacity-40" />
          <span className="kf-mono text-[9.5px] font-semibold tracking-[0.18em] text-ink-subtle">
            {t("playlists").toUpperCase()}
          </span>
          <div className="flex-1 border-t border-line opacity-40" />
        </div>
      )}
      {effectiveCollapsed && <div className="mx-3 my-2 border-t border-line opacity-25" />}

      {/* playlist list */}
      <div className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
        {playlists.map((pl) => (
          <div key={pl.id} className="group/pl relative flex items-center gap-1">
            {renamingId === pl.id && !effectiveCollapsed ? (
              <div className="flex-1">
                <PlaylistNameDialog
                  initial={pl.name}
                  onSave={(name) => {
                    updatePlaylist.mutate({ id: pl.id, name });
                    setRenamingId(null);
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => { onSectionChange(pl.id); onClose?.(); }}
                  className={cn(
                    "flex flex-1 items-center gap-2.5 rounded-[10px] px-2 py-2 text-[12.5px] transition-colors min-w-0",
                    section === pl.id
                      ? "bg-white/[0.1] text-ink"
                      : "text-ink-subtle hover:bg-white/[0.05] hover:text-ink-muted",
                  )}
                >
                  <ListMusic size={15} className="flex-none" />
                  {!effectiveCollapsed && (
                    <span className="truncate">{pl.name}</span>
                  )}
                </button>
                {!effectiveCollapsed && (
                  <div className="relative flex-none" ref={playlistMenuId === pl.id ? menuRef : undefined}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlaylistMenuId(playlistMenuId === pl.id ? null : pl.id);
                      }}
                      className="hidden group-hover/pl:flex h-6 w-6 items-center justify-center rounded-lg text-ink-subtle hover:text-ink"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <MoreHorizontal size={12} />
                    </button>
                    {playlistMenuId === pl.id && (
                      <GlassPanel className="absolute left-full top-0 ml-1 z-20 min-w-[150px] rounded-[12px] p-1">
                        <button
                          onClick={() => { setRenamingId(pl.id); setPlaylistMenuId(null); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
                        >
                          <Pencil size={11} /> {t("renamePlaylist")}
                        </button>
                        <button
                          onClick={() => {
                            deletePlaylist.mutate(pl.id);
                            if (section === pl.id) onSectionChange("all");
                            setPlaylistMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] hover:bg-white/[0.06]"
                          style={{ color: "#f87171" }}
                        >
                          <Trash2 size={11} /> {t("deletePlaylist")}
                        </button>
                      </GlassPanel>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* New playlist */}
        {creating && !effectiveCollapsed ? (
          <PlaylistNameDialog
            onSave={(name) => {
              createPlaylist.mutate(name);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-1 flex items-center gap-2 rounded-[10px] px-2 py-2 text-[12px] text-ink-subtle hover:text-ink-muted transition-colors"
          >
            <Plus size={14} className="flex-none" />
            {!effectiveCollapsed && <span>{t("newPlaylist")}</span>}
          </button>
        )}
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-[12.5px] transition-colors",
        active
          ? "bg-white/[0.1] text-ink"
          : "text-ink-subtle hover:bg-white/[0.05] hover:text-ink-muted",
      )}
    >
      <span className="flex-none">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {count > 0 && (
            <span
              className="kf-mono flex-none rounded-full px-1.5 py-0.5 text-[9.5px]"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  sort: SortField;
  order: SortOrder;
  onSort: (f: SortField) => void;
  onOrder: (o: SortOrder) => void;
  filterKey: string;
  onFilterKey: (k: string) => void;
  view: "cards" | "list";
  onViewToggle: () => void;
  onClear: () => void;
}

const SORT_FIELDS: { value: SortField; labelKey: string }[] = [
  { value: "created_at", labelKey: "sortDate" },
  { value: "title",      labelKey: "sortTitle" },
  { value: "bpm",        labelKey: "sortBpm" },
  { value: "key",        labelKey: "sortKey" },
  { value: "bpm_confidence", labelKey: "sortConfidence" },
];

const COMMON_KEYS = [
  "C Major","C Minor","C# Major","C# Minor","Db Major","Db Minor",
  "D Major","D Minor","Eb Major","Eb Minor","E Major","E Minor",
  "F Major","F Minor","F# Major","F# Minor","Gb Major","Gb Minor",
  "G Major","G Minor","Ab Major","Ab Minor","A Major","A Minor",
  "Bb Major","Bb Minor","B Major","B Minor",
];

function Toolbar({
  search, onSearch, sort, order, onSort, onOrder,
  filterKey, onFilterKey, view, onViewToggle,
  onClear,
}: ToolbarProps) {
  const t = useTranslations("library");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [keyOpen, setKeyOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const keyRef  = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (keyRef.current  && !keyRef.current.contains(e.target as Node))  setKeyOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const sortLabel = t(SORT_FIELDS.find((f) => f.value === sort)?.labelKey ?? "sortDate");

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      {/* search */}
      <div
        className="col-span-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3 py-2 sm:min-w-[180px]"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Search size={14} className="flex-none text-ink-subtle" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("search")}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-subtle outline-none"
        />
        {search && (
          <button onClick={() => onSearch("")} className="flex-none text-ink-subtle hover:text-ink">
            <X size={13} />
          </button>
        )}
      </div>

      {/* sort dropdown */}
      <div ref={sortRef} className="relative min-w-0">
        <button
          type="button"
          onClick={() => { setSortOpen((v) => !v); setKeyOpen(false); }}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] px-2 py-2 text-[12.5px] text-ink-muted hover:text-ink sm:w-auto sm:px-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <SlidersHorizontal size={13} />
          <span className="truncate">{t("sortBy")}: {sortLabel}</span>
          <ChevronDown size={12} className={sortOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
        {sortOpen && (
          <GlassPanel className="kf-bottom-sheet fixed inset-x-3 bottom-[calc(var(--kf-nav-mobile-h)+env(safe-area-inset-bottom)+12px)] z-40 rounded-[18px] p-2 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-1 sm:min-w-[200px] sm:rounded-[14px] sm:p-1.5">
            {SORT_FIELDS.map((f) => (
              <button
                key={f.value}
                onClick={() => { onSort(f.value); setSortOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]",
                  sort === f.value ? "text-ink" : "text-ink-muted",
                )}
              >
                {t(f.labelKey)}
                {sort === f.value && <span className="text-[11px] opacity-60">{order === "asc" ? "↑" : "↓"}</span>}
              </button>
            ))}
            <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
            <button
              onClick={() => { onOrder("asc"); setSortOpen(false); }}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]",
                order === "asc" ? "text-ink" : "text-ink-muted")}
            >
              ↑ {t("orderAsc")}
            </button>
            <button
              onClick={() => { onOrder("desc"); setSortOpen(false); }}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]",
                order === "desc" ? "text-ink" : "text-ink-muted")}
            >
              ↓ {t("orderDesc")}
            </button>
          </GlassPanel>
        )}
      </div>

      {/* key filter */}
      <div ref={keyRef} className="relative min-w-0">
        <button
          type="button"
          onClick={() => { setKeyOpen((v) => !v); setSortOpen(false); }}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] px-2 py-2 text-[12.5px] hover:text-ink sm:w-auto sm:px-3",
            filterKey ? "text-ink" : "text-ink-muted",
          )}
          style={{
            background: filterKey ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)",
            border: filterKey ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {t("filterKey")}: {filterKey || t("filterAny")}
          <ChevronDown size={12} />
        </button>
        {keyOpen && (
          <GlassPanel className="kf-bottom-sheet fixed inset-x-3 bottom-[calc(var(--kf-nav-mobile-h)+env(safe-area-inset-bottom)+12px)] z-40 max-h-[60dvh] overflow-y-auto rounded-[18px] p-2 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-1 sm:min-w-[200px] sm:rounded-[14px] sm:p-1.5">
            <button
              onClick={() => { onFilterKey(""); setKeyOpen(false); }}
              className={cn("flex w-full items-center rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]",
                !filterKey ? "text-ink" : "text-ink-muted")}
            >
              {t("filterAny")}
            </button>
            {COMMON_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => { onFilterKey(k); setKeyOpen(false); }}
                className={cn("flex w-full items-center rounded-lg px-3 py-2 text-[12.5px] hover:bg-white/[0.06]",
                  filterKey === k ? "text-ink" : "text-ink-muted")}
              >
                {k}
              </button>
            ))}
          </GlassPanel>
        )}
      </div>

      {/* view toggle */}
      <div
        className="col-span-2 flex min-h-11 items-center overflow-hidden rounded-[12px] sm:col-span-1"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          type="button"
          onClick={() => view !== "cards" && onViewToggle()}
          className={cn("flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] transition-colors sm:flex-none",
            view === "cards" ? "text-ink bg-white/[0.08]" : "text-ink-subtle hover:text-ink-muted")}
        >
          <LayoutGrid size={13} />
        </button>
        <button
          type="button"
          onClick={() => view !== "list" && onViewToggle()}
          className={cn("flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] transition-colors sm:flex-none",
            view === "list" ? "text-ink bg-white/[0.08]" : "text-ink-subtle hover:text-ink-muted")}
        >
          <List size={13} />
        </button>
      </div>
      {(search || filterKey) && (
        <button
          type="button"
          onClick={onClear}
          className="col-span-2 min-h-11 rounded-[12px] px-3 text-[12.5px] text-ink-muted sm:col-span-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}

// ─── Mini player (bottom bar) ─────────────────────────────────────────────────

function MiniPlayer({
  track,
  isPlayingExternal,
  onTogglePlay,
  onClose,
}: {
  track: Track;
  isPlayingExternal: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("library");
  const m = mood(track.key, track.bpm ?? undefined);
  const title = track.title ?? "Untitled";

  const player = useWavePlayer({
    url: trackAudioUrl(track.id),
    waveColor: "rgba(255,255,255,0.2)",
    progressColor: m.primary,
    autoplay: true,
  });

  const dur = player.duration;
  const pos = player.currentTime;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(var(--kf-nav-mobile-h)+env(safe-area-inset-bottom))] z-[30] lg:absolute lg:bottom-0"
      style={{ backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" }}
    >
      <GlassPanel
        className="mx-2 mb-2 grid grid-cols-[44px_minmax(0,1fr)_44px_44px] items-center gap-2 rounded-[16px] px-3 py-2 sm:mx-4 sm:mb-4 lg:flex lg:gap-4 lg:rounded-[18px] lg:px-4 lg:py-3"
        style={{
          boxShadow: `0 -4px 40px -8px rgba(0,0,0,0.6), 0 0 40px -20px ${m.glow}`,
          border: `1px solid ${m.primary}33`,
        }}
      >
        {/* thumbnail */}
        <div className="h-10 w-10 flex-none overflow-hidden rounded-lg">
          {track.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.thumbnail_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${m.primary}, ${m.deep})` }} />
          )}
        </div>

        {/* info */}
        <div className="min-w-0 lg:w-[180px] lg:flex-none">
          <div className="truncate text-[13px] font-semibold text-ink">{title}</div>
          <div className="kf-mono text-[11px] text-ink-subtle">
            {track.key ?? "—"} · {track.bpm != null ? `${Math.round(track.bpm)} BPM` : "—"}
          </div>
        </div>

        {/* play/pause */}
        <button
          type="button"
          onClick={player.playPause}
          disabled={!player.isReady}
          aria-label={player.isPlaying ? t("pause") : t("play")}
          className="kf-touch-target flex-none rounded-full text-[#0a0912] disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${m.primary}, ${m.accent})` }}
        >
          {player.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>

        {/* waveform */}
        <div className="col-span-4 row-start-2 hidden min-w-0 flex-1 flex-col gap-1 sm:flex lg:col-span-1 lg:row-auto">
          <div
            ref={player.containerRef}
            className="h-[30px] w-full cursor-pointer"
            role="slider"
            aria-label={t("seek")}
            aria-valuenow={Math.round(pos)}
            aria-valuemax={Math.round(dur) || 1}
            tabIndex={0}
          />
          {!player.isReady && (
            <span className="kf-mono text-[10px] text-ink-subtle">
              {player.error ? t("audioError") : t("loadingAudio")}
            </span>
          )}
        </div>

        {/* time */}
        <div className="hidden flex-none flex-col items-end gap-0.5 lg:flex">
          <span className="kf-mono text-[11px]" style={{ color: m.primary }}>{fmtDur(pos)}</span>
          <span className="kf-mono text-[11px] text-ink-subtle">{fmtDur(dur)}</span>
        </div>

        {/* open in player link */}
        <Link
          href={`/player?track=${track.id}`}
          className="col-span-4 row-start-3 hidden min-h-10 flex-none items-center justify-center rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:text-ink sm:flex lg:col-span-1 lg:row-auto lg:min-h-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {t("openPlayer")}
        </Link>

        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closePlayer")}
          className="kf-touch-target flex-none rounded-full text-ink-subtle hover:text-ink"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <X size={14} />
        </button>
      </GlassPanel>
    </div>
  );
}

// ─── List header (columns) ────────────────────────────────────────────────────

function ListHeader() {
  const t = useTranslations("library");
  return (
    <div className="hidden items-center gap-3 px-3 py-1.5 text-[11px] font-semibold tracking-widest text-ink-subtle kf-mono lg:flex">
      <div className="w-7 flex-none" />
      <div className="w-9 flex-none" />
      <div className="flex-1">{t("sortTitle").toUpperCase()}</div>
      <div className="w-[110px] flex-none">{t("sortKey").toUpperCase()}</div>
      <div className="w-[62px] flex-none text-right">{t("sortBpm").toUpperCase()}</div>
      <div className="w-[76px] flex-none text-center">{t("sortConfidence").toUpperCase()}</div>
      <div className="w-[48px] flex-none text-right">DUR</div>
      <div className="flex-none w-[120px]" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Disc3 size={36} className="mb-4 text-ink-subtle opacity-30" />
      <p className="max-w-[320px] text-[14px] text-ink-subtle">{message}</p>
      <Link
        href="/"
        className="mt-4 rounded-full px-5 py-2 text-[13px] font-semibold text-ink-muted hover:text-ink transition-colors"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        ← Home
      </Link>
    </div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function getSectionTitle(section: Section, playlists: Playlist[], t: (k: string) => string): string {
  if (section === "all") return t("allTracks");
  if (section === "favorites") return t("favorites");
  const pl = playlists.find((p) => p.id === section);
  return pl?.name ?? t("playlists");
}

// ─── Main LibraryView ─────────────────────────────────────────────────────────

export function LibraryView() {
  const t = useTranslations("library");
  const tCommon = useTranslations("common");

  const libraryView = useUiStore((s) => s.libraryView);
  const toggleLibraryView = useUiStore((s) => s.toggleLibraryView);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortField>("created_at");
  const [order, setOrder] = React.useState<SortOrder>("desc");
  const [filterKey, setFilterKey] = React.useState("");
  const [section, setSection] = React.useState<Section>("all");
  const [activeTrackId, setActiveTrackId] = React.useState<string | null>(null);
  const [mobileSectionsOpen, setMobileSectionsOpen] = React.useState(false);

  // Debounce search input
  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Build query params (only for all/favorites views; playlist is client-filtered)
  const isPlaylist = section !== "all" && section !== "favorites";
  const queryParams = {
    search: search || undefined,
    sort,
    order,
    favorite: section === "favorites" ? (true as const) : undefined,
    key: filterKey || undefined,
    status: "ready" as const,
  };

  const { data: tracks, isLoading, isError } = useTracks(isPlaylist ? { status: "ready" as const } : queryParams);
  const { data: playlists } = usePlaylists();

  // Compute display tracks
  const displayTracks = React.useMemo<Track[]>(() => {
    if (!tracks) return [];
    if (!isPlaylist) return tracks;
    // Playlist: filter by track IDs in the playlist, maintaining position order
    const pl = (playlists ?? []).find((p) => p.id === section);
    if (!pl) return [];
    const posMap = new Map(pl.track_associations.map((a) => [a.track_id, a.position]));
    return tracks
      .filter((t) => posMap.has(t.id))
      .sort((a, b) => (posMap.get(a.id) ?? 0) - (posMap.get(b.id) ?? 0));
  }, [tracks, playlists, section, isPlaylist]);

  // Filter by search/key in playlist mode
  const filteredTracks = React.useMemo<Track[]>(() => {
    if (!isPlaylist) return displayTracks;
    return displayTracks.filter((t) => {
      if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterKey && t.key !== filterKey) return false;
      return true;
    });
  }, [displayTracks, isPlaylist, search, filterKey]);

  const activeTrack = filteredTracks.find((t) => t.id === activeTrackId) ?? null;

  // Stats for sidebar
  const allCount = tracks?.length ?? 0;
  const favoritesCount = tracks?.filter((t) => t.is_favorite).length ?? 0;

  const sectionTitle = getSectionTitle(section, playlists ?? [], t);

  return (
    <div className="kf-viewport relative flex overflow-hidden lg:h-screen">
      <Aurora blobs={BLOBS} />

      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          section={section}
          onSectionChange={setSection}
          playlists={playlists ?? []}
          allCount={allCount}
          favoritesCount={favoritesCount}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {mobileSectionsOpen && (
        <>
          <button
            type="button"
            aria-label={t("closeSections")}
            onClick={() => setMobileSectionsOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
          <div className="kf-bottom-sheet fixed inset-x-0 bottom-0 z-50 h-[min(78dvh,680px)] rounded-t-[24px] border-t border-line lg:hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[15px] font-semibold text-ink">{t("sections")}</span>
              <button type="button" onClick={() => setMobileSectionsOpen(false)} className="kf-touch-target rounded-full text-ink-muted">
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-69px)]">
              <Sidebar
                section={section}
                onSectionChange={setSection}
                playlists={playlists ?? []}
                allCount={allCount}
                favoritesCount={favoritesCount}
                collapsed={false}
                onToggle={() => {}}
                mobile
                onClose={() => setMobileSectionsOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="relative z-[2] flex flex-1 flex-col min-w-0">
        {/* Page header */}
        <div className="flex-none px-4 pb-4 pt-5 sm:px-6 sm:pt-7 lg:px-7">
          <div className="mb-1 flex items-baseline gap-3">
            <span
              className="kf-mono text-[10.5px] font-semibold tracking-[0.22em]"
              style={{ color: "hsl(260 70% 72%)" }}
            >
              {t("kicker")}
            </span>
          </div>
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSectionsOpen(true)}
              className="kf-touch-target rounded-[12px] text-ink-muted lg:hidden"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              aria-label={t("openSections")}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
                {sectionTitle}
              </h1>
              <span className="kf-mono text-[12px] text-ink-subtle">
                {t("trackCount", { count: filteredTracks.length })}
              </span>
            </div>
          </div>
          <Toolbar
            search={searchInput}
            onSearch={setSearchInput}
            sort={sort}
            order={order}
            onSort={setSort}
            onOrder={setOrder}
            filterKey={filterKey}
            onFilterKey={setFilterKey}
            view={libraryView}
            onViewToggle={toggleLibraryView}
            onClear={() => { setSearchInput(""); setFilterKey(""); }}
          />
        </div>

        {/* Track list / grid (scrollable) */}
        <div
          className="kf-scrollable flex-1 px-4 sm:px-6 lg:px-7"
          style={{ paddingBottom: activeTrack ? 190 : 32 }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <span
                className="h-8 w-8 rounded-full border-2 border-white/20"
                style={{ borderTopColor: "#a78bfa", animation: "kfSpin 0.8s linear infinite" }}
              />
            </div>
          ) : isError ? (
            <EmptyState message={t("loadingError")} />
          ) : filteredTracks.length === 0 ? (
            <EmptyState
              message={
                search || filterKey
                  ? t("emptySearch")
                  : section === "favorites"
                  ? t("emptyFavorites")
                  : isPlaylist
                  ? t("emptyPlaylist")
                  : t("emptyLibrary")
              }
            />
          ) : libraryView === "cards" ? (
            <div className="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {filteredTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isActive={track.id === activeTrackId}
                  onPlay={(id) => setActiveTrackId((prev) => (prev === id ? null : id))}
                  playlists={playlists ?? []}
                  currentPlaylistId={isPlaylist ? section : undefined}
                />
              ))}
            </div>
          ) : (
            <div>
              <ListHeader />
              <div className="mt-1 flex flex-col gap-0.5">
                {filteredTracks.map((track, i) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    isActive={track.id === activeTrackId}
                    isPlaying={track.id === activeTrackId}
                    onPlay={(id) => setActiveTrackId((prev) => (prev === id ? null : id))}
                    playlists={playlists ?? []}
                    currentPlaylistId={isPlaylist ? section : undefined}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom mini player */}
      {activeTrack && (
        <MiniPlayer
          track={activeTrack}
          isPlayingExternal={true}
          onTogglePlay={() => {}}
          onClose={() => setActiveTrackId(null)}
        />
      )}
    </div>
  );
}
