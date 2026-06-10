import * as React from "react";

interface EQProps {
  color?: string;
  bars?: number;
  /** Pixel height of the tallest bar. */
  h?: number;
  gap?: number;
  /** Drives the bar tempo so it pulses with the track's BPM. */
  bpm?: number;
  /** When false, bars freeze (paused state). */
  active?: boolean;
}

/**
 * Reactive equalizer bars (BPM-driven), ported from the design handoff.
 * Used as the "Now playing" indicator over the Player artwork.
 */
export function EQ({
  color = "#fff",
  bars = 5,
  h = 18,
  gap = 3,
  bpm = 120,
  active = true,
}: EQProps) {
  const base = 60 / (bpm || 120);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height: h }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 2,
            background: color,
            transformOrigin: "bottom",
            transform: active ? undefined : "scaleY(0.35)",
            animation: active
              ? `kfBars ${base * (0.7 + (i % 3) * 0.25)}s ease-in-out ${i * 0.12}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
