import { useState } from "react";
import { formatNumberCompact, getWowheadIconUrl, SPEC_BY_ID } from "../../data/legionConstants";
import type { FightContext, WindowAnalysisResult } from "../../lib/combatAnalyzer";
import { ItemLink, SpellLink, useWowheadTooltips } from "../WowLinks";

interface SummaryTabProps {
  ctx: FightContext;
  analysis: WindowAnalysisResult;
  selectedPlayerId: number | null;
  onSelectPlayer: (actorId: number | null) => void;
}

export function SummaryTab({ ctx, analysis, selectedPlayerId, onSelectPlayer }: SummaryTabProps) {
  const defaultPlayerId =
    selectedPlayerId && ctx.playerProfiles.some((p) => p.actorId === selectedPlayerId)
      ? selectedPlayerId
      : ctx.playerProfiles[0]?.actorId ?? null;

  const [inspectedId, setInspectedId] = useState<number | null>(defaultPlayerId);

  const activeProfile =
    ctx.playerProfiles.find((p) => p.actorId === (selectedPlayerId ?? inspectedId)) ||
    ctx.playerProfiles[0] ||
    null;

  useWowheadTooltips([activeProfile, analysis.damageDone.total]);

  const maxDmg = Math.max(1, ...analysis.damageDone.byActor.map((r) => r.total));
  const maxHeal = Math.max(1, ...analysis.healingDone.byActor.map((r) => r.total));
  const maxDtps = Math.max(1, ...analysis.damageTaken.byActor.map((r) => r.total));

  const renderMiniMeter = (
    title: string,
    rows: Array<{ actorId: number; name: string; color: string; total: number; perSec: number }>,
    maxVal: number,
    rateLabel: string
  ) => (
    <div className="wcl-card" style={{ marginBottom: 0 }}>
      <div className="wcl-card-title">{title}</div>
      {rows.slice(0, 5).map((r) => {
        const pct = Math.max(2, (r.total / maxVal) * 100);
        return (
          <div
            key={r.actorId}
            onClick={() => {
              setInspectedId(r.actorId);
              onSelectPlayer(selectedPlayerId === r.actorId ? null : r.actorId);
            }}
            style={{
              position: "relative",
              height: 22,
              background: "#0b0e14",
              border: "1px solid #1e2638",
              borderRadius: 3,
              marginBottom: 4,
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${pct}%`,
                background: r.color,
                opacity: 0.35,
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "100%",
                padding: "0 8px",
                fontSize: 12,
              }}
            >
              <span style={{ color: r.color, fontWeight: 600 }}>{r.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                <strong>{formatNumberCompact(r.total)}</strong>{" "}
                <span style={{ color: "var(--wcl-muted)" }}>({formatNumberCompact(r.perSec)} {rateLabel})</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const primaryStatLabel =
    activeProfile?.stats && activeProfile.stats.intellect >= Math.max(activeProfile.stats.strength, activeProfile.stats.agility)
      ? { label: "Intellect", value: activeProfile.stats.intellect }
      : activeProfile?.stats && activeProfile.stats.agility >= activeProfile.stats.strength
        ? { label: "Agility", value: activeProfile.stats.agility }
        : { label: "Strength", value: activeProfile?.stats?.strength || 0 };

  return (
    <div>
      {/* 4 Overview Mini-Meters */}
      <div className="wcl-grid-4" style={{ marginBottom: 16 }}>
        {renderMiniMeter("Damage Done", analysis.damageDone.byActor, maxDmg, "DPS")}
        {renderMiniMeter("Healing Done", analysis.healingDone.byActor, maxHeal, "HPS")}
        {renderMiniMeter("Damage Taken", analysis.damageTaken.byActor, maxDtps, "DTPS")}

        <div className="wcl-card" style={{ marginBottom: 0 }}>
          <div className="wcl-card-title">
            <span>Deaths ({analysis.deaths.friendly.length})</span>
            <span style={{ color: "var(--wcl-muted)", fontSize: 11 }}>
              Interrupts: {analysis.interrupts.length}
            </span>
          </div>
          {analysis.deaths.friendly.length === 0 ? (
            <div style={{ color: "var(--wcl-green)", fontSize: 12.5, padding: "12px 0" }}>
              0 friendly deaths in selected window!
            </div>
          ) : (
            <div style={{ maxHeight: 132, overflowY: "auto" }}>
              {analysis.deaths.friendly.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    padding: "3px 0",
                    borderBottom: "1px solid #1e2638",
                  }}
                >
                  <span style={{ color: ctx.playerProfiles.find((p) => p.actorId === d.targetId)?.color || "#f87171", fontWeight: 600 }}>
                    {d.targetName}
                  </span>
                  <span style={{ color: "var(--wcl-muted)", fontFamily: "monospace" }}>
                    {(d.tMs / 1000).toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Combatant Selector & Character Sheet */}
      <div className="wcl-card">
        <div className="wcl-card-title">
          <span>Combatant Character Sheet — Stats, Talents, Artifact &amp; Gear</span>
          <span style={{ color: "var(--wcl-muted)", fontWeight: 500, textTransform: "none" }}>
            Hover any spell, talent, or item for full Wowhead 7.3.5 tooltips
          </span>
        </div>

        <div className="wcl-player-pills">
          {ctx.playerProfiles.map((p) => {
            const specMeta = SPEC_BY_ID[p.specId];
            const isActive = activeProfile?.actorId === p.actorId;
            return (
              <button
                key={p.actorId}
                className={`wcl-player-pill ${isActive ? "active" : ""}`}
                onClick={() => setInspectedId(p.actorId)}
              >
                {specMeta && (
                  <img
                    src={getWowheadIconUrl(specMeta.icon, "small")}
                    alt=""
                    className="wcl-icon"
                  />
                )}
                <span style={{ color: p.color }}>{p.name}</span>
                <span style={{ fontSize: 11, color: "var(--wcl-muted)" }}>
                  {p.specName} · {p.ilvl} ilvl
                </span>
              </button>
            );
          })}
        </div>

        {activeProfile && (
          <div>
            {/* Character Header + Stats */}
            <div className="wcl-grid-2" style={{ marginBottom: 14 }}>
              <div className="wcl-card" style={{ marginBottom: 0, background: "#0e121a" }}>
                <div className="wcl-card-title">
                  <span style={{ color: activeProfile.color }}>
                    {activeProfile.name} {activeProfile.server ? `(${activeProfile.server})` : ""}
                  </span>
                  <span>
                    {activeProfile.className} · {activeProfile.specName} ·{" "}
                    <strong style={{ color: "var(--wcl-gold)" }}>{activeProfile.ilvl} ilvl</strong>
                  </span>
                </div>

                {activeProfile.stats ? (
                  <div className="wcl-stat-grid">
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">{primaryStatLabel.label}</div>
                      <div className="wcl-stat-box-val">{primaryStatLabel.value.toLocaleString()}</div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Stamina</div>
                      <div className="wcl-stat-box-val">{activeProfile.stats.stamina.toLocaleString()}</div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Armor</div>
                      <div className="wcl-stat-box-val">{activeProfile.stats.armor.toLocaleString()}</div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Critical Strike</div>
                      <div className="wcl-stat-box-val" style={{ color: "#f87171" }}>
                        +{activeProfile.stats.critPct}%{" "}
                        <small style={{ color: "var(--wcl-muted)", fontWeight: 400 }}>
                          ({activeProfile.stats.critRating.toLocaleString()})
                        </small>
                      </div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Haste</div>
                      <div className="wcl-stat-box-val" style={{ color: "#facc15" }}>
                        +{activeProfile.stats.hastePct}%{" "}
                        <small style={{ color: "var(--wcl-muted)", fontWeight: 400 }}>
                          ({activeProfile.stats.hasteRating.toLocaleString()})
                        </small>
                      </div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Mastery (Rating Bonus)</div>
                      <div className="wcl-stat-box-val" style={{ color: "#c084fc" }}>
                        +{activeProfile.stats.masteryPct}%{" "}
                        <small style={{ color: "var(--wcl-muted)", fontWeight: 400 }}>
                          ({activeProfile.stats.masteryRating.toLocaleString()})
                        </small>
                      </div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Versatility</div>
                      <div className="wcl-stat-box-val" style={{ color: "#38bdf8" }}>
                        +{activeProfile.stats.versDamagePct}%{" "}
                        <small style={{ color: "var(--wcl-muted)", fontWeight: 400 }}>
                          / -{activeProfile.stats.versReductionPct}% ({activeProfile.stats.versDamageRating.toLocaleString()})
                        </small>
                      </div>
                    </div>
                    <div className="wcl-stat-box">
                      <div className="wcl-stat-box-label">Leech / Avoidance / Speed</div>
                      <div className="wcl-stat-box-val" style={{ fontSize: 12.5 }}>
                        {activeProfile.stats.leechPct}% / {activeProfile.stats.avoidancePct}% / {activeProfile.stats.speedPct}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--wcl-muted)" }}>No detailed combatant stats recorded.</div>
                )}
              </div>

              {/* Talents & Artifact */}
              <div className="wcl-card" style={{ marginBottom: 0, background: "#0e121a" }}>
                <div className="wcl-card-title">Legion Talents (7 Tiers)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 8, marginBottom: 14 }}>
                  {activeProfile.talents.map((t) => (
                    <div
                      key={`${t.row}-${t.id}`}
                      style={{
                        background: "#141925",
                        border: "1px solid #242e42",
                        borderRadius: 4,
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "var(--wcl-dim)", width: 14 }}>T{t.row}</span>
                      <SpellLink spellId={t.id} name={t.name} icon={t.icon} />
                    </div>
                  ))}
                  {activeProfile.talents.length === 0 && (
                    <span style={{ color: "var(--wcl-muted)" }}>No talents recorded.</span>
                  )}
                </div>

                {activeProfile.artifact.length > 0 && (
                  <>
                    <div className="wcl-card-title" style={{ marginTop: 8 }}>Artifact Weapon Traits</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {activeProfile.artifact.map((tr) => (
                        <span
                          key={tr.spellId}
                          style={{
                            background: "#141925",
                            border: "1px solid #352b18",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <SpellLink spellId={tr.spellId} name={tr.name} icon={tr.icon} small />
                          <span style={{ color: "var(--wcl-gold)", fontWeight: 700 }}>({tr.rank})</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Equipped Gear Table */}
            <div className="wcl-table-wrap">
              <table className="wcl-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Slot</th>
                    <th>Item (Wowhead Tooltip)</th>
                    <th className="num" style={{ width: 68 }}>ilvl</th>
                    <th>Gems / Relics</th>
                    <th style={{ width: 150 }}>Enchant</th>
                    <th style={{ width: 180 }}>Bonus IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProfile.gear.map((slot) => (
                    <tr
                      key={`${slot.slotIndex}-${slot.id}`}
                      style={slot.isLegendary ? { background: "rgba(255, 128, 0, 0.06)" } : undefined}
                    >
                      <td style={{ color: "var(--wcl-muted)", fontWeight: 600 }}>{slot.slotName}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ItemLink slot={slot} />
                          {slot.isLegendary && (
                            <span
                              className="wcl-badge"
                              style={{ background: "rgba(255,128,0,0.18)", color: "#ff8000", border: "1px solid rgba(255,128,0,0.4)" }}
                            >
                              Legendary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: slot.itemLevel >= 960 ? "#ff8000" : "#e2e8f0" }}>
                        {slot.itemLevel || "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {slot.gems.length === 0
                            ? "—"
                            : slot.gems.map((g, gi) => (
                                <a
                                  key={`${g.id}-${gi}`}
                                  href={`https://www.wowhead.com/item=${g.id}`}
                                  data-wowhead={`item=${g.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="wcl-spell-link"
                                  style={{ color: "#38bdf8", fontSize: 12 }}
                                >
                                  <img
                                    src={getWowheadIconUrl(g.icon, "small")}
                                    alt=""
                                    className="wcl-icon wcl-icon-sm"
                                  />
                                  <span>#{g.id}</span>
                                </a>
                              ))}
                        </div>
                      </td>
                      <td style={{ color: "var(--wcl-green)", fontSize: 12 }}>
                        {slot.permanentEnchant ? (
                          <a
                            href={`https://www.wowhead.com/spell=${slot.permanentEnchant}`}
                            data-wowhead={`spell=${slot.permanentEnchant}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Enchant #{slot.permanentEnchant}
                          </a>
                        ) : (
                          <span style={{ color: "var(--wcl-dim)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--wcl-dim)" }}>
                        {slot.bonusIDs.length > 0 ? slot.bonusIDs.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
