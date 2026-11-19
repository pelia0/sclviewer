import { useMemo, useState } from "react";
import { RotateCcw, Search, Shield, Heart, Swords } from "lucide-react";
import {
  CLASS_COLORS,
  DUNGEON_BY_ID,
  formatDurationMs,
  formatNumberCompact,
  getWowheadIconUrl,
  LEGION_AFFIXES,
  LEGION_DUNGEONS,
  LEGION_SPECS,
  SPEC_BY_KEY,
} from "../data/legionConstants";
import { getDungeonTimerSummary } from "../lib/combatAnalyzer";
import type { CatalogFight } from "../types/wcl";
import { Pagination } from "./Pagination";
import { useWowheadTooltips } from "./WowLinks";

interface ExplorerViewProps {
  fights: CatalogFight[];
  onSelectFight: (fight: CatalogFight) => void;
}

type SortKey = "key_desc" | "duration_asc" | "dps_desc" | "deaths_asc";

export function ExplorerView({ fights, onSelectFight }: ExplorerViewProps) {
  const [selectedDungeonId, setSelectedDungeonId] = useState<number | null>(null);
  const [selectedSpecKey, setSelectedSpecKey] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedAffixId, setSelectedAffixId] = useState<string>("");
  const [minKey, setMinKey] = useState<string>("");
  const [maxKey, setMaxKey] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("key_desc");
  const [syncedOnly, setSyncedOnly] = useState<boolean>(() => !import.meta.env.DEV);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const availableFights = useMemo(
    () => (syncedOnly ? fights.filter((f) => Boolean(f.gdrive_id)) : fights),
    [fights, syncedOnly]
  );

  const dungeonCounts = useMemo(() => {
    const counts = new Map<number, { count: number; maxKey: number }>();
    for (const f of availableFights) {
      const prev = counts.get(f.encounter_id) || { count: 0, maxKey: 0 };
      prev.count += 1;
      if (f.keystone_level > prev.maxKey) prev.maxKey = f.keystone_level;
      counts.set(f.encounter_id, prev);
    }
    return counts;
  }, [availableFights]);

  const filteredFights = useMemo(() => {
    const minK = minKey ? Number(minKey) : null;
    const maxK = maxKey ? Number(maxKey) : null;
    const affixId = selectedAffixId ? Number(selectedAffixId) : null;
    const q = searchQuery.trim().toLowerCase();

    const list = fights.filter((f) => {
      if (syncedOnly && !f.gdrive_id) return false;
      if (selectedDungeonId !== null && f.encounter_id !== selectedDungeonId) return false;
      if (minK !== null && f.keystone_level < minK) return false;
      if (maxK !== null && f.keystone_level > maxK) return false;
      if (affixId !== null && !f.affixes.includes(affixId)) return false;

      if (selectedSpecKey) {
        const [cls, sp] = selectedSpecKey.split(":");
        const hasSpec = f.participants.some((p) => p.class === cls && p.spec === sp);
        if (!hasSpec) return false;
      }

      if (selectedRole) {
        const hasRole = f.participants.some((p) => p.role === selectedRole);
        if (!hasRole) return false;
      }

      if (q) {
        const matchReport = f.report_code.toLowerCase().includes(q);
        const matchPlayer = f.participants.some((p) => p.name.toLowerCase().includes(q));
        if (!matchReport && !matchPlayer) return false;
      }

      return true;
    });

    const partyDps = (f: CatalogFight) => f.participants.reduce((s, p) => s + (p.dps || 0), 0);

    list.sort((a, b) => {
      switch (sortBy) {
        case "key_desc":
          return b.keystone_level - a.keystone_level || a.duration_ms - b.duration_ms;
        case "duration_asc":
          return a.duration_ms - b.duration_ms || b.keystone_level - a.keystone_level;
        case "dps_desc":
          return partyDps(b) - partyDps(a);
        case "deaths_asc":
          return a.deaths - b.deaths || b.keystone_level - a.keystone_level;
      }
    });

    return list;
  }, [
    fights,
    selectedDungeonId,
    selectedSpecKey,
    selectedRole,
    selectedAffixId,
    minKey,
    maxKey,
    searchQuery,
    sortBy,
    syncedOnly,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredFights.length / pageSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const pageFights = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredFights.slice(start, start + pageSize);
  }, [filteredFights, safePage, pageSize]);

  useWowheadTooltips([pageFights]);

  const activeDungeon = selectedDungeonId ? DUNGEON_BY_ID[selectedDungeonId] : null;
  const highestKey = filteredFights.length > 0 ? Math.max(...filteredFights.map((f) => f.keystone_level)) : 0;

  const resetFilters = () => {
    setSelectedDungeonId(null);
    setSelectedSpecKey("");
    setSelectedRole("");
    setSelectedAffixId("");
    setMinKey("");
    setMaxKey("");
    setSearchQuery("");
    setSortBy("key_desc");
    setPage(1);
  };

  const renderParticipantChip = (p: CatalogFight["participants"][number], idx: number) => {
    const color = CLASS_COLORS[p.class] || "#cbd5e1";
    const specMeta = SPEC_BY_KEY[`${p.class}:${p.spec}`];
    const RoleIcon = p.role === "tank" ? Shield : p.role === "healer" ? Heart : Swords;
    return (
      <span key={`${p.name}-${idx}`} className="wcl-party-chip" title={`${p.name} (${p.class} ${p.spec}) — ${p.ilvl} ilvl — ${formatNumberCompact(p.dps)} DPS`}>
        {specMeta ? (
          <img
            src={getWowheadIconUrl(specMeta.icon, "small")}
            alt=""
            className="wcl-icon wcl-icon-sm"
            loading="lazy"
          />
        ) : (
          <RoleIcon size={12} color={color} />
        )}
        <span style={{ color, fontWeight: 600 }}>{p.name}</span>
        {p.ilvl > 0 && <span className="wcl-dps-sub">{Math.round(p.ilvl)}</span>}
      </span>
    );
  };

  return (
    <div className="wcl-explorer-shell">
      {/* Left Dungeon Navigation Sidebar */}
      <aside className="wcl-sidebar">
        <div className="wcl-sidebar-heading">Mythic+ Dungeons (S5)</div>
        <button
          className={`wcl-dungeon-btn ${selectedDungeonId === null ? "active" : ""}`}
          onClick={() => {
            setSelectedDungeonId(null);
            setPage(1);
          }}
        >
          <span className="wcl-dungeon-left">
            <img
              src={getWowheadIconUrl("inv_relics_hourglass", "small")}
              alt=""
              className="wcl-icon"
            />
            <span className="wcl-dungeon-name">All Dungeons</span>
          </span>
          <span className="wcl-dungeon-count">{availableFights.length}</span>
        </button>

        {LEGION_DUNGEONS.map((d) => {
          const stats = dungeonCounts.get(d.id) || { count: 0, maxKey: 0 };
          return (
            <button
              key={d.id}
              className={`wcl-dungeon-btn ${selectedDungeonId === d.id ? "active" : ""}`}
              onClick={() => {
                setSelectedDungeonId(d.id);
                setPage(1);
              }}
            >
              <span className="wcl-dungeon-left">
                <img src={getWowheadIconUrl(d.icon, "small")} alt="" className="wcl-icon" />
                <span className="wcl-dungeon-name">{d.name}</span>
              </span>
              <span className="wcl-dungeon-count">
                {stats.count} {stats.maxKey > 0 ? `· +${stats.maxKey}` : ""}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Main Rankings Content */}
      <main className="wcl-main">
        <div className="wcl-zone-banner">
          <div className="wcl-zone-title-wrap">
            <img
              src={getWowheadIconUrl(activeDungeon?.icon || "achievement_challengemode_gold", "medium")}
              alt=""
              className="wcl-zone-icon"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getWowheadIconUrl("inv_relics_hourglass", "medium");
              }}
            />
            <div>
              <h1 className="wcl-zone-title">
                {activeDungeon ? activeDungeon.name : "All Legion Dungeons"} — Mythic+ Season 5
              </h1>
              <div className="wcl-zone-subtitle">
                Patch 7.3.5 · Partition 5 · Click any log row to inspect full combat breakdown, gear, talents &amp; replay
              </div>
            </div>
          </div>

          <div className="wcl-zone-stats">
            <div className="wcl-stat-pill">
              <div className="wcl-stat-pill-label">Matching Logs</div>
              <div className="wcl-stat-pill-val">{filteredFights.length.toLocaleString()}</div>
            </div>
            <div className="wcl-stat-pill">
              <div className="wcl-stat-pill-label">Highest Key</div>
              <div className="wcl-stat-pill-val">+{highestKey}</div>
            </div>
          </div>
        </div>

        {/* WCL Filter Toolbar */}
        <div className="wcl-filter-bar">
          <div className="wcl-field" style={{ flex: "1 1 200px", maxWidth: 280 }}>
            <Search size={14} color="var(--wcl-muted)" />
            <input
              type="text"
              className="wcl-input"
              style={{ width: "100%" }}
              placeholder="Player name or Report code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="wcl-field">
            <label>Spec</label>
            <select
              className="wcl-select"
              value={selectedSpecKey}
              onChange={(e) => {
                setSelectedSpecKey(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Specializations (36)</option>
              {LEGION_SPECS.map((s) => (
                <option key={s.specId} value={`${s.className}:${s.specName}`}>
                  {s.className} · {s.specName}
                </option>
              ))}
            </select>
          </div>

          <div className="wcl-field">
            <label>Role</label>
            <select
              className="wcl-select"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="tank">Tank</option>
              <option value="healer">Healer</option>
              <option value="dps">DPS</option>
            </select>
          </div>

          <div className="wcl-field">
            <label>Key</label>
            <input
              type="number"
              className="wcl-input"
              placeholder="Min"
              min={2}
              max={35}
              style={{ width: 52 }}
              value={minKey}
              onChange={(e) => {
                setMinKey(e.target.value);
                setPage(1);
              }}
            />
            <span style={{ color: "var(--wcl-dim)" }}>–</span>
            <input
              type="number"
              className="wcl-input"
              placeholder="Max"
              min={2}
              max={35}
              style={{ width: 52 }}
              value={maxKey}
              onChange={(e) => {
                setMaxKey(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="wcl-field">
            <label>Affix</label>
            <select
              className="wcl-select"
              value={selectedAffixId}
              onChange={(e) => {
                setSelectedAffixId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Affixes</option>
              {Object.values(LEGION_AFFIXES).map((af) => (
                <option key={af.id} value={af.id}>
                  {af.name}
                </option>
              ))}
            </select>
          </div>

          <div className="wcl-field">
            <label>Sort</label>
            <select
              className="wcl-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortKey);
                setPage(1);
              }}
            >
              <option value="key_desc">Key Level (High → Low)</option>
              <option value="duration_asc">Clear Time (Fastest)</option>
              <option value="dps_desc">Party DPS (High → Low)</option>
              <option value="deaths_asc">Deaths (Fewest)</option>
            </select>
          </div>

          <label
            className="wcl-field"
            style={{ cursor: "pointer", userSelect: "none", gap: 6 }}
            title="Show only logs currently synced to Google Drive"
          >
            <input
              type="checkbox"
              checked={syncedOnly}
              onChange={(e) => {
                setSyncedOnly(e.target.checked);
                setPage(1);
              }}
            />
            <span style={{ fontSize: 12, color: "var(--wcl-muted)" }}>On Drive</span>
          </label>

          <button className="wcl-btn" onClick={resetFilters} title="Reset all filters">
            <RotateCcw size={13} />
            Reset
          </button>
        </div>

        <Pagination
          totalItems={filteredFights.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />

        {/* Rankings Table */}
        <div className="wcl-table-wrap">
          <table className="wcl-table">
            <thead>
              <tr>
                <th style={{ width: 52 }}>Rank</th>
                <th style={{ width: 92 }}>Key</th>
                <th>Dungeon</th>
                <th style={{ width: 82 }}>Time</th>
                <th style={{ width: 96 }}>Affixes</th>
                <th>Party Composition</th>
                <th className="num" style={{ width: 95 }}>Party DPS</th>
                <th className="num" style={{ width: 65 }}>Deaths</th>
                <th style={{ width: 130 }}>Report</th>
              </tr>
            </thead>
            <tbody>
              {pageFights.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 36, color: "var(--wcl-muted)" }}>
                    No Mythic+ logs match your current filters.
                  </td>
                </tr>
              ) : (
                pageFights.map((f, idx) => {
                  const rank = (safePage - 1) * pageSize + idx + 1;
                  const dungeon = DUNGEON_BY_ID[f.encounter_id];
                  const timer = getDungeonTimerSummary(f.encounter_id, f.duration_ms);
                  const totalDps = f.participants.reduce((s, p) => s + (p.dps || 0), 0);
                  const keyCls =
                    f.keystone_level >= 24
                      ? "wcl-key-high"
                      : f.keystone_level >= 18
                        ? "wcl-key-mid"
                        : "wcl-key-low";

                  return (
                    <tr
                      key={f.fight_uid}
                      className="clickable"
                      onClick={() => onSelectFight(f)}
                    >
                      <td style={{ color: rank <= 3 ? "var(--wcl-gold)" : "var(--wcl-muted)", fontWeight: 700 }}>
                        #{rank}
                      </td>
                      <td>
                        <span className={`wcl-key-badge ${keyCls}`}>
                          +{f.keystone_level}
                        </span>{" "}
                        {timer.stars > 0 ? (
                          <span className="wcl-stars" title={`Timed ${timer.label}`}>
                            {"★".repeat(timer.stars)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--wcl-red)", fontSize: 11 }}>Depl</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {dungeon && (
                            <img
                              src={getWowheadIconUrl(dungeon.icon, "small")}
                              alt=""
                              className="wcl-icon"
                              loading="lazy"
                            />
                          )}
                          <span style={{ fontWeight: 600 }}>
                            {dungeon?.name || f.encounter_slug}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: timer.timed ? "#e2e8f0" : "var(--wcl-red)" }}>
                        {formatDurationMs(f.duration_ms)}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {f.affixes.map((afId) => {
                            const af = LEGION_AFFIXES[afId];
                            if (!af) return null;
                            return (
                              <a
                                key={afId}
                                href={`https://www.wowhead.com/affix=${afId}`}
                                data-wowhead={`affix=${afId}`}
                                title={`${af.name}: ${af.description}`}
                                onClick={(e) => e.stopPropagation()}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={getWowheadIconUrl(af.icon, "small")}
                                  alt={af.name}
                                  className="wcl-icon"
                                  loading="lazy"
                                />
                              </a>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {f.participants.map(renderParticipantChip)}
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: "var(--wcl-blue)" }}>
                        {formatNumberCompact(totalDps)}
                      </td>
                      <td className="num" style={{ color: f.deaths > 0 ? "var(--wcl-red)" : "var(--wcl-green)", fontWeight: 600 }}>
                        {f.deaths}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11.5, color: "var(--wcl-muted)" }}>
                        {f.report_code}#{f.fight_id}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          totalItems={filteredFights.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </main>
    </div>
  );
}
