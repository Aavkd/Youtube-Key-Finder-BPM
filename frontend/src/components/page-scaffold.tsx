import * as React from "react";
import { Sparkles } from "lucide-react";

import { Aurora, type AuroraBlob } from "@/components/aurora";
import { GlassPanel } from "@/components/glass-panel";

interface PageScaffoldProps {
  kicker: string;
  title: string;
  subtitle: string;
  comingSoon: string;
  badge: string;
  blobs: AuroraBlob[];
  auroraSpeed?: number;
  kickerColor?: string;
  children?: React.ReactNode;
}

/**
 * Themed page shell used by the Phase 5 route placeholders. Renders the
 * ambient aurora + a header (kicker / title / subtitle) and a glass
 * "coming soon" card noting which later phase fills the page in.
 */
export function PageScaffold({
  kicker,
  title,
  subtitle,
  comingSoon,
  badge,
  blobs,
  auroraSpeed = 0.6,
  kickerColor = "rgb(var(--kf-ink) / 0.4)",
  children,
}: PageScaffoldProps) {
  return (
    <div className="relative flex h-full min-h-screen w-full flex-col">
      <Aurora blobs={blobs} speed={auroraSpeed} />

      <div className="relative z-[2] flex flex-1 flex-col px-8 py-7 md:px-10">
        <header className="mb-5">
          <div
            className="kf-mono text-[11px] font-semibold tracking-[0.22em]"
            style={{ color: kickerColor }}
          >
            {kicker}
          </div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-[14.5px] text-ink-muted">
            {subtitle}
          </p>
        </header>

        {children}

        <GlassPanel className="mt-6 flex items-center gap-3 rounded-[18px] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/5">
            <Sparkles size={16} className="text-primary" />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              {badge}
            </div>
            <div className="text-[13.5px] text-ink-muted">{comingSoon}</div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
