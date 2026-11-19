import { useEffect, useState } from "react";
import { ExplorerView } from "./components/ExplorerView";
import { FightView } from "./components/FightView";
import type { CatalogFight, CatalogPayload, SpellDict } from "./types/wcl";

function getHashFightUid(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/fight\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [spellDict, setSpellDict] = useState<SpellDict | undefined>(undefined);
  const [error, setError] = useState<string>("");
  const [activeFightUid, setActiveFightUid] = useState<string | null>(getHashFightUid);

  useEffect(() => {
    const onHashChange = () => setActiveFightUid(getHashFightUid());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("./data/catalog.json").then((r) => {
        if (!r.ok) throw new Error(`Failed to load catalog.json (HTTP ${r.status})`);
        return r.json() as Promise<CatalogPayload>;
      }),
      fetch("./data/spells_dict.json")
        .then((r) => (r.ok ? (r.json() as Promise<SpellDict>) : undefined))
        .catch(() => undefined),
    ])
      .then(([cat, spells]) => {
        if (cancelled) return;
        setCatalog(cat);
        setSpellDict(spells);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message || err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectFight = (fight: CatalogFight) => {
    window.location.hash = `#/fight/${encodeURIComponent(fight.fight_uid)}`;
    setActiveFightUid(fight.fight_uid);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    window.location.hash = "";
    setActiveFightUid(null);
  };

  const selectedFight =
    activeFightUid && catalog
      ? catalog.fights.find((f) => f.fight_uid === activeFightUid) || null
      : null;

  return (
    <div>
      <header className="wcl-topbar">
        <div className="wcl-brand" onClick={goHome}>
          <div className="wcl-brand-badge">WL</div>
          <span className="wcl-brand-title">WarcraftLogs</span>
          <span className="wcl-brand-sub">Legion 7.3.5 · M+ Season 5</span>
        </div>

        <div className="wcl-topbar-meta">
          {catalog && (
            <>
              <span>
                Indexed Logs: <strong style={{ color: "#e2e8f0" }}>{catalog.total_fights.toLocaleString()}</strong>
              </span>
              {selectedFight && (
                <button className="wcl-btn" onClick={goHome} style={{ padding: "3px 9px", fontSize: 12 }}>
                  All Dungeons
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {error && (
        <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
          <div className="wcl-error-banner">{error}</div>
        </div>
      )}

      {!catalog && !error && (
        <div className="wcl-loading-box">
          <h3 style={{ margin: "0 0 8px", color: "var(--wcl-gold)" }}>Loading Mythic+ Season 5 Database...</h3>
          <div style={{ color: "var(--wcl-muted)", fontSize: 12.5 }}>
            Fetching dungeon rankings catalog &amp; spell index
          </div>
        </div>
      )}

      {catalog && !selectedFight && (
        <ExplorerView fights={catalog.fights} onSelectFight={selectFight} />
      )}

      {catalog && selectedFight && (
        <FightView fight={selectedFight} spellDict={spellDict} onBack={goHome} />
      )}
    </div>
  );
}
