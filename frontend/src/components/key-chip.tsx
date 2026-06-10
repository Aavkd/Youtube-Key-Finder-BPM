import * as React from "react";

import { mood } from "@/lib/mood";

interface KeyChipProps {
  keyName: string;
  bpm?: number | null;
  size?: "sm" | "md";
}

/** Musical-key chip colored by the circle-of-fifths hue (D43). */
export function KeyChip({ keyName, bpm, size = "md" }: KeyChipProps) {
  const m = mood(keyName, bpm);
  const pad = size === "sm" ? "3px 9px" : "5px 12px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <span
      className="kf-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: pad,
        borderRadius: 8,
        fontSize: fs,
        fontWeight: 600,
        color: "#fff",
        background: `linear-gradient(135deg, ${m.soft}, hsla(${m.hue} 70% 50% / 0.05))`,
        border: `1px solid hsla(${m.hue} 80% 60% / 0.45)`,
        boxShadow: `0 0 16px -4px ${m.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: m.primary,
          boxShadow: `0 0 10px ${m.glow}`,
        }}
      />
      {keyName}
    </span>
  );
}
