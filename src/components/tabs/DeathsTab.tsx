import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Skull } from "lucide-react";
import { formatNumberCompact, formatTimestampMMSS } from "../../data/legionConstants";
import { resolveAbility, type DeathRecord, type FightContext } from "../../lib/combatAnalyzer";
import type { SpellDict } from "../../types/wcl";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface DeathsTabProps {
  ctx: FightContext;
  friendlyDeaths: DeathRecord[];
  enemyDeaths: DeathRecord[];
  spellDict?: SpellDict;
}

export function DeathsTab({ ctx, friendlyDeaths, enemyDeaths, spellDict }: DeathsTabProps) {
  const [showEnemies, setShowEnemies] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(friendlyDeaths[0]?.id ?? null);

  const list = showEnemies ? enemyDeaths : friendlyDeaths;
  useWowheadTooltips([showEnemies, expandedId, list.length]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`wcl-btn ${!showEnemies ? "wcl-btn-primary" : ""}`}
            onClick={() => setShowEnemies(false)}
          >
            Friendly Deaths ({friendlyDeaths.length})
          </button>
          <button
            className={`wcl-btn ${showEnemies ? "wcl-btn-primary" : ""}`}
            onClick={() => setShowEnemies(true)}
          >
            Enemy Deaths ({enemyDeaths.length})
          </button>
        </div>
        <span style={{ color: "var(--wcl-muted)", fontSize: 12 }}>
          Click any death row to inspect the 15-second pre-death combat recap
        </span>
      </div>

      <div className="wcl-table-wrap">
        <table className="wcl-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th style={{ width: 95 }}>Time</th>
              <th>Unit</th>
              <th>Killing Blow Ability</th>
              <th>Killing Source</th>
              <th className="num">Damage Taken (15s)</th>
              <th className="num">Healing Recv (15s)</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 250).map((d) => {
              const isOpen = expandedId === d.id;
              const player = ctx.playerProfiles.find((p) => p.actorId === d.targetId);
              const killAb = resolveAbility(d.killingAbilityId, ctx.abilitiesById, spellDict);
              const hpPts = d.recentEvents.filter((e) => e.hpPct !== null);

              return (
                <Fragment key={d.id}>
                  <tr
                    className={`clickable ${isOpen ? "selected" : ""}`}
                    onClick={() => setExpandedId(isOpen ? null : d.id)}
                  >
                    <td>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--wcl-muted)" }}>
                      {formatTimestampMMSS(d.tMs, true)}
                    </td>
                    <td style={{ color: player?.color || "#f87171", fontWeight: 700 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Skull size={13} color="#ef4444" />
                        {d.targetName}
                      </span>
                    </td>
                    <td>
                      {d.killingAbilityId > 0 ? (
                        <SpellLink spellId={d.killingAbilityId} name={killAb.name} icon={killAb.icon} school={killAb.school} />
                      ) : (
                        <span style={{ color: "var(--wcl-muted)" }}>Melee / Unknown</span>
                      )}
                    </td>
                    <td style={{ color: "#cbd5e1" }}>{d.killingSourceName}</td>
                    <td className="num" style={{ color: "var(--wcl-red)", fontWeight: 600 }}>
                      {formatNumberCompact(d.totalDamage15s)}
                    </td>
                    <td className="num" style={{ color: "var(--wcl-green)", fontWeight: 600 }}>
                      {formatNumberCompact(d.totalHealing15s)}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${d.id}-recap`}>
                      <td colSpan={7} style={{ background: "#0b0e14", padding: 12 }}>
                        {/* Mini HP% SVG Curve over the last 15s */}
                        {hpPts.length > 1 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: "var(--wcl-muted)", marginBottom: 4 }}>
                              Health % Trajectory (Final 15s before death)
                            </div>
                            <svg
                              viewBox="0 0 800 72"
                              style={{ width: "100%", height: 72, background: "#090b10", border: "1px solid #1e2638", borderRadius: 4, display: "block" }}
                            >
                              <polyline
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="2"
                                points={hpPts
                                  .map((pt) => {
                                    const x = ((pt.deltaToDeathMs + 15000) / 15000) * 790 + 5;
                                    const y = 66 - ((pt.hpPct || 0) / 100) * 58;
                                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                                  })
                                  .join(" ")}
                              />
                              <line x1={795} x2={795} y1={4} y2={68} stroke="#ef4444" strokeWidth="1.5" />
                            </svg>
                          </div>
                        )}

                        <div className="wcl-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
                          <table className="wcl-table">
                            <thead>
                              <tr>
                                <th style={{ width: 85 }}>Time</th>
                                <th style={{ width: 80 }}>Offset</th>
                                <th style={{ width: 85 }}>Type</th>
                                <th>Source</th>
                                <th>Ability</th>
                                <th className="num">Amount</th>
                                <th className="num">HP%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.recentEvents.map((ev, idx) => {
                                const ab = resolveAbility(ev.abilityId, ctx.abilitiesById, spellDict);
                                const isDmg = ev.type === "damage";
                                return (
                                  <tr key={idx}>
                                    <td style={{ fontFamily: "monospace", color: "var(--wcl-muted)" }}>
                                      {formatTimestampMMSS(ev.tMs, true)}
                                    </td>
                                    <td style={{ fontFamily: "monospace", color: "var(--wcl-dim)" }}>
                                      {(ev.deltaToDeathMs / 1000).toFixed(2)}s
                                    </td>
                                    <td>
                                      <span
                                        className="wcl-badge"
                                        style={{
                                          background: isDmg ? "rgba(239,68,68,0.16)" : "rgba(34,197,94,0.16)",
                                          color: isDmg ? "#f87171" : "#4ade80",
                                        }}
                                      >
                                        {ev.type}
                                      </span>
                                    </td>
                                    <td>{ev.sourceName}</td>
                                    <td>
                                      <SpellLink spellId={ev.abilityId} name={ab.name} icon={ab.icon} school={ab.school} small />
                                    </td>
                                    <td className="num" style={{ color: isDmg ? "#f87171" : "#4ade80", fontWeight: 700 }}>
                                      {isDmg ? "-" : "+"}
                                      {ev.amount.toLocaleString()}
                                      {ev.overkillOrOverheal > 0 && (
                                        <span style={{ color: "var(--wcl-dim)", fontWeight: 400 }}>
                                          {" "}({isDmg ? "O:" : "OH:"} {ev.overkillOrOverheal.toLocaleString()})
                                        </span>
                                      )}
                                    </td>
                                    <td className="num" style={{ color: "var(--wcl-muted)" }}>
                                      {ev.hpPct !== null ? `${ev.hpPct}%` : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                              {d.recentEvents.length === 0 && (
                                <tr>
                                  <td colSpan={7} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>
                                    No incoming damage/healing events in the final 15s.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--wcl-muted)" }}>
                  No {showEnemies ? "enemy" : "friendly"} deaths recorded in the selected window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
