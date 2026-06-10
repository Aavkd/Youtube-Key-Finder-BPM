import * as React from "react";

export interface AuroraBlob {
  x: string;
  y: string;
  size: number;
  color: string;
  anim?: "kfDrift1" | "kfDrift2" | "kfDrift3" | "kfPulse";
  dur?: number;
  delay?: number;
  opacity?: number;
}

interface AuroraProps {
  blobs: AuroraBlob[];
  speed?: number;
  /** Override the radial base gradient (defaults to the theme token). */
  base?: string;
  className?: string;
}

/**
 * Full-spectrum reactive aurora background (glassmorphism signature, D15).
 * Drifting blurred blobs over a radial base, with a faint vignette for depth.
 */
export function Aurora({ blobs, speed = 1, base, className }: AuroraProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: base ?? "var(--aurora-base)",
      }}
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          className="kf-aurora"
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            background: b.color,
            opacity: b.opacity ?? 0.8,
            animation: `${b.anim || "kfDrift1"} ${(b.dur || 16) / speed}s ease-in-out infinite`,
            animationDelay: `${b.delay || 0}s`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
