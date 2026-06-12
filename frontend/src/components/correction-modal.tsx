"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { GlassPanel } from "@/components/glass-panel";
import { KeyChip } from "@/components/key-chip";
import { useUpdateTrack } from "@/lib/api/hooks";
import type { Track } from "@/lib/api/client";

interface BpmAlt { bpm: number; reason: string }
interface KeyAlt { key: string; reason: string }

function parseBpmAlts(v: unknown): BpmAlt[] {
  return Array.isArray(v) ? (v.filter((a) => a && typeof a.bpm === "number") as BpmAlt[]) : [];
}
function parseKeyAlts(v: unknown): KeyAlt[] {
  return Array.isArray(v) ? (v.filter((a) => a && typeof a.key === "string") as KeyAlt[]) : [];
}

const KEY_OPTIONS = [
  "C Major","C Minor","C# Major","C# Minor","Db Major","Db Minor",
  "D Major","D Minor","D# Major","D# Minor","Eb Major","Eb Minor",
  "E Major","E Minor",
  "F Major","F Minor","F# Major","F# Minor","Gb Major","Gb Minor",
  "G Major","G Minor","G# Major","G# Minor","Ab Major","Ab Minor",
  "A Major","A Minor","A# Major","A# Minor","Bb Major","Bb Minor",
  "B Major","B Minor",
];

interface CorrectionModalProps {
  track: Track;
  onClose: () => void;
}

export function CorrectionModal({ track, onClose }: CorrectionModalProps) {
  const t = useTranslations("library");
  const update = useUpdateTrack();

  const [bpmRaw, setBpmRaw] = React.useState(
    track.bpm != null ? String(track.bpm) : "",
  );
  const [key, setKey] = React.useState(track.key ?? "");

  const bpmAlts = parseBpmAlts(track.bpm_alternatives);
  const keyAlts = parseKeyAlts(track.key_alternatives);

  function handleSave() {
    const patch: Parameters<typeof update.mutate>[0]["patch"] = {};
    const bpmNum = parseFloat(bpmRaw);
    if (!isNaN(bpmNum)) {
      patch.bpm = bpmNum;
      patch.bpm_manual = true;
    }
    if (key) {
      patch.key = key;
      patch.key_manual = true;
    }
    if (Object.keys(patch).length > 0) {
      update.mutate({ id: track.id, patch });
    }
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        style={{ backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none md:items-center md:p-6">
        <GlassPanel
          className="kf-bottom-sheet pointer-events-auto relative flex w-full max-w-[440px] flex-col rounded-t-[24px] p-0 md:max-h-[calc(100dvh-48px)] md:rounded-[24px]"
          style={{ boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9)" }}
        >
          {/* header */}
          <div className="flex flex-none items-center justify-between border-b border-white/[0.07] px-5 py-4 md:px-7">
            <h2 className="text-[17px] font-semibold text-ink">{t("correctionTitle")}</h2>
            <button
              onClick={onClose}
              className="kf-touch-target rounded-full text-ink-subtle hover:text-ink"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="kf-scrollable min-h-0 flex-1 px-5 py-5 md:px-7">
          {/* BPM */}
          <div className="mb-5">
            <label className="kf-mono mb-2 block text-[11px] font-semibold tracking-[0.15em] text-ink-subtle">
              {t("correctionBpm")}
              {track.bpm_manual && (
                <span
                  className="ml-2 rounded px-1.5 py-0.5 text-[9.5px]"
                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
                >
                  {t("manualBadge")}
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="400"
              value={bpmRaw}
              onChange={(e) => setBpmRaw(e.target.value)}
              className="kf-mono w-full rounded-[12px] border bg-transparent px-4 py-2.5 text-[15px] font-semibold text-ink outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
              }}
            />
            {bpmAlts.length > 0 && (
              <div className="mt-2.5">
                <p className="kf-mono mb-1.5 text-[10.5px] text-ink-subtle">
                  {t("correctionAlternatives")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bpmAlts.map((a) => (
                    <button
                      key={a.bpm}
                      type="button"
                      onClick={() => setBpmRaw(String(a.bpm))}
                      className="kf-mono rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      {a.bpm} <span className="opacity-55">{a.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key */}
          <div className="mb-6">
            <label className="kf-mono mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] text-ink-subtle">
              {t("correctionKey")}
              {track.key_manual && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9.5px]"
                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
                >
                  {t("manualBadge")}
                </span>
              )}
              {key && <KeyChip keyName={key} size="sm" />}
            </label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full rounded-[12px] border px-4 py-2.5 text-[14px] text-ink outline-none"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(12,10,22,0.85)",
              }}
            >
              <option value="">—</option>
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            {keyAlts.length > 0 && (
              <div className="mt-2.5">
                <p className="kf-mono mb-1.5 text-[10.5px] text-ink-subtle">
                  {t("correctionAlternatives")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keyAlts.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setKey(a.key)}
                      className="rounded-lg border px-2.5 py-1 text-[12px] font-semibold text-ink-muted hover:text-ink transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      {a.key} <span className="opacity-55 text-[11px]">{a.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>

          {/* Actions */}
          <div className="sticky bottom-0 flex flex-none items-center justify-end gap-2.5 border-t border-white/[0.07] bg-black/20 px-5 py-4 backdrop-blur-xl md:px-7">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-[10px] px-4 py-2 text-[13.5px] font-medium text-ink-muted hover:text-ink transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {t("correctionCancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={update.isPending}
              className="min-h-11 rounded-[10px] px-5 py-2 text-[13.5px] font-semibold text-[#0a0912] disabled:opacity-60"
              style={{ background: "linear-gradient(120deg, #c084fc, #818cf8)" }}
            >
              {t("correctionSave")}
            </button>
          </div>
        </GlassPanel>
      </div>
    </>
  );
}
