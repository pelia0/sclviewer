import { formatTimestampMMSS, getSchoolColor } from "../../data/legionConstants";
import type { AuraRow, FightContext } from "../../lib/combatAnalyzer";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface BuffsTabProps {
  mode: "buffs" | "debuffs";
  ctx: FightContext;
  auras: AuraRow[];
  tStartMs: number;
  tEndMs: number;
  onSelectTarget: (targetId: number | null) => void;
}

export function BuffsTab({ mode, ctx, auras, tStartMs, tEndMs }: BuffsTabProps) {
  useWowheadTooltips([mode, auras.length, tStartMs, tEndMs]);
  const winSpan = Math.max(1, tEndMs - tStartMs);

  return (
    <div className="wcl-card" style={{ marginBottom: 0 }}>
      <div className="wcl-card-title">
        <span>
          {mode === "buffs" ? "Buffs & Aura Uptimes" : "Debuffs Applied"} ({auras.length} entries)
        </span>
        <span style={{ color: "var(--wcl-muted)", fontWeight: 500 }}>
          Window: {formatTimestampMMSS(tStartMs)} – {formatTimestampMMSS(tEndMs)}
        </span>
      </div>

      <div className="wcl-table-wrap">
        <table className="wcl-table">
          <thead>
            <tr>
              <th>Aura</th>
              <th>Target</th>
              <th className="num" style={{ width: 65 }}>Apps</th>
              <th className="num" style={{ width: 70 }}>Refresh</th>
              <th className="num" style={{ width: 60 }}>Stacks</th>
              <th style={{ width: 150 }}>Uptime</th>
              <th style={{ minWidth: 260 }}>Timeline Intervals</th>
            </tr>
          </thead>
          <tbody>
            {auras.slice(0, 200).map((row) => {
              const targetActor = ctx.actorsById[row.targetId];
              const targetColor =
                targetActor && ctx.playerProfiles.find((p) => p.actorId === row.targetId)?.color ||
                "#cbd5e1";
              const barCol = mode === "buffs" ? "#a855f7" : getSchoolColor(row.school);

              return (
                <tr key={`${row.targetId}-${row.abilityId}`}>
                  <td>
                    <SpellLink spellId={row.abilityId} name={row.name} icon={row.icon} school={row.school} />
                  </td>
                  <td style={{ color: targetColor, fontWeight: 600 }}>{row.targetName}</td>
                  <td className="num">{row.applications}</td>
                  <td className="num" style={{ color: "var(--wcl-muted)" }}>{row.refreshes}</td>
                  <td className="num">{row.maxStacks}</td>
                  <td className="wcl-bar-cell">
                    <div className="wcl-bar-track">
                      <div className="wcl-bar-fill" style={{ width: `${row.uptimePct}%`, background: barCol }} />
                      <div className="wcl-bar-text">
                        <span>{(row.uptimeMs / 1000).toFixed(1)}s</span>
                        <span>{row.uptimePct}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        position: "relative",
                        height: 12,
                        background: "#090c11",
                        border: "1px solid #1e2638",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      {row.intervals.slice(0, 120).map(([s, e], i) => {
                        const leftPct = Math.max(0, Math.min(100, ((s - tStartMs) / winSpan) * 100));
                        const widthPct = Math.max(0.5, Math.min(100 - leftPct, ((e - s) / winSpan) * 100));
                        return (
                          <div
                            key={i}
                            title={`${formatTimestampMMSS(s)} – ${formatTimestampMMSS(e)}`}
                            style={{
                              position: "absolute",
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              top: 1,
                              bottom: 1,
                              background: barCol,
                              opacity: 0.85,
                            }}
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
            {auras.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>
                  No {mode} recorded in the selected filter/window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
