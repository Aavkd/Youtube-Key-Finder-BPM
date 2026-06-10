"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Link2, Plus, Trash2 } from "lucide-react";

import { Aurora } from "@/components/aurora";
import { GlassPanel } from "@/components/glass-panel";
import { setUserLocale } from "@/i18n/locale";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRESET,
  DEFAULT_PRESET_ID,
  FIFTHS_ORDER,
  presetKeyHue,
  type MoodPreset,
} from "@/lib/mood-presets";
import {
  useUiStore,
  resolveActivePreset,
  type HomeBackgroundMode,
  type LibraryView,
  type MoodSource,
  type ExportFormat,
} from "@/lib/store";

// ── primitives ──────────────────────────────────────────────────────────────

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel variant="soft" className="rounded-[20px]">
      <div className="px-6 py-5">
        <h2 className="mb-4 border-b border-white/[0.07] pb-3 text-[13px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
          {title}
        </h2>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </GlassPanel>
  );
}

function SettingRow({
  label,
  desc,
  children,
  column,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
  column?: boolean;
}) {
  return (
    <div className={cn("flex gap-4", column ? "flex-col" : "items-center justify-between")}>
      <div className="min-w-0">
        <div className="text-[14px] text-ink">{label}</div>
        {desc && <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-subtle">{desc}</div>}
      </div>
      <div className={cn("shrink-0", column && "w-full")}>{children}</div>
    </div>
  );
}

function OptionPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-[11px] border border-white/[0.1]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-4 py-2 text-[13px] font-medium transition-colors",
            o.value === value
              ? "bg-white/[0.14] text-white"
              : "text-ink-muted hover:bg-white/[0.06] hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors duration-200",
        checked ? "bg-white/[0.28]" : "bg-white/[0.1]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── sections ────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const t = useTranslations("settings");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const isDark = !mounted || resolvedTheme !== "light";

  function selectLocale(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <SettingSection title={t("sectionAppearance")}>
      <SettingRow label={t("theme")}>
        <OptionPills
          options={[
            { value: "dark", label: t("themeDark") },
            { value: "light", label: t("themeLight") },
          ]}
          value={isDark ? "dark" : "light"}
          onChange={(v) => setTheme(v)}
        />
      </SettingRow>
      <SettingRow label={t("language")}>
        <OptionPills
          options={locales.map((l) => ({ value: l, label: localeLabels[l] }))}
          value={active}
          onChange={selectLocale}
        />
      </SettingRow>
    </SettingSection>
  );
}

function PlaybackSection() {
  const t = useTranslations("settings");
  const autoTransition = useUiStore((s) => s.autoTransition);
  const setAutoTransition = useUiStore((s) => s.setAutoTransition);
  const defaultExportFormat = useUiStore((s) => s.defaultExportFormat);
  const setDefaultExportFormat = useUiStore((s) => s.setDefaultExportFormat);

  return (
    <SettingSection title={t("sectionPlayback")}>
      <SettingRow label={t("autoTransition")} desc={t("autoTransitionDesc")}>
        <Toggle checked={autoTransition} onChange={setAutoTransition} />
      </SettingRow>
      <SettingRow label={t("exportFormat")} desc={t("exportFormatDesc")}>
        <OptionPills<ExportFormat>
          options={[
            { value: "wav", label: "WAV" },
            { value: "mp3", label: "MP3" },
          ]}
          value={defaultExportFormat}
          onChange={setDefaultExportFormat}
        />
      </SettingRow>
    </SettingSection>
  );
}

// ── Mood palette editor (D40) ────────────────────────────────────────────────

function KeyPreview({ preset }: { preset: MoodPreset }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FIFTHS_ORDER.map((key) => {
        const hue = presetKeyHue(preset, key);
        return (
          <div
            key={key}
            className="flex h-7 min-w-[38px] items-center justify-center rounded-lg px-2 text-[11px] font-semibold text-white/90"
            style={{ background: `hsl(${hue} 78% 50%)` }}
            title={`${key} → ${hue}°`}
          >
            {key}
          </div>
        );
      })}
    </div>
  );
}

function MoodPresetEditor() {
  const t = useTranslations("settings");
  const moodPresets = useUiStore((s) => s.moodPresets);
  const activeMoodPresetId = useUiStore((s) => s.activeMoodPresetId);
  const setActiveMoodPresetId = useUiStore((s) => s.setActiveMoodPresetId);
  const saveMoodPreset = useUiStore((s) => s.saveMoodPreset);
  const deleteMoodPreset = useUiStore((s) => s.deleteMoodPreset);

  const activePreset = resolveActivePreset({ moodPresets, activeMoodPresetId });

  // Local draft — modified before saving
  const [draftAnchor, setDraftAnchor] = React.useState(activePreset.anchorHue);
  const [draftDir, setDraftDir] = React.useState<1 | -1>(activePreset.direction);

  // Sync draft when the active preset changes
  React.useEffect(() => {
    setDraftAnchor(activePreset.anchorHue);
    setDraftDir(activePreset.direction);
  }, [activePreset.anchorHue, activePreset.direction]);

  const draftPreset: MoodPreset = {
    ...activePreset,
    anchorHue: draftAnchor,
    direction: draftDir,
  };

  const isDirty =
    draftAnchor !== activePreset.anchorHue || draftDir !== activePreset.direction;
  const isDefault = activeMoodPresetId === DEFAULT_PRESET_ID;

  // Save-as dialog state
  const [saving, setSaving] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  function commitSaveAs() {
    const name = newName.trim();
    if (!name) return;
    const id = `preset-${Date.now()}`;
    saveMoodPreset({ id, name, anchorHue: draftAnchor, direction: draftDir });
    setSaving(false);
    setNewName("");
  }

  function handleUpdatePreset() {
    saveMoodPreset({ ...activePreset, anchorHue: draftAnchor, direction: draftDir });
  }

  const allPresets: MoodPreset[] = [DEFAULT_PRESET, ...moodPresets];

  return (
    <div className="flex flex-col gap-4">
      {/* preset selector */}
      <SettingRow label={t("moodPreset")}>
        <div className="flex overflow-hidden rounded-[11px] border border-white/[0.1]">
          {allPresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveMoodPresetId(p.id)}
              className={cn(
                "px-3.5 py-2 text-[13px] font-medium transition-colors",
                p.id === activeMoodPresetId
                  ? "bg-white/[0.14] text-white"
                  : "text-ink-muted hover:bg-white/[0.06] hover:text-ink",
              )}
            >
              {p.id === DEFAULT_PRESET_ID ? t("moodPresetDefault") : p.name}
            </button>
          ))}
        </div>
      </SettingRow>

      {/* anchor hue */}
      <SettingRow label={t("moodPresetAnchor")}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="359"
            value={draftAnchor}
            onChange={(e) => setDraftAnchor(Number(e.target.value))}
            className="w-[160px] accent-white"
            style={{
              background: `linear-gradient(to right, hsl(0,80%,55%) 0%, hsl(60,80%,55%) 17%, hsl(120,80%,55%) 33%, hsl(180,80%,55%) 50%, hsl(240,80%,55%) 67%, hsl(300,80%,55%) 83%, hsl(360,80%,55%) 100%)`,
              height: "6px",
              borderRadius: "3px",
              appearance: "none",
            }}
          />
          <div
            className="h-7 w-7 rounded-lg border border-white/20"
            style={{ background: `hsl(${draftAnchor} 80% 52%)` }}
            title={`${draftAnchor}°`}
          />
          <span className="kf-mono min-w-[34px] text-[12px] text-ink-muted">
            {draftAnchor}°
          </span>
        </div>
      </SettingRow>

      {/* direction */}
      <SettingRow label={t("moodPresetDirection")}>
        <OptionPills<"1" | "-1">
          options={[
            { value: "1", label: t("moodPresetClockwise") },
            { value: "-1", label: t("moodPresetCounterCw") },
          ]}
          value={String(draftDir) as "1" | "-1"}
          onChange={(v) => setDraftDir(Number(v) as 1 | -1)}
        />
      </SettingRow>

      {/* key preview */}
      <div>
        <div className="mb-2 text-[12px] text-ink-subtle">{t("moodPresetPreview")}</div>
        <KeyPreview preset={draftPreset} />
      </div>

      {/* actions */}
      {isDirty && (
        <div className="flex items-center gap-2.5">
          {!isDefault && (
            <button
              type="button"
              onClick={handleUpdatePreset}
              className="rounded-[10px] border border-white/[0.12] bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-ink hover:bg-white/[0.12]"
            >
              {t("moodPresetUpdate")}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setSaving(true); setNewName(""); }}
            className="rounded-[10px] border border-white/[0.12] bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-ink hover:bg-white/[0.12]"
          >
            {t("moodPresetSaveAs")}
          </button>
        </div>
      )}

      {/* save-as inline dialog */}
      {saving && (
        <GlassPanel className="rounded-[14px] p-4">
          <div className="mb-3 text-[13.5px] font-medium text-white">{t("moodPresetSaveAs")}</div>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitSaveAs(); if (e.key === "Escape") setSaving(false); }}
            placeholder={t("moodPresetSaveAsName")}
            className="mb-3 w-full rounded-[10px] border border-white/[0.12] bg-white/[0.06] px-3.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-white/[0.22]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commitSaveAs}
              disabled={!newName.trim()}
              className="rounded-[9px] bg-white/[0.14] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-white/[0.2]"
            >
              {t("moodPresetSave")}
            </button>
            <button
              type="button"
              onClick={() => setSaving(false)}
              className="rounded-[9px] px-4 py-1.5 text-[13px] text-ink-muted hover:text-ink"
            >
              {t("moodPresetCancel")}
            </button>
          </div>
        </GlassPanel>
      )}

      {/* delete custom preset */}
      {!isDefault && (
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="text-[12.5px] text-ink-subtle">
            {t("moodPresetDeleteHint", { name: activePreset.name })}
          </span>
          <button
            type="button"
            onClick={() => deleteMoodPreset(activePreset.id)}
            className="flex items-center gap-1.5 rounded-[9px] border border-red-500/30 px-3 py-1.5 text-[12.5px] text-red-400/80 hover:border-red-400/50 hover:text-red-300"
          >
            <Trash2 size={13} /> {t("moodPresetDelete")}
          </button>
        </div>
      )}
    </div>
  );
}

function MoodSection() {
  const t = useTranslations("settings");
  const moodSource = useUiStore((s) => s.moodSource);
  const setMoodSource = useUiStore((s) => s.setMoodSource);

  return (
    <SettingSection title={t("sectionMood")}>
      <SettingRow label={t("moodSource")}>
        <OptionPills<MoodSource>
          options={[
            { value: "circle-of-fifths", label: t("moodSourceCircle") },
            { value: "thumbnail", label: t("moodSourceThumbnail") },
          ]}
          value={moodSource}
          onChange={setMoodSource}
        />
      </SettingRow>
      {moodSource === "circle-of-fifths" && (
        <div className="mt-1">
          <div className="mb-3 border-t border-white/[0.06] pt-3 text-[12px] text-ink-subtle">
            {t("moodPresetSectionHint")}
          </div>
          <MoodPresetEditor />
        </div>
      )}
      {moodSource === "thumbnail" && (
        <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-ink-subtle">
          {t("moodSourceThumbnailDesc")}
        </div>
      )}
    </SettingSection>
  );
}

function HomeSection() {
  const t = useTranslations("settings");
  const homeBackgroundMode = useUiStore((s) => s.homeBackgroundMode);
  const setHomeBackgroundMode = useUiStore((s) => s.setHomeBackgroundMode);

  return (
    <SettingSection title={t("sectionHome")}>
      <SettingRow label={t("homeBackground")} desc={t("homeBackgroundDesc")}>
        <OptionPills<HomeBackgroundMode>
          options={[
            { value: "library", label: t("homeBackgroundLibrary") },
            { value: "time", label: t("homeBackgroundTime") },
            { value: "random", label: t("homeBackgroundRandom") },
          ]}
          value={homeBackgroundMode}
          onChange={setHomeBackgroundMode}
        />
      </SettingRow>
    </SettingSection>
  );
}

function LibrarySection() {
  const t = useTranslations("settings");
  const libraryView = useUiStore((s) => s.libraryView);
  const setLibraryView = useUiStore((s) => s.setLibraryView);

  return (
    <SettingSection title={t("sectionLibrary")}>
      <SettingRow label={t("libraryView")}>
        <OptionPills<LibraryView>
          options={[
            { value: "cards", label: t("libraryViewCards") },
            { value: "list", label: t("libraryViewList") },
          ]}
          value={libraryView}
          onChange={setLibraryView}
        />
      </SettingRow>
    </SettingSection>
  );
}

function ProcessingSection() {
  const t = useTranslations("settings");
  const durationLimitMinutes = useUiStore((s) => s.durationLimitMinutes);
  const setDurationLimitMinutes = useUiStore((s) => s.setDurationLimitMinutes);

  return (
    <SettingSection title={t("sectionProcessing")}>
      <SettingRow label={t("durationLimit")} desc={t("durationLimitDesc")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={120}
            value={durationLimitMinutes}
            onChange={(e) => {
              const v = Math.max(1, Math.min(120, Number(e.target.value) || 20));
              setDurationLimitMinutes(v);
            }}
            className="w-[68px] rounded-[10px] border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-center text-[14px] text-ink outline-none focus:border-white/[0.22]"
          />
          <span className="text-[13px] text-ink-muted">{t("durationLimitUnit")}</span>
        </div>
      </SettingRow>
      <SettingRow label={t("queueConcurrency")} desc={t("queueConcurrencyDesc")}>
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[13px] text-ink-subtle">
          {t("queueConcurrencyEnvHint")}
        </div>
      </SettingRow>
    </SettingSection>
  );
}

function DiscoverySection() {
  const t = useTranslations("settings");
  const linkedPlaylists = useUiStore((s) => s.linkedPlaylists);
  const addLinkedPlaylist = useUiStore((s) => s.addLinkedPlaylist);
  const removeLinkedPlaylist = useUiStore((s) => s.removeLinkedPlaylist);

  const [inputUrl, setInputUrl] = React.useState("");
  const [error, setError] = React.useState("");

  function isYouTubePlaylist(url: string) {
    try {
      const u = new URL(url);
      return (
        (u.hostname === "youtube.com" || u.hostname === "www.youtube.com") &&
        u.pathname === "/playlist" &&
        u.searchParams.has("list")
      );
    } catch {
      return false;
    }
  }

  function handleAdd() {
    const url = inputUrl.trim();
    if (!isYouTubePlaylist(url)) {
      setError(t("playlistInvalid"));
      return;
    }
    addLinkedPlaylist(url);
    setInputUrl("");
    setError("");
  }

  return (
    <SettingSection title={t("sectionDiscovery")}>
      <SettingRow label={t("linkedPlaylists")} desc={t("linkedPlaylistsDesc")} column>
        <div className="flex flex-col gap-3">
          {/* URL input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => { setInputUrl(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder={t("playlistUrlPlaceholder")}
              className="min-w-0 flex-1 rounded-[11px] border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-white/[0.22]"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-[11px] border border-white/[0.12] bg-white/[0.08] px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-white/[0.14]"
            >
              <Plus size={15} /> {t("playlistAdd")}
            </button>
          </div>
          {error && <span className="text-[12.5px]" style={{ color: "hsl(8 90% 68%)" }}>{error}</span>}

          {/* playlist list */}
          {linkedPlaylists.length === 0 ? (
            <div className="flex items-center gap-2 rounded-[11px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[13px] text-ink-subtle">
              <Link2 size={14} className="shrink-0" />
              {t("playlistEmpty")}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {linkedPlaylists.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-3 rounded-[11px] border border-white/[0.07] bg-white/[0.03] px-4 py-2.5"
                >
                  <Check size={13} className="shrink-0 text-green-400/80" />
                  <span className="kf-mono min-w-0 flex-1 truncate text-[12.5px] text-ink-muted">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeLinkedPlaylist(url)}
                    aria-label={t("playlistRemove")}
                    className="shrink-0 rounded-lg p-1 text-ink-subtle hover:text-ink"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingRow>
    </SettingSection>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function SettingsView() {
  const t = useTranslations("settings");

  return (
    <div className="relative min-h-screen w-full">
      <Aurora
        blobs={[
          { x: "20%", y: "-30%", size: 480, color: "hsl(280 65% 45%)", anim: "kfDrift1", dur: 32, opacity: 0.3 },
          { x: "78%", y: "30%", size: 460, color: "hsl(200 65% 45%)", anim: "kfDrift2", dur: 36, opacity: 0.26 },
          { x: "10%", y: "60%", size: 400, color: "hsl(320 55% 40%)", anim: "kfDrift3", dur: 40, opacity: 0.2 },
        ]}
        speed={0.4}
      />

      <div className="relative z-[2] mx-auto max-w-[760px] px-6 pb-24 pt-14">
        {/* page header */}
        <div className="mb-10">
          <span className="kf-mono mb-2 block text-[11px] font-semibold tracking-[0.22em] text-ink-subtle">
            {t("kicker")}
          </span>
          <h1 className="text-[42px] font-semibold leading-[1.06] tracking-[-0.025em] text-white">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <AppearanceSection />
          <PlaybackSection />
          <MoodSection />
          <HomeSection />
          <LibrarySection />
          <ProcessingSection />
          <DiscoverySection />
        </div>
      </div>
    </div>
  );
}
