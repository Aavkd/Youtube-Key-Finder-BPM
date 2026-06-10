/* pages/library.jsx — Library: sidebar + cards */

const LIB_TRACKS = [
  { id: 1, title: "Neon Trap Anthem", key: "F# Minor", bpm: 142, conf: 0.91, dur: 184, fav: true, seed: 7, tags: ["trap", "dark", "808"], hover: true },
  { id: 2, title: "Smooth Soul Loop", key: "C Major", bpm: 90, conf: 0.86, dur: 168, fav: false, seed: 12, tags: ["soul", "sample"] },
  { id: 3, title: "Midnight Drive", key: "A Minor", bpm: 128, conf: 0.72, dur: 210, fav: true, seed: 21, tags: ["synthwave"] },
  { id: 4, title: "Golden Hour", key: "E Major", bpm: 110, conf: 0.94, dur: 135, fav: false, seed: 33, tags: ["lofi", "warm"] },
  { id: 5, title: "Dark Cipher", key: "D# Minor", bpm: 150, conf: 0.54, dur: 170, fav: false, seed: 44, tags: ["drill"] },
  { id: 6, title: "Velvet Bounce", key: "G Minor", bpm: 96, conf: 0.83, dur: 192, fav: true, seed: 5, tags: ["rnb", "bounce"] },
];

function LibraryPage() {
  return (
    <div className="kf" style={{ width: "100%", height: "100%", display: "flex", background: "var(--kf-base)", position: "relative", overflow: "hidden" }}>
      {/* subtle ambient aurora behind everything */}
      <Aurora speed={0.5} blobs={[
        { x: "30%", y: "-30%", size: 520, color: "hsl(280 70% 45%)", anim: "kfDrift1", dur: 30, opacity: 0.32 },
        { x: "75%", y: "40%", size: 460, color: "hsl(200 70% 45%)", anim: "kfDrift2", dur: 34, opacity: 0.28 },
      ]} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <NavRail active="library" />

        {/* collapsible sidebar */}
        <div style={{ width: 244, flex: "0 0 244px", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 4, borderRight: "1px solid var(--kf-line)", background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 14px" }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Library</span>
            <Icon name="list" size={16} style={{ color: "var(--kf-ink-3)" }} />
          </div>
          <SideItem icon="disc" label="All tracks" count={6} active />
          <SideItem icon="heart" label="Favorites" count={3} />
          <div className="kf-mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--kf-ink-3)", fontWeight: 600, padding: "16px 8px 8px" }}>PLAYLISTS</div>
          <SideItem icon="folder" label="Trap Bangers" count={12} hue={350} />
          <SideItem icon="folder" label="Lofi Sessions" count={8} hue={150} />
          <SideItem icon="folder" label="Soul Samples" count={5} hue={45} />
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", marginTop: 4, borderRadius: 11, color: "var(--kf-ink-2)", fontSize: 13.5, cursor: "pointer", border: "1px dashed var(--kf-line-2)" }}>
            <Icon name="plus" size={15} /> New playlist
          </div>
        </div>

        {/* main */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 26px", borderBottom: "1px solid var(--kf-line)" }}>
            <div className="kf-glass-soft" style={{ flex: 1, maxWidth: 340, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12 }}>
              <Icon name="search" size={16} style={{ color: "var(--kf-ink-3)" }} />
              <span style={{ fontSize: 13.5, color: "var(--kf-ink-3)" }}>Search by title…</span>
            </div>
            <div style={{ flex: 1 }} />
            <Dropdown icon="sliders" label="Sort: Date added" />
            <Dropdown icon="filter" label="Filter" />
            {/* view toggle */}
            <div style={{ display: "flex", borderRadius: 11, overflow: "hidden", border: "1px solid var(--kf-line)" }}>
              <ToggleBtn icon="grid" active />
              <ToggleBtn icon="list" />
            </div>
          </div>

          {/* count row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 26px 6px" }}>
            <span style={{ fontSize: 19, fontWeight: 600 }}>All tracks</span>
            <span className="kf-mono" style={{ fontSize: 12, color: "var(--kf-ink-3)", padding: "3px 8px", borderRadius: 7, background: "rgba(255,255,255,0.06)" }}>6 tracks</span>
          </div>

          {/* card grid */}
          <div style={{ flex: 1, padding: "14px 26px 26px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {LIB_TRACKS.map((t) => <TrackCard key={t.id} t={t} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideItem({ icon, label, count, active, hue }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 11, cursor: "pointer",
      color: active ? "#fff" : "var(--kf-ink-2)", fontSize: 13.5, fontWeight: active ? 600 : 500,
      background: active ? "linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))" : "transparent",
      border: active ? "1px solid var(--kf-line-2)" : "1px solid transparent",
    }}>
      {hue != null
        ? <span style={{ width: 16, display: "flex", justifyContent: "center" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: `hsl(${hue} 75% 58%)`, boxShadow: `0 0 8px hsl(${hue} 75% 58%)` }} /></span>
        : <Icon name={icon} size={16} fill={icon === "heart" && active ? "currentColor" : "none"} />}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span className="kf-mono" style={{ fontSize: 11, color: "var(--kf-ink-3)" }}>{count}</span>
    </div>
  );
}

function Dropdown({ icon, label }) {
  return (
    <div className="kf-glass-soft" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 11, fontSize: 13, color: "var(--kf-ink-2)", cursor: "pointer", fontWeight: 500 }}>
      <Icon name={icon} size={15} /> {label} <Icon name="chevDown" size={14} style={{ opacity: 0.6 }} />
    </div>
  );
}

function ToggleBtn({ icon, active }) {
  return (
    <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? "#fff" : "var(--kf-ink-3)", background: active ? "rgba(255,255,255,0.12)" : "transparent" }}>
      <Icon name={icon} size={17} />
    </div>
  );
}

function TrackCard({ t }) {
  const m = mood(t.key, t.bpm);
  return (
    <div className="kf-glass" style={{ borderRadius: 18, overflow: "hidden", position: "relative",
      boxShadow: t.hover ? `0 24px 60px -20px rgba(0,0,0,0.8), 0 0 50px -16px ${m.glow}` : "0 16px 40px -22px rgba(0,0,0,0.7)",
      border: t.hover ? `1px solid hsla(${m.hue} 80% 60% / 0.4)` : "1px solid var(--kf-line)" }}>
      {/* thumbnail */}
      <div style={{ position: "relative", height: 132, background: `linear-gradient(135deg, ${m.primary}, ${m.deep})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.16) 0 10px, transparent 10px 20px)", mixBlendMode: "overlay" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.28), transparent 50%)" }} />
        {/* top row: favorite + youtube */}
        <div style={{ position: "absolute", top: 10, left: 11, right: 11, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="kf-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>thumbnail</span>
          <div style={{ display: "flex", gap: 6 }}>
            <RoundBtn icon="external" />
            <RoundBtn icon="heart" filled={t.fav} active={t.fav} />
          </div>
        </div>
        {/* play */}
        <div style={{ position: "absolute", left: 12, bottom: 12, width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,18,0.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          <Icon name="play" size={15} fill="currentColor" style={{ color: "#fff" }} />
        </div>
        {/* duration */}
        <span className="kf-mono" style={{ position: "absolute", right: 11, bottom: 13, fontSize: 11.5, fontWeight: 600, color: "#fff", padding: "3px 7px", borderRadius: 7, background: "rgba(10,9,18,0.45)", backdropFilter: "blur(4px)" }}>{fmtDur(t.dur)}</span>
      </div>

      {/* body */}
      <div style={{ padding: "13px 14px 14px" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <KeyChip keyName={t.key} bpm={t.bpm} size="sm" />
          <span className="kf-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--kf-ink-2)" }}>{t.bpm}.0</span>
          <span className="kf-mono" style={{ fontSize: 10, color: "var(--kf-ink-3)" }}>BPM</span>
          <div style={{ flex: 1 }} />
          <Confidence value={t.conf} compact />
        </div>
        <div style={{ marginTop: 12 }}>
          <Wave seed={t.seed} progress={t.hover ? 0.4 : 0} color="rgba(255,255,255,0.16)" active={m.primary} bars={40} h={26} />
        </div>
        {/* tags on hover */}
        {t.hover && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--kf-line)" }}>
            <Icon name="tag" size={12} style={{ color: "var(--kf-ink-3)" }} />
            {t.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: "var(--kf-ink-2)", padding: "3px 9px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid var(--kf-line)" }}>{tag}</span>
            ))}
            <div style={{ flex: 1 }} />
            <span title="Download" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, color: "var(--kf-ink-2)", border: "1px solid var(--kf-line)" }}><Icon name="download" size={13} /></span>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundBtn({ icon, filled, active }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,18,0.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.28)", color: active ? "hsl(340 90% 68%)" : "#fff" }}>
      <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />
    </div>
  );
}

window.LibraryPage = LibraryPage;
