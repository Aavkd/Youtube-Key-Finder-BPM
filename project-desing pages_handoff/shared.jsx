/* shared.jsx — Key Finder shared system
   Mood-color engine (circle of fifths → hue), icon set, glass primitives,
   global nav rail. Everything exported to window for the page files. */

const { useState } = React;

/* ── Mood-color engine ────────────────────────────────────────────────
   Circle of fifths, clockwise from C = red (0°): C G D A E B F# Db Ab Eb Bb F.
   Major = brighter & more saturated; minor = darker & more desaturated.
   BPM modulates energy via smoothstep over 60–180.                      */
const FIFTHS = {
  C: 0, G: 30, D: 60, A: 90, E: 120, B: 150,
  "F#": 180, Gb: 180, "C#": 210, Db: 210, "G#": 240, Ab: 240,
  "D#": 270, Eb: 270, "A#": 300, Bb: 300, F: 330,
};

function smoothstep(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

// Parse "F# Minor" → { tonic:"F#", minor:true }
function parseKey(key) {
  const m = String(key).trim().match(/^([A-G][#b]?)\s*(maj|min|major|minor|m)?/i);
  const tonic = m ? m[1] : "C";
  const minor = /min|minor|^m$/i.test(m && m[2] ? m[2] : "Major");
  return { tonic, minor };
}

// Returns rich palette for a track's mood.
function mood(key, bpm) {
  const { tonic, minor } = parseKey(key);
  const hue = FIFTHS[tonic] ?? 0;
  const energy = smoothstep(((bpm || 90) - 60) / 120); // 0..1
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

function keyAbbrev(key) {
  const { tonic, minor } = parseKey(key);
  return tonic + (minor ? "m" : "maj");
}

function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Icon set (lucide-style inline strokes) ─────────────────────────── */
const PATHS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M16 8l-2.5 5.5L8 16l2.5-5.5z",
  library: "M4 4h7v16H4zM13 4h7v16h-7M16 8v8",
  disc: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4z",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2c2.8 2.6 4.2 6 4.2 10S14.8 19.4 12 22M12 2C9.2 4.6 7.8 8 7.8 12S9.2 19.4 12 22",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-4-4",
  play: "M7 4.5v15l13-7.5z",
  pause: "M8 4h3v16H8zM15 4h3v16h-3z",
  download: "M12 3v12M7 11l5 5 5-5M4 21h16",
  heart: "M12 21C5 15.5 3 11.5 3 8.2 3 5.4 5.2 3.5 7.7 3.5c1.7 0 3.2.9 4.3 2.4 1.1-1.5 2.6-2.4 4.3-2.4C18.8 3.5 21 5.4 21 8.2c0 3.3-2 7.3-9 12.8z",
  external: "M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6",
  chevDown: "M5 8l7 7 7-7",
  chevRight: "M9 5l7 7-7 7",
  chevLeft: "M15 5l-7 7 7 7",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  check: "M4 12l5 5L20 6",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5",
  clipboard: "M9 4h6v3H9zM7 5H5v15h14V5h-2M9 12h6M9 16h4",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  star: "M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  edit: "M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3zM13.5 6.5l3 3",
  waveform: "M3 12h2M7 8v8M11 4v16M15 7v10M19 10v4M23 12h-2",
  link: "M9 15l6-6M10 6l1.5-1.5a4 4 0 0 1 6 6L16 12M14 18l-1.5 1.5a4 4 0 0 1-6-6L8 12",
  filter: "M3 5h18l-7 8v6l-4-2v-4z",
  zap: "M13 2L4 14h7l-1 8 9-12h-7z",
  flame: "M12 22c4 0 7-2.7 7-7 0-4-3-6-3-9 0 2-1.5 3-3 3 .5-2-1-5-3-6 .5 3-2 4.5-2 8 0 4 3 7 7 7z",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowUpRight: "M7 17L17 7M8 7h9v9",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  tag: "M3 11l8-8 9 9-8 8zM7.5 7.5h.01",
};

function Icon({ name, size = 18, stroke = 2, fill = "none", style }) {
  const filled = ["play", "pause", "heart", "star"].includes(name) && fill === "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : fill}
      stroke={filled ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={{ display: "block", flex: "0 0 auto", ...style }}>
      <path d={PATHS[name] || ""} />
    </svg>
  );
}

/* ── Aurora background (full-spectrum, reactive) ────────────────────── */
function Aurora({ blobs, speed = 1, base = "radial-gradient(120% 120% at 50% 0%, #0d0b1a 0%, #07060e 55%, #050409 100%)" }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: base }}>
      {blobs.map((b, i) => (
        <div key={i} className="kf-aurora" style={{
          width: b.size, height: b.size, left: b.x, top: b.y, background: b.color,
          opacity: b.opacity ?? 0.8,
          animation: `${b.anim || "kfDrift1"} ${(b.dur || 16) / speed}s ease-in-out infinite`,
          animationDelay: `${b.delay || 0}s`,
        }} />
      ))}
      {/* faint film grain / vignette for depth */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
}

/* Reactive equalizer bars (for play states) */
function EQ({ color = "#fff", bars = 5, h = 18, gap = 3, bpm = 120 }) {
  const base = 60 / (bpm || 120);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height: h }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3, height: h, borderRadius: 2, background: color, transformOrigin: "bottom",
          animation: `kfBars ${base * (0.7 + (i % 3) * 0.25)}s ease-in-out ${i * 0.12}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* Mini waveform (deterministic from a seed) */
function Wave({ seed = 1, color = "rgba(255,255,255,0.5)", active = "#fff", progress = 0, bars = 48, h = 40, w = "100%" }) {
  const heights = React.useMemo(() => {
    const out = []; let s = seed * 9301 + 49297;
    for (let i = 0; i < bars; i++) { s = (s * 9301 + 49297) % 233280; const r = s / 233280; out.push(0.18 + Math.pow(r, 0.7) * 0.82); }
    return out;
  }, [seed, bars]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: h, width: w }}>
      {heights.map((ht, i) => (
        <span key={i} style={{
          flex: 1, height: `${ht * 100}%`, borderRadius: 2, minWidth: 1.5,
          background: i / bars < progress ? active : color,
        }} />
      ))}
    </div>
  );
}

/* Confidence badge */
function Confidence({ value, compact }) {
  const pct = Math.round(value * 100);
  const level = value >= 0.8 ? "High" : value >= 0.55 ? "Medium" : "Low";
  const c = value >= 0.8 ? "150 70% 55%" : value >= 0.55 ? "45 95% 60%" : "8 90% 62%";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: compact ? "3px 8px" : "5px 11px",
      borderRadius: 999, fontSize: compact ? 11 : 12, fontWeight: 600,
      background: `hsla(${c} / 0.16)`, border: `1px solid hsla(${c} / 0.4)`, color: `hsl(${c})`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: `hsl(${c})`, boxShadow: `0 0 8px hsl(${c})` }} />
      {level}{!compact && <span className="kf-mono" style={{ opacity: 0.8, fontWeight: 500 }}>{pct}%</span>}
    </span>
  );
}

/* Key chip — colored by the circle-of-fifths hue */
function KeyChip({ keyName, bpm, size = "md" }) {
  const m = mood(keyName, bpm);
  const pad = size === "sm" ? "3px 9px" : "5px 12px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <span className="kf-mono" style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: pad, borderRadius: 8,
      fontSize: fs, fontWeight: 600, color: "#fff",
      background: `linear-gradient(135deg, ${m.soft}, hsla(${m.hue} 70% 50% / 0.05))`,
      border: `1px solid hsla(${m.hue} 80% 60% / 0.45)`,
      boxShadow: `0 0 16px -4px ${m.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: m.primary, boxShadow: `0 0 10px ${m.glow}` }} />
      {keyName}
    </span>
  );
}

/* ── Global left nav rail (consistent across pages) ─────────────────── */
function NavRail({ active = "home", lang = "EN" }) {
  const items = [
    { id: "home", icon: "home", label: "Home" },
    { id: "discovery", icon: "compass", label: "Discover" },
    { id: "library", icon: "disc", label: "Library" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];
  return (
    <div style={{
      width: 76, flex: "0 0 76px", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "20px 0 18px", gap: 8, position: "relative", zIndex: 5,
      borderRight: "1px solid var(--kf-line)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
      backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
    }}>
      {/* logo mark */}
      <div style={{ position: "relative", width: 40, height: 40, marginBottom: 14 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "conic-gradient(from 0deg, hsl(0 85% 60%), hsl(60 85% 60%), hsl(120 75% 55%), hsl(180 80% 58%), hsl(240 80% 65%), hsl(300 85% 62%), hsl(0 85% 60%))", filter: "blur(0.5px)", opacity: 0.9 }} />
        <div style={{ position: "absolute", inset: 3, borderRadius: 10, background: "#0a0912", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="music" size={18} stroke={2.2} style={{ color: "#fff" }} />
        </div>
      </div>

      {items.map((it) => {
        const on = it.id === active;
        return (
          <div key={it.id} title={it.label} style={{
            width: 52, height: 52, borderRadius: 15, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", position: "relative",
            color: on ? "#fff" : "var(--kf-ink-3)",
            background: on ? "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))" : "transparent",
            border: on ? "1px solid var(--kf-line-2)" : "1px solid transparent",
            boxShadow: on ? "0 8px 22px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
          }}>
            {on && <span style={{ position: "absolute", left: -20, top: "50%", transform: "translateY(-50%)", width: 3, height: 22, borderRadius: 2, background: "linear-gradient(#fff, rgba(255,255,255,0.3))" }} />}
            <Icon name={it.icon} size={20} stroke={on ? 2.1 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.01em" }}>{it.label}</span>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* language switcher */}
      <div className="kf-mono" style={{ display: "flex", flexDirection: "column", borderRadius: 11, overflow: "hidden", border: "1px solid var(--kf-line)", fontSize: 11, fontWeight: 600 }}>
        {["EN", "FR"].map((l) => (
          <span key={l} style={{
            padding: "6px 9px", textAlign: "center",
            color: l === lang ? "#0a0912" : "var(--kf-ink-2)",
            background: l === lang ? "rgba(255,255,255,0.92)" : "transparent",
          }}>{l}</span>
        ))}
      </div>
      {/* theme toggle */}
      <div title="Theme" style={{ width: 38, height: 38, marginTop: 4, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kf-ink-2)", border: "1px solid var(--kf-line)" }}>
        <Icon name="moon" size={17} stroke={1.8} />
      </div>
    </div>
  );
}

Object.assign(window, {
  mood, parseKey, keyAbbrev, fmtDur, smoothstep, FIFTHS,
  Icon, Aurora, EQ, Wave, Confidence, KeyChip, NavRail,
});
