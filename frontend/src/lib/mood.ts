/**
 * Mood-color engine (D39, D43, D44) — ported from the design handoff.
 *
 * Circle of fifths, clockwise from C = red (0°): C G D A E B F# Db Ab Eb Bb F.
 * Major = brighter & more saturated; minor = darker & more desaturated.
 * BPM modulates energy via smoothstep over the 60–180 range.
 *
 * NOTE: the canonical mapping also lives in the Player/Settings phases; this is
 * the shared primitive both reuse (palette persisted to `tracks.mood_palette`).
 */

export const FIFTHS: Record<string, number> = {
  C: 0,
  G: 30,
  D: 60,
  A: 90,
  E: 120,
  B: 150,
  "F#": 180,
  Gb: 180,
  "C#": 210,
  Db: 210,
  "G#": 240,
  Ab: 240,
  "D#": 270,
  Eb: 270,
  "A#": 300,
  Bb: 300,
  F: 330,
};

export function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export interface ParsedKey {
  tonic: string;
  minor: boolean;
}

/** Parse "F# Minor" → { tonic: "F#", minor: true }. */
export function parseKey(key: string | null | undefined): ParsedKey {
  const m = String(key ?? "")
    .trim()
    .match(/^([A-G][#b]?)\s*(maj|min|major|minor|m)?/i);
  const tonic = m ? m[1] : "C";
  const minor = /min|minor|^m$/i.test(m && m[2] ? m[2] : "Major");
  return { tonic, minor };
}

export interface Mood {
  hue: number;
  energy: number;
  minor: boolean;
  primary: string;
  deep: string;
  accent: string;
  glow: string;
  soft: string;
  chip: string;
  label: "major" | "minor";
}

/** Rich palette for a track's mood, from key + BPM. */
export function mood(key: string | null | undefined, bpm?: number | null): Mood {
  const { tonic, minor } = parseKey(key);
  const hue = FIFTHS[tonic] ?? 0;
  const energy = smoothstep(((bpm || 90) - 60) / 120);
  const sat = minor ? 58 + energy * 14 : 80 + energy * 12;
  const light = minor ? 50 + energy * 6 : 60 + energy * 8;
  const h2 = (hue + (minor ? -34 : 30) + 360) % 360;
  return {
    hue,
    energy,
    minor,
    primary: `hsl(${hue} ${sat}% ${light}%)`,
    deep: `hsl(${hue} ${sat}% ${Math.round(light * 0.42)}%)`,
    accent: `hsl(${h2} ${sat}% ${light}%)`,
    glow: `hsla(${hue} ${sat}% ${light + 8}% / 0.55)`,
    soft: `hsla(${hue} ${sat}% ${light}% / 0.16)`,
    chip: `hsla(${hue} ${sat}% ${light + 6}% / 0.9)`,
    label: minor ? "minor" : "major",
  };
}

export type MoodTone = "hypnotic" | "brooding" | "radiant" | "euphoric";
export type MoodEnergy = "low" | "mid" | "high";

/** Mood descriptor tokens (i18n-friendly) for the Player readout. */
export function moodWord(m: Mood): { tone: MoodTone; energy: MoodEnergy } {
  const energy: MoodEnergy =
    m.energy > 0.66 ? "high" : m.energy > 0.33 ? "mid" : "low";
  const tone: MoodTone = m.minor
    ? m.hue >= 150 && m.hue <= 260
      ? "hypnotic"
      : "brooding"
    : m.hue >= 30 && m.hue <= 150
      ? "radiant"
      : "euphoric";
  return { tone, energy };
}

/**
 * Compact, serializable palette persisted to `tracks.mood_palette` (D43/D44).
 * Stores the raw inputs + derived colors so the Library/Player can render the
 * same mood without recomputing (and so a custom palette can override it).
 */
export function moodPalette(m: Mood): Record<string, string | number | boolean> {
  return {
    hue: m.hue,
    energy: Math.round(m.energy * 1000) / 1000,
    minor: m.minor,
    primary: m.primary,
    deep: m.deep,
    accent: m.accent,
    glow: m.glow,
    soft: m.soft,
    label: m.label,
  };
}

/** Key abbreviation for chips/filenames (D32): minor → "m", major → "maj". */
export function keyAbbrev(key: string | null | undefined): string {
  const { tonic, minor } = parseKey(key);
  return tonic + (minor ? "m" : "maj");
}

/** Seconds → "m:ss". */
export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
