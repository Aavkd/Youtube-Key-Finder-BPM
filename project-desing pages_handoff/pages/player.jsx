/* pages/player.jsx — Player: signature mood experience */

function moodWord(m) {
  const energy = m.energy;
  const e = energy > 0.66 ? "High energy" : energy > 0.33 ? "Mid energy" : "Low energy";
  const tone = m.minor
    ? (m.hue >= 150 && m.hue <= 260 ? "Hypnotic" : "Brooding")
    : (m.hue >= 30 && m.hue <= 150 ? "Radiant" : "Euphoric");
  return `${tone} · ${e}`;
}

function PlayerPage() {
  const track = {
    title: "Neon Trap Anthem", channel: "prod. nightwave", dur: 184, pos: 74,
    bpm: 142, key: "F# Minor",
    bpmConf: 0.91, keyConf: 0.74,
    bpmAlt: "71.0", bpmAltLabel: "½-time", keyAlt: "A Major", keyAltLabel: "relative",
  };
  const m = mood(track.key, track.bpm);
  const speed = 0.8 + m.energy * 1.6;

  const blobs = [
    { x: "6%", y: "-12%", size: 520, color: m.primary, anim: "kfDrift1", dur: 16, opacity: 0.75 },
    { x: "58%", y: "-18%", size: 560, color: m.accent, anim: "kfDrift2", dur: 19, opacity: 0.7 },
    { x: "68%", y: "38%", size: 460, color: `hsl(${(m.hue + 50) % 360} 85% 58%)`, anim: "kfDrift3", dur: 21, opacity: 0.5 },
    { x: "16%", y: "52%", size: 500, color: m.deep, anim: "kfDrift1", dur: 24, delay: 2, opacity: 0.55 },
    { x: "40%", y: "70%", size: 380, color: m.primary, anim: "kfPulse", dur: 6, opacity: 0.45 },
  ];

  return (
    <div className="kf" style={{ width: "100%", height: "100%", display: "flex", background: "var(--kf-base)", position: "relative", overflow: "hidden" }}>
      <NavRail active="home" />
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
        <Aurora blobs={blobs} speed={speed} base={`radial-gradient(120% 120% at 50% 30%, ${m.deep} 0%, #0a0712 55%, #050409 100%)`} />

        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "22px 34px", zIndex: 2 }}>
          <div className="kf-glass-soft" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 11px", borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: 500, color: "var(--kf-ink-2)" }}>
            <Icon name="chevLeft" size={16} /> Home
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--kf-ink-3)" }}>
            <Icon name="sparkles" size={14} style={{ color: m.primary }} />
            Mood from BPM + key · <span style={{ color: m.primary, fontWeight: 600 }}>{m.label} {m.hue}°</span>
          </div>
        </div>

        {/* result card */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px 24px", zIndex: 2 }}>
          <div className="kf-glass" style={{ width: 1000, maxWidth: "100%", borderRadius: 30, padding: 22, display: "flex", gap: 26, boxShadow: `0 40px 110px -30px rgba(0,0,0,0.9), 0 0 90px -30px ${m.glow}` }}>

            {/* artwork */}
            <div style={{ width: 320, flex: "0 0 320px", position: "relative" }}>
              <div style={{ position: "relative", width: 320, height: 320, borderRadius: 22, overflow: "hidden", border: "1px solid var(--kf-line-2)" }}>
                {/* placeholder cover, mood-tinted */}
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${m.primary}, ${m.deep} 70%)` }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.16) 0 11px, transparent 11px 22px)", mixBlendMode: "overlay" }} />
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3), transparent 55%)" }} />
                <div style={{ position: "absolute", left: 14, top: 12, fontSize: 10.5, letterSpacing: "0.04em", color: "rgba(255,255,255,0.7)", fontFamily: "var(--kf-mono)" }}>YT thumbnail</div>
                {/* play overlay */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 86, height: 86, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,18,0.42)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.55)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                    <Icon name="pause" size={32} fill="currentColor" style={{ color: "#fff" }} />
                  </div>
                </div>
                {/* now playing eq */}
                <div style={{ position: "absolute", left: 14, bottom: 13, display: "flex", alignItems: "center", gap: 9 }}>
                  <EQ color="#fff" bars={5} h={16} bpm={track.bpm} />
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Now playing</span>
                </div>
              </div>
              {/* mood readout under art */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "0 2px" }}>
                <span style={{ fontSize: 12.5, color: "var(--kf-ink-2)" }}>Mood</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: m.primary }}>{moodWord(m)}</span>
              </div>
            </div>

            {/* info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div className="kf-mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "hsl(150 70% 60%)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor", boxShadow: "0 0 8px currentColor" }} /> JUST ANALYZED
              </div>
              <h1 style={{ margin: "10px 0 3px", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.05 }}>{track.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--kf-ink-2)" }}>
                {track.channel}
                <span style={{ opacity: 0.4 }}>·</span>
                <span className="kf-mono">{fmtDur(track.dur)}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}><Icon name="external" size={13} /> YouTube</span>
              </div>

              {/* big readouts */}
              <div style={{ display: "flex", gap: 14, margin: "22px 0 0" }}>
                <Readout label="BPM" value={`${track.bpm}.0`} conf={track.bpmConf} alt={track.bpmAlt} altLabel={track.bpmAltLabel} mono />
                <Readout label="KEY" value={track.key} conf={track.keyConf} alt={track.keyAlt} altLabel={track.keyAltLabel} chip={<KeyChip keyName={track.key} bpm={track.bpm} />} />
              </div>

              <div style={{ flex: 1 }} />

              {/* waveform + time */}
              <div style={{ marginTop: 22 }}>
                <Wave seed={7} progress={track.pos / track.dur} color="rgba(255,255,255,0.22)" active={m.primary} bars={64} h={44} />
                <div className="kf-mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11.5, color: "var(--kf-ink-3)" }}>
                  <span style={{ color: m.primary }}>{fmtDur(track.pos)}</span>
                  <span>-{fmtDur(track.dur - track.pos)}</span>
                </div>
              </div>

              {/* controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CtrlBtn icon="chevLeft" />
                  <div style={{ width: 58, height: 58, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0a0912", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.82))", boxShadow: `0 12px 36px -8px ${m.glow}` }}>
                    <Icon name="pause" size={24} fill="currentColor" />
                  </div>
                  <CtrlBtn icon="chevRight" />
                </div>
                <div style={{ flex: 1 }} />
                {/* download split button */}
                <div style={{ display: "flex", alignItems: "stretch", borderRadius: 14, overflow: "hidden", boxShadow: `0 12px 30px -10px ${m.glow}` }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 9, border: "none", cursor: "pointer", padding: "14px 20px", fontFamily: "inherit", fontSize: 14.5, fontWeight: 600, color: "#0a0912", background: `linear-gradient(120deg, ${m.primary}, ${m.accent})` }}>
                    <Icon name="download" size={17} stroke={2.3} /> Download WAV
                  </button>
                  <button style={{ border: "none", borderLeft: "1px solid rgba(0,0,0,0.18)", cursor: "pointer", padding: "0 12px", color: "#0a0912", background: m.accent, display: "flex", alignItems: "center" }}>
                    <Icon name="chevDown" size={16} stroke={2.4} />
                  </button>
                </div>
              </div>
              <div className="kf-mono" style={{ marginTop: 12, fontSize: 11.5, color: "var(--kf-ink-3)", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="download" size={12} />
                <span style={{ color: "var(--kf-ink-2)" }}>[142][F#m] Neon Trap Anthem.wav</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, conf, alt, altLabel, mono, chip }) {
  return (
    <div className="kf-glass-soft" style={{ flex: 1, borderRadius: 18, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="kf-mono" style={{ fontSize: 10.5, letterSpacing: "0.18em", color: "var(--kf-ink-3)", fontWeight: 600 }}>{label}</span>
        <Confidence value={conf} compact />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 9 }}>
        {chip ? <div style={{ fontSize: 27, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>{value}</div>
          : <div className="kf-mono" style={{ fontSize: 38, fontWeight: 600, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11.5, color: "var(--kf-ink-3)" }}>alt</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: "var(--kf-ink-2)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--kf-line)", cursor: "pointer" }}>
          <span className="kf-mono">{alt}</span><span style={{ opacity: 0.6 }}>{altLabel}</span>
          <Icon name="refresh" size={11} style={{ opacity: 0.7 }} />
        </span>
        <div style={{ flex: 1 }} />
        <span title="Edit manually" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, color: "var(--kf-ink-2)", border: "1px solid var(--kf-line)", cursor: "pointer" }}><Icon name="edit" size={13} /></span>
      </div>
    </div>
  );
}

function CtrlBtn({ icon }) {
  return (
    <div style={{ width: 42, height: 42, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--kf-ink-2)", border: "1px solid var(--kf-line)", background: "rgba(255,255,255,0.04)" }}>
      <Icon name={icon} size={18} />
    </div>
  );
}

window.PlayerPage = PlayerPage;
