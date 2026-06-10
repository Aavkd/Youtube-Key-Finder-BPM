/* pages/settings.jsx — Settings + mood palette editor */

const FIFTHS_ORDER = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

function SettingsPage() {
  return (
    <div className="kf" style={{ width: "100%", height: "100%", display: "flex", background: "var(--kf-base)", position: "relative", overflow: "hidden" }}>
      <Aurora speed={0.4} blobs={[
        { x: "20%", y: "-30%", size: 480, color: "hsl(280 65% 45%)", anim: "kfDrift1", dur: 32, opacity: 0.3 },
        { x: "78%", y: "30%", size: 460, color: "hsl(200 65% 45%)", anim: "kfDrift2", dur: 36, opacity: 0.26 },
      ]} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <NavRail active="settings" />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 34px" }}>
          <div style={{ marginBottom: 14 }}>
            <div className="kf-mono" style={{ fontSize: 11, letterSpacing: "0.22em", color: "var(--kf-ink-3)", fontWeight: 600 }}>PREFERENCES</div>
            <h1 style={{ margin: "7px 0 0", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>Settings</h1>
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 18, minHeight: 0 }}>
            {/* LEFT — stacked setting cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <Card title="Appearance" icon="sun">
                <Row label="Theme">
                  <Segmented options={["Dark", "Light"]} active="Dark" />
                </Row>
                <Row label="Language">
                  <Segmented options={["EN", "FR"]} active="EN" mono />
                </Row>
              </Card>

              <Card title="Player experience" icon="play">
                <Row label="Auto-transition & auto-play" sub="Off = download-only flow">
                  <Toggle on />
                </Row>
                <Row label="Mood source" col>
                  <RadioRow options={[{ k: "Circle of fifths → HSL", on: true }, { k: "Thumbnail-derived palette" }]} />
                </Row>
              </Card>

              <Card title="Home background" icon="sparkles">
                <RadioRow options={[{ k: "Aggregated library mood", on: true }, { k: "Time of day" }, { k: "Random on load" }]} />
              </Card>

              <Card title="Export & processing" icon="download">
                <Row label="Default format">
                  <Segmented options={["WAV", "MP3 320"]} active="WAV" mono />
                </Row>
                <Row label="Filename">
                  <span className="kf-mono" style={{ fontSize: 11.5, color: "var(--kf-ink-2)", padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid var(--kf-line)" }}>[BPM][Key] Title</span>
                </Row>
                <Row label="Duration limit" sub="Reject longer videos">
                  <Slider value={0.5} display="20 min" />
                </Row>
                <Row label="Queue concurrency">
                  <Stepper value={2} />
                </Row>
              </Card>
            </div>

            {/* RIGHT — mood palette editor */}
            <MoodPaletteEditor />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="kf-glass" style={{ borderRadius: 18, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
        <Icon name={icon} size={15} style={{ color: "var(--kf-ink-2)" }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, children, col }) {
  return (
    <div style={{ display: "flex", flexDirection: col ? "column" : "row", alignItems: col ? "stretch" : "center", gap: col ? 9 : 12 }}>
      <div style={{ flex: col ? "none" : 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--kf-ink)" }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--kf-ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Segmented({ options, active, mono }) {
  return (
    <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--kf-line)" }}>
      {options.map((o) => (
        <span key={o} className={mono ? "kf-mono" : ""} style={{
          padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          color: o === active ? "#0a0912" : "var(--kf-ink-2)",
          background: o === active ? "rgba(255,255,255,0.92)" : "transparent",
        }}>{o}</span>
      ))}
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{ width: 46, height: 26, borderRadius: 999, padding: 3, display: "flex", cursor: "pointer",
      justifyContent: on ? "flex-end" : "flex-start",
      background: on ? "linear-gradient(120deg, hsl(150 70% 50%), hsl(170 70% 50%))" : "rgba(255,255,255,0.1)",
      border: "1px solid var(--kf-line)" }}>
      <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }} />
    </div>
  );
}

function RadioRow({ options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((o) => (
        <div key={o.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11, cursor: "pointer",
          background: o.on ? "rgba(255,255,255,0.07)" : "transparent", border: o.on ? "1px solid var(--kf-line-2)" : "1px solid var(--kf-line)" }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, border: o.on ? "5px solid hsl(280 85% 65%)" : "2px solid var(--kf-ink-3)", boxSizing: "border-box", boxShadow: o.on ? "0 0 10px hsla(280 85% 65% / 0.6)" : "none" }} />
          <span style={{ fontSize: 13, fontWeight: o.on ? 600 : 500, color: o.on ? "#fff" : "var(--kf-ink-2)" }}>{o.k}</span>
        </div>
      ))}
    </div>
  );
}

function Slider({ value, display }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 120, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.1)", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${value * 100}%`, borderRadius: 999, background: "linear-gradient(90deg, hsl(200 90% 60%), hsl(280 85% 65%))" }} />
        <span style={{ position: "absolute", left: `${value * 100}%`, top: "50%", transform: "translate(-50%,-50%)", width: 15, height: 15, borderRadius: 999, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }} />
      </div>
      <span className="kf-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--kf-ink)", minWidth: 48 }}>{display}</span>
    </div>
  );
}

function Stepper({ value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderRadius: 10, overflow: "hidden", border: "1px solid var(--kf-line)" }}>
      <span style={{ width: 30, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kf-ink-2)", cursor: "pointer" }}>−</span>
      <span className="kf-mono" style={{ width: 34, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{value}</span>
      <span style={{ width: 30, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kf-ink-2)", cursor: "pointer" }}>+</span>
    </div>
  );
}

/* ── The centerpiece: mood palette editor ──────────────────────────── */
function MoodPaletteEditor() {
  const selected = "F#";
  const selMood = mood("F# Minor", 142);
  return (
    <div className="kf-glass" style={{ borderRadius: 22, padding: "18px 20px", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px -28px rgba(0,0,0,0.8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="sparkles" size={16} style={{ color: "hsl(280 85% 70%)" }} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Mood palette editor</span>
        <div style={{ flex: 1 }} />
        <div className="kf-glass-soft" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: "var(--kf-ink)", cursor: "pointer" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: "linear-gradient(135deg, hsl(280 85% 60%), hsl(330 85% 60%))" }} /> Neon Nights <Icon name="chevDown" size={13} style={{ opacity: 0.6 }} />
        </div>
        <button style={{ border: "none", background: "rgba(255,255,255,0.9)", color: "#0a0912", borderRadius: 10, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--kf-ink-3)", lineHeight: 1.4 }}>Tune how each musical key maps to color. C anchors at red (0°), walking the circle of fifths clockwise.</p>

      {/* wheel + center */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, position: "relative", margin: "6px 0" }}>
        <div style={{ position: "relative", width: 280, height: 280 }}>
          {/* hue ring */}
          <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "conic-gradient(from -90deg, hsl(0 80% 55%), hsl(30 80% 55%), hsl(60 80% 55%), hsl(90 80% 55%), hsl(120 80% 55%), hsl(150 80% 55%), hsl(180 80% 55%), hsl(210 80% 55%), hsl(240 80% 55%), hsl(270 80% 55%), hsl(300 80% 55%), hsl(330 80% 55%), hsl(0 80% 55%))", opacity: 0.22, filter: "blur(2px)" }} />
          <div style={{ position: "absolute", inset: 60, borderRadius: "50%", background: "#0a0912", border: "1px solid var(--kf-line)" }} />
          {/* center preview */}
          <div style={{ position: "absolute", inset: 86, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${selMood.primary}, ${selMood.deep})`, boxShadow: `0 0 40px -6px ${selMood.glow}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>selected</span>
            <span className="kf-mono" style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>F#m</span>
            <span className="kf-mono" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>{selMood.hue}° · 142 BPM</span>
          </div>
          {/* 12 key dots */}
          {FIFTHS_ORDER.map((note, i) => {
            const ang = (i * 30 - 90) * Math.PI / 180;
            const R = 116;
            const x = 140 + Math.cos(ang) * R, y = 140 + Math.sin(ang) * R;
            const hue = i * 30;
            const sel = note === selected;
            return (
              <div key={note} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ width: sel ? 26 : 20, height: sel ? 26 : 20, borderRadius: 999, background: `hsl(${hue} 80% 58%)`, border: sel ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.25)", boxShadow: sel ? `0 0 16px hsl(${hue} 80% 58%)` : `0 0 8px hsla(${hue} 80% 58% / 0.5)` }} />
                <span className="kf-mono" style={{ fontSize: 9.5, fontWeight: 600, color: sel ? "#fff" : "var(--kf-ink-3)" }}>{note}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* selected color sliders */}
      <div style={{ display: "flex", gap: 10 }}>
        {[{ l: "Hue", v: 0.5, c: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }, { l: "Sat", v: 0.66, c: `linear-gradient(90deg, #888, ${selMood.primary})` }, { l: "Light", v: 0.5, c: `linear-gradient(90deg, #000, ${selMood.primary}, #fff)` }].map((s) => (
          <div key={s.l} style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--kf-ink-2)", fontWeight: 500 }}>{s.l}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: s.c, position: "relative", border: "1px solid var(--kf-line)" }}>
              <span style={{ position: "absolute", left: `${s.v * 100}%`, top: "50%", transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.5)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* major/minor + energy */}
      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: "var(--kf-ink-2)", marginBottom: 7 }}>Major / minor brightness</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: `linear-gradient(135deg, ${selMood.primary}, ${selMood.accent})`, color: "#0a0912" }}>major · bright</span>
            <span style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 8, fontSize: 11.5, fontWeight: 600, background: `linear-gradient(135deg, ${selMood.deep}, hsl(${selMood.hue} 40% 20%))`, color: "#fff" }}>minor · dark</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: "var(--kf-ink-2)", marginBottom: 7 }}>BPM energy curve <span className="kf-mono" style={{ opacity: 0.6 }}>60–180</span></div>
          <svg viewBox="0 0 120 34" style={{ width: "100%", height: 34, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--kf-line)" }}>
            <path d="M2 30 C 40 30, 60 4, 118 4" fill="none" stroke="url(#g)" strokeWidth="2.2" strokeLinecap="round" />
            <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="hsl(200 90% 60%)" /><stop offset="1" stopColor="hsl(330 88% 64%)" /></linearGradient></defs>
            <circle cx="60" cy="17" r="3" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  );
}

window.SettingsPage = SettingsPage;
