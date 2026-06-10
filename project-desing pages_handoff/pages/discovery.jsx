/* pages/discovery.jsx — Discovery: linked playlists + search */

const DISC_RESULTS = [
  { id: 1, title: "Dark Ambient Type Beat — \"Void\"", channel: "WavyType", dur: 192, views: "84K", hue: 280, state: "idle" },
  { id: 2, title: "90s Soul Sample Pack [FREE]", channel: "Crate Diggers", dur: 156, views: "212K", hue: 35, state: "importing" },
  { id: 3, title: "Hard Drill Instrumental 2026", channel: "UK Plug", dur: 168, views: "47K", hue: 210, state: "idle" },
  { id: 4, title: "Lofi Guitar Loop — golden", channel: "dusty.tape", dur: 124, views: "138K", hue: 150, state: "imported" },
  { id: 5, title: "Trap Anthem Free Beat", channel: "808 Mafia Type", dur: 201, views: "59K", hue: 330, state: "idle" },
  { id: 6, title: "Cinematic Piano Sketch", channel: "Score Lab", dur: 178, views: "23K", hue: 190, state: "idle" },
];

function DiscoveryPage() {
  return (
    <div className="kf" style={{ width: "100%", height: "100%", display: "flex", background: "var(--kf-base)", position: "relative", overflow: "hidden" }}>
      <Aurora speed={0.6} blobs={[
        { x: "12%", y: "-26%", size: 520, color: "hsl(190 80% 48%)", anim: "kfDrift1", dur: 26, opacity: 0.4 },
        { x: "62%", y: "-18%", size: 480, color: "hsl(300 75% 50%)", anim: "kfDrift2", dur: 30, opacity: 0.36 },
        { x: "70%", y: "45%", size: 420, color: "hsl(45 85% 52%)", anim: "kfDrift3", dur: 28, opacity: 0.28 },
      ]} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <NavRail active="discovery" />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* header */}
          <div style={{ padding: "26px 34px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div>
                <div className="kf-mono" style={{ fontSize: 11, letterSpacing: "0.22em", color: "hsl(190 80% 65%)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="compass" size={14} /> DISCOVER
                </div>
                <h1 style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>Find your next flip</h1>
              </div>
              <div style={{ flex: 1 }} />
              {/* search */}
              <div className="kf-glass" style={{ width: 420, display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", borderRadius: 14 }}>
                <Icon name="search" size={17} style={{ color: "var(--kf-ink-2)" }} />
                <span style={{ flex: 1, fontSize: 14, color: "var(--kf-ink)" }}>dark trap type beat</span>
                <span className="kf-mono" style={{ fontSize: 10.5, color: "var(--kf-ink-3)", padding: "3px 7px", borderRadius: 6, background: "rgba(255,255,255,0.07)" }}>YouTube</span>
              </div>
            </div>

            {/* tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 22, borderBottom: "1px solid var(--kf-line)" }}>
              <Tab label="Linked playlists" active />
              <Tab label="Search results" />
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--kf-ink-3)", paddingBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="settings" size={13} /> Manage linked playlists in Settings
              </span>
            </div>
          </div>

          {/* playlist chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 34px 4px" }}>
            <PlaylistChip label="Beats to flip" count={28} hue={280} active />
            <PlaylistChip label="Type beats 2026" count={41} hue={210} />
            <PlaylistChip label="Sample digging" count={63} hue={45} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 999, border: "1px dashed var(--kf-line-2)", fontSize: 12.5, color: "var(--kf-ink-2)", cursor: "pointer" }}>
              <Icon name="plus" size={14} /> Link playlist
            </div>
          </div>

          {/* results grid */}
          <div style={{ flex: 1, padding: "16px 34px 30px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {DISC_RESULTS.map((r) => <DiscoCard key={r.id} r={r} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active }) {
  return (
    <div style={{ padding: "10px 16px 13px", fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#fff" : "var(--kf-ink-2)", borderBottom: active ? "2px solid #fff" : "2px solid transparent", marginBottom: -1, cursor: "pointer" }}>{label}</div>
  );
}

function PlaylistChip({ label, count, hue, active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500,
      color: active ? "#fff" : "var(--kf-ink-2)",
      background: active ? `linear-gradient(135deg, hsla(${hue} 80% 55% / 0.22), hsla(${hue} 80% 55% / 0.06))` : "rgba(255,255,255,0.04)",
      border: active ? `1px solid hsla(${hue} 80% 60% / 0.5)` : "1px solid var(--kf-line)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: `hsl(${hue} 80% 60%)`, boxShadow: `0 0 8px hsl(${hue} 80% 60%)` }} />
      {label}
      <span className="kf-mono" style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
    </div>
  );
}

function DiscoCard({ r }) {
  return (
    <div className="kf-glass" style={{ borderRadius: 18, overflow: "hidden", border: r.state === "imported" ? "1px solid hsla(150 70% 55% / 0.4)" : "1px solid var(--kf-line)" }}>
      <div style={{ position: "relative", height: 150, background: `linear-gradient(135deg, hsl(${r.hue} 60% 32%), hsl(${(r.hue + 40) % 360} 55% 18%))` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 12px, transparent 12px 24px)" }} />
        <span className="kf-mono" style={{ position: "absolute", top: 10, left: 12, fontSize: 10, color: "rgba(255,255,255,0.65)" }}>YT thumbnail</span>
        {/* play preview */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,18,0.42)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.5)" }}>
            <Icon name="play" size={19} fill="currentColor" style={{ color: "#fff" }} />
          </div>
        </div>
        <span className="kf-mono" style={{ position: "absolute", right: 11, bottom: 11, fontSize: 11.5, fontWeight: 600, color: "#fff", padding: "3px 7px", borderRadius: 7, background: "rgba(10,9,18,0.5)" }}>{fmtDur(r.dur)}</span>
      </div>
      <div style={{ padding: "13px 14px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.3, height: 36, overflow: "hidden" }}>{r.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, fontSize: 12, color: "var(--kf-ink-3)" }}>
          <span>{r.channel}</span><span style={{ opacity: 0.4 }}>·</span><span className="kf-mono">{r.views} views</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 13 }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, flex: 1, border: "1px solid var(--kf-line-2)", background: "rgba(255,255,255,0.05)", color: "var(--kf-ink)", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="play" size={13} fill="currentColor" /> Preview
          </button>
          <ImportBtn state={r.state} />
        </div>
      </div>
    </div>
  );
}

function ImportBtn({ state }) {
  if (state === "imported")
    return (
      <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, flex: 1, border: "1px solid hsla(150 70% 55% / 0.45)", background: "hsla(150 70% 55% / 0.16)", color: "hsl(150 75% 65%)", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <Icon name="check" size={14} /> In library
      </button>
    );
  if (state === "importing")
    return (
      <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1, border: "1px solid hsla(200 90% 60% / 0.45)", background: "hsla(200 90% 60% / 0.16)", color: "hsl(200 90% 72%)", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ width: 13, height: 13, borderRadius: 999, border: "2px solid currentColor", borderTopColor: "transparent", animation: "kfSpin 0.8s linear infinite" }} /> Queuing…
      </button>
    );
  return (
    <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, flex: 1, border: "none", background: "linear-gradient(120deg, hsl(200 92% 70%), hsl(280 90% 72%))", color: "#0a0912", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      <Icon name="plus" size={14} stroke={2.6} /> Import
    </button>
  );
}

window.DiscoveryPage = DiscoveryPage;
