"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_PRESET,
  DEFAULT_PRESET_ID,
  type MoodPreset,
} from "./mood-presets";

export type LibraryView = "cards" | "list";
export type HomeBackgroundMode = "library" | "time" | "random";
export type MoodSource = "circle-of-fifths" | "thumbnail";
export type ExportFormat = "wav" | "mp3";

export type { MoodPreset };

interface UiState {
  // Library
  libraryView: LibraryView;
  sidebarCollapsed: boolean;
  // Home
  homeBackgroundMode: HomeBackgroundMode;
  // Playback
  autoTransition: boolean;
  defaultExportFormat: ExportFormat;
  // Mood (D31, D40)
  moodSource: MoodSource;
  moodPresets: MoodPreset[];
  activeMoodPresetId: string;
  // Processing (D37, D38) — frontend display; backend enforcement via env vars
  durationLimitMinutes: number;
  // Discovery
  linkedPlaylists: string[];

  // Actions
  setLibraryView: (view: LibraryView) => void;
  toggleLibraryView: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setHomeBackgroundMode: (mode: HomeBackgroundMode) => void;
  setAutoTransition: (value: boolean) => void;
  setDefaultExportFormat: (fmt: ExportFormat) => void;
  setMoodSource: (src: MoodSource) => void;
  setActiveMoodPresetId: (id: string) => void;
  saveMoodPreset: (preset: MoodPreset) => void;
  deleteMoodPreset: (id: string) => void;
  setDurationLimitMinutes: (min: number) => void;
  addLinkedPlaylist: (url: string) => void;
  removeLinkedPlaylist: (url: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      libraryView: "cards",
      sidebarCollapsed: false,
      homeBackgroundMode: "library",
      autoTransition: true,
      defaultExportFormat: "wav",
      moodSource: "circle-of-fifths",
      moodPresets: [],
      activeMoodPresetId: DEFAULT_PRESET_ID,
      durationLimitMinutes: 20,
      linkedPlaylists: [],

      setLibraryView: (libraryView) => set({ libraryView }),
      toggleLibraryView: () =>
        set((s) => ({
          libraryView: s.libraryView === "cards" ? "list" : "cards",
        })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setHomeBackgroundMode: (homeBackgroundMode) => set({ homeBackgroundMode }),
      setAutoTransition: (autoTransition) => set({ autoTransition }),
      setDefaultExportFormat: (defaultExportFormat) => set({ defaultExportFormat }),
      setMoodSource: (moodSource) => set({ moodSource }),
      setActiveMoodPresetId: (activeMoodPresetId) => set({ activeMoodPresetId }),
      saveMoodPreset: (preset) =>
        set((s) => {
          const existing = s.moodPresets.findIndex((p) => p.id === preset.id);
          const presets =
            existing >= 0
              ? s.moodPresets.map((p) => (p.id === preset.id ? preset : p))
              : [...s.moodPresets, preset];
          return { moodPresets: presets, activeMoodPresetId: preset.id };
        }),
      deleteMoodPreset: (id) =>
        set((s) => ({
          moodPresets: s.moodPresets.filter((p) => p.id !== id),
          activeMoodPresetId:
            s.activeMoodPresetId === id ? DEFAULT_PRESET_ID : s.activeMoodPresetId,
        })),
      setDurationLimitMinutes: (durationLimitMinutes) => set({ durationLimitMinutes }),
      addLinkedPlaylist: (url) =>
        set((s) =>
          s.linkedPlaylists.includes(url)
            ? {}
            : { linkedPlaylists: [...s.linkedPlaylists, url] },
        ),
      removeLinkedPlaylist: (url) =>
        set((s) => ({
          linkedPlaylists: s.linkedPlaylists.filter((u) => u !== url),
        })),
    }),
    { name: "kf-ui" },
  ),
);

/** Resolve the active MoodPreset from the store (falls back to DEFAULT_PRESET). */
export function resolveActivePreset(store: Pick<UiState, "moodPresets" | "activeMoodPresetId">): MoodPreset {
  if (store.activeMoodPresetId === DEFAULT_PRESET_ID) return DEFAULT_PRESET;
  return store.moodPresets.find((p) => p.id === store.activeMoodPresetId) ?? DEFAULT_PRESET;
}
