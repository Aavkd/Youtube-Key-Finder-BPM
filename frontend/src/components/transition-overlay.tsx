"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import type { Mood } from "@/lib/mood";

interface TransitionOverlayProps {
  active: boolean;
  mood?: Mood | null;
  title?: string | null;
}

/**
 * Full-screen "diving into the Player" transition (D26/D27). A mood-tinted
 * radial burst expands from center while the track title fades in, bridging
 * the Home → Player navigation so it never hard-cuts.
 */
export function TransitionOverlay({ active, mood, title }: TransitionOverlayProps) {
  const t = useTranslations("home");
  const primary = mood?.primary ?? "hsl(280 85% 60%)";
  const deep = mood?.deep ?? "hsl(280 85% 22%)";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="kf-transition"
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ background: "rgba(4,3,9,0.6)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            className="absolute rounded-full"
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 16, opacity: 0 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 160,
              height: 160,
              background: `radial-gradient(circle, ${primary}, ${deep} 70%, transparent)`,
              filter: "blur(8px)",
            }}
          />
          <motion.div
            className="relative z-[1] flex flex-col items-center gap-3 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
          >
            <span className="kf-mono text-[11px] font-semibold tracking-[0.34em] text-white/70">
              {t("openingPlayer")}
            </span>
            {title && (
              <span className="max-w-[80vw] truncate text-[22px] font-semibold text-white">
                {title}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
