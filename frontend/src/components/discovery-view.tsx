"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Music2,
  Search,
  Settings,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Aurora, type AuroraBlob } from "@/components/aurora";
import { GlassPanel } from "@/components/glass-panel";
import {
  type DiscoveryItem,
  useCreateJob,
  useDiscoveryPlaylist,
  useDiscoverySearch,
} from "@/lib/api/hooks";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { useUiStore } from "@/lib/store";

// ── aurora blobs (teal / purple / amber palette) ────────────────────────────
const BLOBS: AuroraBlob[] = [
  { x: "12%", y: "-26%", size: 520, color: "hsl(190 80% 48%)", anim: "kfDrift1", dur: 26, opacity: 0.38 },
  { x: "62%", y: "-18%", size: 480, color: "hsl(300 75% 50%)", anim: "kfDrift2", dur: 30, opacity: 0.3 },
  { x: "70%", y: "45%", size: 420, color: "hsl(45 85% 52%)", anim: "kfDrift3", dur: 28, opacity: 0.22 },
];

// ── helpers ──────────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "loading" | "done" | "error";

function ytUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Try to extract a short human label from a YouTube playlist URL. */
function playlistLabel(url: string, n: number): string {
  try {
    const id = new URL(url).searchParams.get("list");
    if (id) return id.length > 16 ? `${id.slice(0, 14)}…` : id;
  } catch {
    /* ignore */
  }
  return `Playlist ${n}`;
}

// ── sub-components ───────────────────────────────────────────────────────────

interface VideoCardProps {
  item: DiscoveryItem;
  status: ImportStatus;
  onImport: (item: DiscoveryItem) => void;
  t: ReturnType<typeof useTranslations<"discovery">>;
}

function VideoCard({ item: rawItem, status, onImport, t }: VideoCardProps) {
  const title = React.useMemo(() => decodeHtmlEntities(rawItem.title) || "—", [rawItem.title]);
  const item = React.useMemo(() => ({ ...rawItem, title }), [rawItem, title]);
  const thumbSrc = item.thumbnail_url;

  return (
    <GlassPanel className="kf-pan-y touch-no-scale group flex flex-col overflow-hidden rounded-[16px] transition-all hover:scale-[1.015]">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-white/5">
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 size={28} className="opacity-20" />
          </div>
        )}
        {/* YouTube link overlay */}
        <a
          href={ytUrl(item.youtube_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 opacity-100 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100 md:opacity-0"
          aria-label={t("openYoutube")}
          title={t("openYoutube")}
          tabIndex={0}
        >
          <ExternalLink size={12} className="text-white" />
        </a>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        <div className="flex-1">
          <p
            className="line-clamp-2 text-[13px] font-medium leading-snug text-ink"
            title={title}
          >
            {item.title || "—"}
          </p>
          {item.channel && (
            <p className="mt-1 truncate text-[11.5px] text-ink-muted">{item.channel}</p>
          )}
        </div>

        {/* Import button */}
        <ImportButton status={status} onImport={() => onImport(item)} t={t} />
      </div>
    </GlassPanel>
  );
}

function ImportButton({
  status,
  onImport,
  t,
}: {
  status: ImportStatus;
  onImport: () => void;
  t: ReturnType<typeof useTranslations<"discovery">>;
}) {
  if (status === "done") {
    return (
      <div className="flex min-h-11 items-center gap-1.5 rounded-[10px] bg-green-500/15 px-3 text-[12px] font-medium text-green-400">
        <CheckCircle2 size={13} />
        {t("imported")}
      </div>
    );
  }
  if (status === "error") {
    return (
      <button
        onClick={onImport}
        className="flex min-h-11 items-center gap-1.5 rounded-[10px] bg-red-500/15 px-3 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/25"
      >
        <XCircle size={13} />
        {t("importError")} — {t("import")}
      </button>
    );
  }
  if (status === "loading") {
    return (
      <div className="flex min-h-11 items-center gap-1.5 rounded-[10px] bg-white/5 px-3 text-[12px] font-medium text-ink-muted">
        <Loader2 size={13} className="animate-spin" />
        {t("importing")}
      </div>
    );
  }
  return (
    <button
      onClick={onImport}
      className="min-h-11 rounded-[10px] bg-primary/20 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/35"
    >
      {t("import")}
    </button>
  );
}

function VideoGrid({
  items,
  importStatuses,
  onImport,
  t,
}: {
  items: DiscoveryItem[];
  importStatuses: Record<string, ImportStatus>;
  onImport: (item: DiscoveryItem) => void;
  t: ReturnType<typeof useTranslations<"discovery">>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <VideoCard
          key={item.youtube_id}
          item={item}
          status={importStatuses[item.youtube_id] ?? "idle"}
          onImport={onImport}
          t={t}
        />
      ))}
    </div>
  );
}

// ── No API key banner ─────────────────────────────────────────────────────────

function NoApiKeyBanner({ t }: { t: ReturnType<typeof useTranslations<"discovery">> }) {
  return (
    <GlassPanel variant="soft" className="flex flex-col items-start gap-3 rounded-[16px] p-4 sm:flex-row sm:gap-4 sm:p-5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15">
        <AlertCircle size={18} className="text-amber-400" />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{t("noApiKey")}</p>
        <p className="mt-1 text-[13px] text-ink-muted">{t("noApiKeyHint")}</p>
      </div>
    </GlassPanel>
  );
}

// ── Playlist section ──────────────────────────────────────────────────────────

function PlaylistSection({
  playlists,
  activePlaylist,
  onSelect,
  importStatuses,
  onImport,
  t,
}: {
  playlists: string[];
  activePlaylist: string | null;
  onSelect: (url: string) => void;
  importStatuses: Record<string, ImportStatus>;
  onImport: (item: DiscoveryItem) => void;
  t: ReturnType<typeof useTranslations<"discovery">>;
}) {
  const { data, isLoading, isError } = useDiscoveryPlaylist(activePlaylist);

  if (playlists.length === 0) {
    return (
      <section>
        <SectionHeader label={t("linkedPlaylists")} />
        <GlassPanel variant="soft" className="flex flex-col items-center gap-3 rounded-[16px] py-10 text-center">
          <Music2 size={28} className="opacity-25" />
          <p className="text-[13.5px] font-medium text-ink-muted">{t("noLinkedPlaylists")}</p>
          <p className="text-[12.5px] text-ink-subtle">{t("noLinkedPlaylistsHint")}</p>
          <Link
            href="/settings"
            className="mt-2 flex min-h-11 items-center gap-1.5 rounded-[10px] bg-white/8 px-4 text-[12px] font-medium text-ink-muted transition-colors hover:bg-white/12 hover:text-ink"
          >
            <Settings size={13} />
            {t("goToSettings")}
          </Link>
        </GlassPanel>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader label={t("linkedPlaylists")} />

      {/* Playlist tabs */}
      <div className="relative mb-4 -mx-4 overflow-hidden px-4 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-[var(--kf-base)] after:to-transparent sm:mx-0 sm:px-0 sm:after:hidden">
        <div className="kf-scroll-tabs flex gap-2 overflow-x-auto pb-2">
        {playlists.map((url, i) => (
          <button
            key={url}
            onClick={() => onSelect(url)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-[12px] font-medium transition-colors",
              activePlaylist === url
                ? "bg-primary/25 text-primary"
                : "bg-white/6 text-ink-muted hover:bg-white/10 hover:text-ink",
            )}
            title={url}
          >
            {playlistLabel(url, i + 1)}
          </button>
        ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-[13px] text-ink-muted">
          <Loader2 size={15} className="animate-spin" />
          {t("playlistLoading")}
        </div>
      )}
      {isError && <ErrorRow message={t("playlistError")} />}
      {!isLoading && !isError && data?.length === 0 && (
        <p className="py-6 text-center text-[13px] text-ink-subtle">{t("playlistEmpty")}</p>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <VideoGrid items={data} importStatuses={importStatuses} onImport={onImport} t={t} />
      )}
    </section>
  );
}

// ── Search section ────────────────────────────────────────────────────────────

function SearchSection({
  query,
  importStatuses,
  onImport,
  t,
}: {
  query: string;
  importStatuses: Record<string, ImportStatus>;
  onImport: (item: DiscoveryItem) => void;
  t: ReturnType<typeof useTranslations<"discovery">>;
}) {
  const { data, isLoading, isError } = useDiscoverySearch(query || null);

  if (!query) return null;

  return (
    <section>
      <SectionHeader label={t("searchResults", { query })} />
      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-[13px] text-ink-muted">
          <Loader2 size={15} className="animate-spin" />
          {t("searching")}
        </div>
      )}
      {isError && <ErrorRow message={t("playlistError")} />}
      {!isLoading && !isError && data?.length === 0 && (
        <p className="py-6 text-center text-[13px] text-ink-subtle">{t("searchEmpty", { query })}</p>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <VideoGrid items={data} importStatuses={importStatuses} onImport={onImport} t={t} />
      )}
    </section>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
      {label}
    </h2>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-[13px] text-red-400">
      <AlertCircle size={14} />
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoveryView() {
  const t = useTranslations("discovery");
  const linkedPlaylists = useUiStore((s) => s.linkedPlaylists);

  const [searchInput, setSearchInput] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [activePlaylist, setActivePlaylist] = React.useState<string | null>(
    linkedPlaylists[0] ?? null,
  );
  const [importStatuses, setImportStatuses] = React.useState<Record<string, ImportStatus>>({});

  const createJob = useCreateJob();

  // Keep activePlaylist in sync if linkedPlaylists changes (e.g. first add)
  React.useEffect(() => {
    if (!activePlaylist && linkedPlaylists.length > 0) {
      setActivePlaylist(linkedPlaylists[0]);
    }
  }, [linkedPlaylists, activePlaylist]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (q) setSubmittedQuery(q);
  };

  const handleImport = React.useCallback(
    async (item: DiscoveryItem) => {
      setImportStatuses((prev) => ({ ...prev, [item.youtube_id]: "loading" }));
      try {
        await createJob.mutateAsync(ytUrl(item.youtube_id));
        setImportStatuses((prev) => ({ ...prev, [item.youtube_id]: "done" }));
      } catch {
        setImportStatuses((prev) => ({ ...prev, [item.youtube_id]: "error" }));
      }
    },
    [createJob],
  );

  // Detect "no API key" condition: fire a probe only when the user tries something.
  // Instead, show a banner if the first search/playlist fetch returns 503.
  // We check this lazily in the sub-sections; at the top level we only show the
  // banner when both sections are idle and we know the key is missing.
  const probeEnabled = Boolean(submittedQuery || activePlaylist);
  const probe = useDiscoverySearch(probeEnabled ? (submittedQuery || "a") : null);
  const noApiKey =
    probeEnabled &&
    !probe.isLoading &&
    probe.isError &&
    String((probe.error as { status?: number })?.status ?? "").startsWith("503");

  return (
    <div className="kf-viewport relative flex w-full flex-col">
      <Aurora blobs={BLOBS} speed={0.6} />

      <div className="kf-scrollable kf-window-scroll-mobile relative z-[2] flex flex-1 flex-col gap-6 px-4 py-5 sm:gap-7 sm:px-6 sm:py-7 md:px-10">
        {/* Header */}
        <header className="mb-1">
          <div className="kf-mono text-[11px] font-semibold tracking-[0.22em] text-[hsl(190_80%_65%)]">
            {t("kicker")}
          </div>
          <h1 className="mt-2 text-[clamp(30px,8vw,38px)] font-semibold tracking-[-0.02em] text-ink">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-[14.5px] text-ink-muted">{t("subtitle")}</p>
        </header>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <GlassPanel className="flex min-h-12 flex-1 items-center gap-3 rounded-full px-5 py-3">
            <Search size={16} className="shrink-0 text-ink-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle outline-none sm:text-[14px]"
            />
          </GlassPanel>
          <button
            type="submit"
            disabled={!searchInput.trim()}
            className="min-h-12 w-full rounded-full bg-primary/25 px-6 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/40 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {t("searchButton")}
          </button>
        </form>

        {/* No API key banner */}
        {noApiKey && <NoApiKeyBanner t={t} />}

        {/* Search results */}
        {submittedQuery && !noApiKey && (
          <SearchSection
            query={submittedQuery}
            importStatuses={importStatuses}
            onImport={handleImport}
            t={t}
          />
        )}

        {/* Linked playlists */}
        {!noApiKey && (
          <PlaylistSection
            playlists={linkedPlaylists}
            activePlaylist={activePlaylist}
            onSelect={setActivePlaylist}
            importStatuses={importStatuses}
            onImport={handleImport}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
