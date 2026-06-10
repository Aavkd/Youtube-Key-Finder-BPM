"use client";

import * as React from "react";

// Derive the instance type straight from the module (wavesurfer.js ships types).
type WaveSurferInstance = InstanceType<
  Awaited<typeof import("wavesurfer.js")>["default"]
>;

interface WavePlayerOptions {
  /** Audio stream URL; null disables the player (e.g. no audio yet). */
  url: string | null;
  waveColor: string;
  progressColor: string;
  /** Auto-play once the audio is decoded (respects D27 auto-play toggle). */
  autoplay?: boolean;
}

interface WavePlayerState {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: boolean;
  playPause: () => void;
  seekFraction: (fraction: number) => void;
}

/**
 * Thin React wrapper around wavesurfer.js (SPEC: Waveform/player tool).
 * Creates the instance against a container ref, streams the track's WAV, and
 * surfaces play/pause + progress so the Player UI can drive mood visuals.
 */
export function useWavePlayer({
  url,
  waveColor,
  progressColor,
  autoplay = false,
}: WavePlayerOptions): WavePlayerState {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const wsRef = React.useRef<WaveSurferInstance | null>(null);

  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [error, setError] = React.useState(false);

  // Keep the latest colors without forcing a full re-init on theme changes.
  const colorsRef = React.useRef({ waveColor, progressColor });
  colorsRef.current = { waveColor, progressColor };

  React.useEffect(() => {
    if (!url || !containerRef.current) return;
    let disposed = false;
    setIsReady(false);
    setError(false);

    void import("wavesurfer.js").then((mod) => {
      if (disposed || !containerRef.current) return;
      const ws = mod.default.create({
        container: containerRef.current,
        height: 44,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        cursorWidth: 0,
        normalize: true,
        waveColor: colorsRef.current.waveColor,
        progressColor: colorsRef.current.progressColor,
        url,
      });
      wsRef.current = ws;

      ws.on("ready", () => {
        if (disposed) return;
        setIsReady(true);
        setDuration(ws.getDuration());
        if (autoplay) void ws.play();
      });
      ws.on("timeupdate", (t: number) => setCurrentTime(t));
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));
      ws.on("error", () => {
        if (!disposed) setError(true);
      });
    });

    return () => {
      disposed = true;
      if (wsRef.current) {
        try {
          wsRef.current.destroy();
        } catch {
          /* instance already torn down */
        }
        wsRef.current = null;
      }
    };
  }, [url, autoplay]);

  const playPause = React.useCallback(() => {
    if (wsRef.current && isReady) wsRef.current.playPause();
  }, [isReady]);

  const seekFraction = React.useCallback(
    (fraction: number) => {
      if (wsRef.current && isReady) {
        wsRef.current.seekTo(Math.max(0, Math.min(1, fraction)));
      }
    },
    [isReady],
  );

  return {
    containerRef,
    isReady,
    isPlaying,
    currentTime,
    duration,
    error,
    playPause,
    seekFraction,
  };
}
