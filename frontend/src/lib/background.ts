import type { AuroraBlob } from "@/components/aurora";
import type { Track } from "@/lib/api/client";
import type { HomeBackgroundMode } from "@/lib/store";
import { mood } from "@/lib/mood";

/**
 * Adaptive Home background engine (D42).
 *
 * Three modes produce the drifting aurora blobs behind the Home hero:
 * - `library`: aggregate mood/colors from the user's tracks (default).
 * - `time`:    hue shifts with the local time of day.
 * - `random`:  a subtle, randomized full-spectrum spread chosen on load.
 *
 * The mode is selected in Settings (Phase 9) and persisted in the UI store.
 */

const ANIMS = ["kfDrift1", "kfDrift2", "kfDrift3"] as const;

// Full-spectrum fallback (matches the design handoff "library mood" aurora).
export const DEFAULT_BLOBS: AuroraBlob[] = [
  { x: "8%", y: "-8%", size: 460, color: "hsl(280 85% 55%)", anim: "kfDrift1", dur: 18, opacity: 0.7 },
  { x: "52%", y: "-14%", size: 520, color: "hsl(200 90% 55%)", anim: "kfDrift2", dur: 22, opacity: 0.6 },
  { x: "70%", y: "30%", size: 440, color: "hsl(330 88% 58%)", anim: "kfDrift3", dur: 20, opacity: 0.55 },
  { x: "20%", y: "55%", size: 480, color: "hsl(150 75% 50%)", anim: "kfDrift1", dur: 24, delay: 3, opacity: 0.42 },
  { x: "44%", y: "62%", size: 360, color: "hsl(45 95% 58%)", anim: "kfDrift2", dur: 19, delay: 1, opacity: 0.4 },
];

// Fixed scatter positions reused across modes so blobs stay well distributed.
const POSITIONS: Array<{ x: string; y: string; size: number }> = [
  { x: "8%", y: "-8%", size: 460 },
  { x: "52%", y: "-14%", size: 520 },
  { x: "70%", y: "30%", size: 440 },
  { x: "20%", y: "55%", size: 480 },
  { x: "44%", y: "62%", size: 360 },
];

function blobFromHue(
  hue: number,
  i: number,
  sat = 85,
  light = 56,
  opacity = 0.5,
): AuroraBlob {
  const pos = POSITIONS[i % POSITIONS.length];
  return {
    ...pos,
    color: `hsl(${Math.round(hue)} ${sat}% ${light}%)`,
    anim: ANIMS[i % ANIMS.length],
    dur: 18 + (i % 4) * 2,
    delay: i % 3,
    opacity,
  };
}

/** Aggregate the dominant mood hues from the library (favorites/recent first). */
function libraryBlobs(tracks: Track[]): AuroraBlob[] {
  const analyzed = tracks.filter((t) => t.key);
  if (analyzed.length === 0) return DEFAULT_BLOBS;

  // Prefer favorites, then most-recent; cap at five contributors.
  const ranked = [...analyzed].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const blobs = ranked.slice(0, 5).map((t, i) => {
    const m = mood(t.key, t.bpm ?? undefined);
    return blobFromHue(m.hue, i, 82, 55, 0.42 + m.energy * 0.18);
  });

  // Keep at least three blobs so the field never looks sparse.
  while (blobs.length < 3) {
    const d = DEFAULT_BLOBS[blobs.length];
    blobs.push(d);
  }
  return blobs;
}

/** Hue palette anchored to the local time of day (warm mornings → cool nights). */
function timeBlobs(date = new Date()): AuroraBlob[] {
  const hour = date.getHours() + date.getMinutes() / 60;
  // Map 0–24h onto a full hue rotation, offset so dawn reads warm.
  const base = (hour / 24) * 360 + 30;
  return POSITIONS.map((_, i) =>
    blobFromHue((base + i * 26) % 360, i, 80, 54, 0.5),
  );
}

/** A subtle randomized spread chosen once per load. */
function randomBlobs(seed = Math.random()): AuroraBlob[] {
  const base = seed * 360;
  return POSITIONS.map((_, i) =>
    blobFromHue((base + i * 67) % 360, i, 78, 55, 0.4 + (i % 2) * 0.1),
  );
}

export function backgroundBlobs(
  mode: HomeBackgroundMode,
  tracks: Track[] = [],
  seed?: number,
): AuroraBlob[] {
  switch (mode) {
    case "time":
      return timeBlobs();
    case "random":
      return randomBlobs(seed);
    case "library":
    default:
      return libraryBlobs(tracks);
  }
}
