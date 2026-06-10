import * as React from "react";

interface ConfidenceProps {
  value: number;
  compact?: boolean;
}

/** Confidence badge — High / Medium / Low + exact % (D23). */
export function Confidence({ value, compact }: ConfidenceProps) {
  const pct = Math.round(value * 100);
  const level = value >= 0.8 ? "High" : value >= 0.55 ? "Medium" : "Low";
  const c =
    value >= 0.8 ? "150 70% 55%" : value >= 0.55 ? "45 95% 60%" : "8 90% 62%";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        background: `hsla(${c} / 0.16)`,
        border: `1px solid hsla(${c} / 0.4)`,
        color: `hsl(${c})`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: `hsl(${c})`,
          boxShadow: `0 0 8px hsl(${c})`,
        }}
      />
      {level}
      {!compact && (
        <span className="kf-mono" style={{ opacity: 0.8, fontWeight: 500 }}>
          {pct}%
        </span>
      )}
    </span>
  );
}
