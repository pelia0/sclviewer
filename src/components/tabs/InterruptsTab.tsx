import { CLASS_COLORS, formatTimestampMMSS } from "../../data/legionConstants";
import { resolveAbility, type FightContext, type InterruptRecord } from "../../lib/combatAnalyzer";
import type { SpellDict } from "../../types/wcl";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface InterruptsTabProps {
  ctx: FightContext;
  interrupts: InterruptRecord[];
  spellDict?: SpellDict;
}

export function InterruptsTab({ ctx, interrupts, spellDict }: InterruptsTabProps) {
  useWowheadTooltips([interrupts.length]);

  const countsByPlayer = new Map<number, { name: string; color: string; count: number }>();
  for (const intr of interrupts) {
    const prev = countsByPlayer.get(intr.sourceId) || {
      name: intr.sourceName,
      color: CLASS_COLORS[intr.sourceClass] || "#60a5fa",
      count: 0,
    };
    prev.count += 1;
    countsByPlayer.set(intr.sourceId, prev);
  }
  const rankedPlayers = Array.from(countsByPlayer.entries()).sort((a, b) => b[1].count - a[1].count);

  return (
    <div>
      {rankedPlayers.length > 0 && (
        <div className="wcl-player-pills">
          {rankedPlayers.map(([aid, info]) => (
            <div key={aid} className="wcl-player-pill" style={{ cursor: "default" }}>
              <span style={{ color: info.color }}>{info.name}</span>
              <span className="wcl-badge" style={{ background: "rgba(56,189,248,0.16)", color: "#38bdf8" }}>
                {info.count} interrupts
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="wcl-card" style={{ marginBottom: 0 }}>
        <div className="wcl-card-title">Interrupts Log ({interrupts.length})</div>
        <div className="wcl-table-wrap">
          <table className="wcl-table">
            <thead>
              <tr>
                <th style={{ width: 105 }}>Time</th>
                <th>Player</th>
                <th>Interrupt Ability</th>
                <th>Target Enemy</th>
                <th>Interrupted Spell</th>
              </tr>
            </thead>
            <tbody>
              {interrupts.map((intr, idx) => {
                const kickAb = resolveAbility(intr.abilityId, ctx.abilitiesById, spellDict);
                const stopAb = resolveAbility(intr.interruptedAbilityId, ctx.abilitiesById, spellDict);
                const col = CLASS_COLORS[intr.sourceClass] || "#e2e8f0";
                return (
                  <tr key={`${intr.tMs}-${intr.sourceId}-${idx}`}>
                    <td style={{ fontFamily: "monospace", color: "var(--wcl-muted)" }}>
                      {formatTimestampMMSS(intr.tMs, true)}
                    </td>
                    <td style={{ color: col, fontWeight: 700 }}>{intr.sourceName}</td>
                    <td>
                      <SpellLink spellId={intr.abilityId} name={kickAb.name} icon={kickAb.icon} school={kickAb.school} />
                    </td>
                    <td style={{ color: "#cbd5e1" }}>{intr.targetName}</td>
                    <td>
                      {intr.interruptedAbilityId > 0 ? (
                        <SpellLink
                          spellId={intr.interruptedAbilityId}
                          name={stopAb.name}
                          icon={stopAb.icon}
                          school={stopAb.school}
                        />
                      ) : (
                        <span style={{ color: "var(--wcl-dim)" }}>Unknown</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {interrupts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--wcl-muted)" }}>
                    No interrupts recorded in the selected filter/window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
