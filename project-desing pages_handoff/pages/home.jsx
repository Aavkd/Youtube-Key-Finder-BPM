/* pages/home.jsx — Home: paste & process */

function HomeHero() {
  // aggregated-library-mood aurora: full spectrum
  const blobs = [
    { x: "8%", y: "-8%", size: 460, color: "hsl(280 85% 55%)", anim: "kfDrift1", dur: 18, opacity: 0.7 },
    { x: "52%", y: "-14%", size: 520, color: "hsl(200 90% 55%)", anim: "kfDrift2", dur: 22, opacity: 0.6 },
    { x: "70%", y: "30%", size: 440, color: "hsl(330 88% 58%)", anim: "kfDrift3", dur: 20, opacity: 0.55 },
    { x: "20%", y: "55%", size: 480, color: "hsl(150 75% 50%)", anim: "kfDrift1", dur: 24, delay: 3, opacity: 0.42 },
    { x: "44%", y: "62%", size: 360, color: "hsl(45 95% 58%)", anim: "kfDrift2", dur: 19, delay: 1, opacity: 0.4 },
  ];

  const queue = [
    { title: "Neon Trap Anthem", state: "ready", key: "F# Minor", bpm: 142, dur: 184 },
    { title: "Midnight Drive Type Beat", state: "analyzing", pct: 68, sub: "Reconciling BPM across 3 engines…" },
    { title: "Smooth Soul Loop", state: "downloading", pct: 31, sub: "Fetching audio · 2.1 MB/s" },
    { title: "Live DJ Set — 2 Hours", state: "error", sub: "Exceeds 20 min duration limit" },
  ];

  return (
    <div className="kf" style={{ width: "100%", height: "100%", display: "flex", background: "var(--kf-base)", position: "relative", overflow: "hidden" }}>
      <NavRail active="home" />

      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
        <Aurora blobs={blobs} />
        {/* circle-of-fifths motif, faint */}
        <div style={{ position: "absolute", right: -160, top: -160, width: 620, height: 620, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", animation: "kfSpin 90s linear infinite", pointerEvents: "none" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 5, height: 5, borderRadius: 999, transform: `rotate(${i * 30}deg) translateY(-310px)`, background: `hsl(${i * 30} 80% 60%)`, opacity: 0.5, boxShadow: `0 0 12px hsl(${i * 30} 80% 60%)` }} />
          ))}
        </div>

        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "22px 34px", zIndex: 2 }}>
          <div className="kf-mono" style={{ fontSize: 12, letterSpacing: "0.22em", color: "var(--kf-ink-3)", fontWeight: 600 }}>KEY&nbsp;FINDER</div>
          <div style={{ flex: 1 }} />
          <div className="kf-glass-soft" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 14px", borderRadius: 999 }}>
            <Icon name="sparkles" size={14} style={{ color: "hsl(280 85% 70%)" }} />
            <span style={{ fontSize: 12.5, color: "var(--kf-ink-2)", fontWeight: 500 }}>Background</span>
            <span style={{ fontSize: 12.5, color: "var(--kf-ink)", fontWeight: 600 }}>Library mood</span>
            <div style={{ display: "flex", gap: 3, marginLeft: 2 }}>
              {[280, 200, 330, 150].map((h) => <span key={h} style={{ width: 7, height: 7, borderRadius: 999, background: `hsl(${h} 80% 60%)` }} />)}
            </div>
          </div>
        </div>

        {/* hero */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", zIndex: 2, marginTop: -10 }}>
          <div className="kf-mono" style={{ fontSize: 12.5, letterSpacing: "0.34em", color: "var(--kf-ink-2)", fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <span>PASTE</span><span style={{ opacity: 0.4 }}>→</span><span>DOWNLOAD</span><span style={{ opacity: 0.4 }}>→</span><span>ANALYZE</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 58, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.02, textAlign: "center", color: "#fff" }}>
            Drop the link.<br />
            <span style={{ background: "linear-gradient(100deg, hsl(200 90% 70%), hsl(280 90% 72%), hsl(330 90% 70%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>We'll find the key.</span>
          </h1>
          <p style={{ margin: "18px 0 38px", fontSize: 16.5, color: "var(--kf-ink-2)", textAlign: "center", maxWidth: 520, lineHeight: 1.5 }}>
            One paste → accurate BPM, musical key, and a clean WAV — ready to drop into your DAW.
          </p>

          {/* the pill */}
          <div className="kf-glass" style={{ width: 760, maxWidth: "92%", borderRadius: 999, padding: "11px 12px 11px 24px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 30px 80px -28px rgba(0,0,0,0.85), 0 0 60px -20px hsla(280 90% 60% / 0.4)" }}>
            <Icon name="link" size={20} style={{ color: "var(--kf-ink-2)" }} />
            <input readOnly value="https://youtube.com/watch?v=…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--kf-ink)", fontSize: 17, fontFamily: "inherit" }} />
            <button style={{ display: "flex", alignItems: "center", gap: 9, border: "none", cursor: "pointer", padding: "14px 26px", borderRadius: 999, fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: "#0a0912", background: "linear-gradient(120deg, hsl(200 95% 72%), hsl(280 92% 74%))", boxShadow: "0 10px 30px -8px hsla(260 90% 60% / 0.7)" }}>
              <Icon name="zap" size={17} stroke={2.4} /> Analyze
            </button>
          </div>

          {/* hints */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18, fontSize: 13, color: "var(--kf-ink-3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={14} /> Single video</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={14} /> Max 20 min</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Export</span>
              <span className="kf-mono" style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, fontWeight: 600, border: "1px solid var(--kf-line)" }}>WAV</span>
              <span className="kf-mono" style={{ fontSize: 11.5 }}>MP3</span>
            </div>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(150 70% 60%)" }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor", boxShadow: "0 0 8px currentColor" }} /> Auto-play to Player</span>
          </div>
        </div>

        {/* processing queue */}
        <div className="kf-glass" style={{ margin: "0 34px 28px", borderRadius: 22, padding: "16px 18px", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Icon name="sliders" size={15} style={{ color: "var(--kf-ink-2)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Processing queue</span>
            <span className="kf-mono" style={{ fontSize: 11, color: "var(--kf-ink-3)", padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.06)" }}>2 active · 1 done</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "var(--kf-ink-3)" }}>Runs in the background — feel free to browse</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {queue.map((q, i) => <QueueRow key={i} q={q} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ q }) {
  const m = q.key ? mood(q.key, q.bpm) : null;
  const stateMeta = {
    ready: { c: "150 70% 55%", label: "Ready" },
    analyzing: { c: "280 85% 68%", label: "Analyzing" },
    downloading: { c: "200 90% 62%", label: "Downloading" },
    error: { c: "8 88% 62%", label: "Failed" },
  }[q.state];

  return (
    <div className="kf-glass-soft" style={{ borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 13, position: "relative", overflow: "hidden" }}>
      {/* thumb / status orb */}
      <div style={{ width: 42, height: 42, borderRadius: 11, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        background: m ? `linear-gradient(135deg, ${m.primary}, ${m.deep})` : `hsla(${stateMeta.c} / 0.18)`,
        border: `1px solid hsla(${stateMeta.c} / 0.4)` }}>
        {q.state === "ready" && <Icon name="play" size={16} fill="currentColor" style={{ color: "#fff" }} />}
        {q.state === "analyzing" && <div style={{ width: 18, height: 18, borderRadius: 999, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", animation: "kfSpin 0.9s linear infinite" }} />}
        {q.state === "downloading" && <Icon name="download" size={16} style={{ color: `hsl(${stateMeta.c})` }} />}
        {q.state === "error" && <Icon name="x" size={16} style={{ color: `hsl(${stateMeta.c})` }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 230 }}>{q.title}</span>
        </div>
        {q.state === "ready" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <KeyChip keyName={q.key} bpm={q.bpm} size="sm" />
            <span className="kf-mono" style={{ fontSize: 12, color: "var(--kf-ink-2)", fontWeight: 600 }}>{q.bpm}.0 BPM</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: "var(--kf-ink-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.sub}</div>
            {q.pct != null && (
              <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginTop: 7, overflow: "hidden" }}>
                <div style={{ width: `${q.pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, hsla(${stateMeta.c} / 0.5), hsl(${stateMeta.c}))` }} />
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8 }}>
        {q.pct != null && <span className="kf-mono" style={{ fontSize: 12, color: "var(--kf-ink-2)", fontWeight: 600 }}>{q.pct}%</span>}
        {q.state === "error" && (
          <button style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid hsla(8 88% 62% / 0.4)", background: "hsla(8 88% 62% / 0.14)", color: "hsl(8 90% 70%)", borderRadius: 9, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="refresh" size={13} /> Retry
          </button>
        )}
        {q.state === "ready" && <span style={{ fontSize: 11.5, fontWeight: 600, color: `hsl(${stateMeta.c})`, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor", boxShadow: "0 0 8px currentColor" }} />{stateMeta.label}</span>}
      </div>
    </div>
  );
}

window.HomeHero = HomeHero;
