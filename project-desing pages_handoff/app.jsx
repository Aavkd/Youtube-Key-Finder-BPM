/* app.jsx — assemble pages on the design canvas */

const W = 1440, H = 900;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="primary" title="Key Finder" subtitle="Glassmorphism · dark · circle-of-fifths color · v1 pages">
        <DCArtboard id="home" label="Home — paste & process" width={W} height={H}>
          <HomeHero />
        </DCArtboard>
        <DCArtboard id="player" label="Player — signature experience" width={W} height={H}>
          <PlayerPage />
        </DCArtboard>
        {typeof window.LibraryPage === "function" && (
          <DCArtboard id="library" label="Library" width={W} height={H}>
            <LibraryPage />
          </DCArtboard>
        )}
        {typeof window.DiscoveryPage === "function" && (
          <DCArtboard id="discovery" label="Discovery" width={W} height={H}>
            <DiscoveryPage />
          </DCArtboard>
        )}
        {typeof window.SettingsPage === "function" && (
          <DCArtboard id="settings" label="Settings + mood palette editor" width={W} height={H}>
            <SettingsPage />
          </DCArtboard>
        )}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
