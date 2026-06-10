import { parseKey, smoothstep, type Mood } from "./mood";

// Chromatic keys in circle-of-fifths order: C=0°, G=30°, … F=330°
export const FIFTHS_ORDER = [
  "C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F",
] as const;

const ENHARMONICS: Record<string, string> = {
  Gb: "F#", "C#": "Db", "G#": "Ab", "D#": "Eb", "A#": "Bb",
};

export interface MoodPreset {
  id: string;
  name: string;
  /** Hue assigned to C (0–359). Default 0 = red. */
  anchorHue: number;
  /** 1 = clockwise (default circle of fifths), -1 = counter-clockwise. */
  direction: 1 | -1;
}

export const DEFAULT_PRESET_ID = "default";

export const DEFAULT_PRESET: MoodPreset = {
  id: DEFAULT_PRESET_ID,
  name: "Circle of Fifths",
  anchorHue: 0,
  direction: 1,
};

/** Hue for a tonic key using a preset's anchor + direction. */
export function presetKeyHue(preset: MoodPreset, tonic: string): number {
  const key = ENHARMONICS[tonic] ?? tonic;
  const idx = FIFTHS_ORDER.indexOf(key as (typeof FIFTHS_ORDER)[number]);
  if (idx < 0) return preset.anchorHue;
  return ((preset.anchorHue + preset.direction * idx * 30) + 360) % 360;
}

/** Full Mood computed using a preset's hue mapping (D40). */
export function moodWithPreset(
  key: string | null | undefined,
  bpm: number | null | undefined,
  preset: MoodPreset,
): Mood {
  const { tonic, minor } = parseKey(key);
  const hue = presetKeyHue(preset, tonic);
  const energy = smoothstep(((bpm || 90) - 60) / 120);
  const sat = minor ? 58 + energy * 14 : 80 + energy * 12;
  const light = minor ? 50 + energy * 6 : 60 + energy * 8;
  const h2 = (hue + (minor ? -34 : 30) + 360) % 360;
  return {
    hue, energy, minor,
    primary: `hsl(${hue} ${sat}% ${light}%)`,
    deep: `hsl(${hue} ${sat}% ${Math.round(light * 0.42)}%)`,
    accent: `hsl(${h2} ${sat}% ${light}%)`,
    glow: `hsla(${hue} ${sat}% ${light + 8}% / 0.55)`,
    soft: `hsla(${hue} ${sat}% ${light}% / 0.16)`,
    chip: `hsla(${hue} ${sat}% ${light + 6}% / 0.9)`,
    label: minor ? "minor" : "major",
  };
}

/**
 * "Thumbnail-derived" mood (D31, v1 approximation): BPM-energy warm/cool
 * palette instead of key-based circle-of-fifths. Cool blue at low BPM →
 * warm orange at high BPM, with saturation reduced to feel photo-inspired.
 */
export function moodFromBpmTone(
  key: string | null | undefined,
  bpm: number | null | undefined,
): Mood {
  const { minor } = parseKey(key);
  const energy = smoothstep(((bpm || 90) - 60) / 120);
  // 200° (blue, slow) → 400°%360=40° (orange, fast)
  const hue = Math.round((200 + energy * 200) % 360);
  const sat = (minor ? 40 : 50) + energy * 12;
  const light = minor ? 44 + energy * 6 : 52 + energy * 8;
  const h2 = (hue + 40) % 360;
  return {
    hue, energy, minor,
    primary: `hsl(${hue} ${sat}% ${light}%)`,
    deep: `hsl(${hue} ${sat}% ${Math.round(light * 0.42)}%)`,
    accent: `hsl(${h2} ${sat + 4}% ${light}%)`,
    glow: `hsla(${hue} ${sat}% ${light + 8}% / 0.55)`,
    soft: `hsla(${hue} ${sat}% ${light}% / 0.16)`,
    chip: `hsla(${hue} ${sat}% ${light + 6}% / 0.9)`,
    label: minor ? "minor" : "major",
  };
}
