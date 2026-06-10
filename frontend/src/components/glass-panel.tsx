import * as React from "react";

import { cn } from "@/lib/utils";

type GlassVariant = "default" | "soft";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
}

/**
 * Glassmorphism primitive (D15): a frosted, translucent panel.
 * Reused across the app; the look is fully tuned via design tokens
 * (`.kf-glass` / `.kf-glass-soft` in `globals.css`).
 */
const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg",
        variant === "soft" ? "kf-glass-soft" : "kf-glass",
        className,
      )}
      {...props}
    />
  ),
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
