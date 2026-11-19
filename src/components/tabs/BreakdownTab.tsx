import { formatNumberCompact, formatTimestampMMSS, getSchoolColor } from "../../data/legionConstants";
import type { BreakdownResult, FightContext } from "../../lib/combatAnalyzer";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface BreakdownTabProps {
  ctx: FightContext;
  breakdown: BreakdownResult;
  selectedSourceId: number | null;
  selectedTargetId: number | null;
  onSelectSource: (actorId: number | null) => void;
  onSelectTarget: (targetId: number | null) => void;
}

export function BreakdownTab({
  ctx,
  breakdown,
  selectedSourceId,
  selectedTargetId,
  onSelectSource,
  onSelectTarget,
}: BreakdownTabProps) {
  useWowheadTooltips([breakdown.mode, breakdown.byAbility, selectedSourceId, selectedTargetId]);

  const rateLabel = breakdown.mode === "healing" ? "HPS" : breakdown.mode === "damageTaken" ? "DTPS" : "DPS";
  const overLabel = breakdown.mode === "healing" ? "Overheal" : "Overkill";
  const actorColTitle = breakdown.mode === "damageTaken" ? "Player Taking Damage" : "Player";
  const targetColTitle = breakdown.mode === "damageTaken" ? "Damage Source (Enemy)" : "Target";

  // Mode SVG Chart
  const series = breakdown.series;
  const maxY = Math.max(1, ...series.map((s) => s.total));
  const width = 1100;
  const height = 130;
  const padY = 14;
  const plotH = height - padY * 2;
  const lineColor = breakdown.mode === "healing" ? "#4ade80" : breakdown.mode === "damageTaken" ? "#f87171" : "#4ea1ff";
  const areaColor =
    breakdown.mode === "healing"
      ? "rgba(74, 222, 128, 0.16)"
      : breakdown.mode === "damageTaken"
        ? "rgba(248, 113, 113, 0.16)"
        : "rgba(78, 161, 255, 0.18)";

  const pts = series
    .map((pt, idx) => {
      const x = series.length <= 1 ? 0 : (idx / (series.length - 1)) * width;
      const y = padY + plotH - (pt.total / maxY) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPts = series.length > 0 ? `0,${padY + plotH} ${pts} ${width},${padY + plotH}` : "";
  const selectedActorName = selectedSourceId ? ctx.actorsById[selectedSourceId]?.name : null;
  const selectedTargetName = selectedTargetId ? ctx.actorsById[selectedTargetId]?.name : null;

  return (
    <div>
      {/* Per-tab Chart */}
      <div className="wcl-card">
        <div className="wcl-card-title">
          <span>
            {breakdown.mode === "healing" ? "Healing Done" : breakdown.mode === "damageTaken" ? "Damage Taken" : "Damage Done"} —{" "}
            Total: <strong style={{ color: "#fff" }}>{breakdown.total.toLocaleString()}</strong> ({formatNumberCompact(breakdown.perSec)} {rateLabel})
          </span>
          <span style={{ color: "var(--wcl-muted)", fontWeight: 500 }}>
            Peak: {formatNumberCompact(maxY)} {rateLabel}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 120, background: "#090c11", borderRadius: 4, border: "1px solid #1e2638", display: "block" }}>
          {areaPts && <polygon points={areaPts} fill={areaColor} />}
          {pts && <polyline fill="none" stroke={lineColor} strokeWidth="2" points={pts} />}
          {series.length > 1 && (
            <>
              <text x={6} y={height - 4} fill="#64748b" fontSize="10">{formatTimestampMMSS(series[0].tMs)}</text>
              <text x={width - 6} y={height - 4} fill="#64748b" fontSize="10" textAnchor="end">
                {formatTimestampMMSS(series[series.length - 1].tMs)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Actor + Target Summary Row */}
      <div className="wcl-grid-2" style={{ marginBottom: 14 }}>
        <div className="wcl-card" style={{ marginBottom: 0 }}>
          <div className="wcl-card-title">
            <span>By {actorColTitle} (click row to filter)</span>
            {selectedSourceId !== null && (
              <button className="wcl-btn" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onSelectSource(null)}>
                Clear Player
              </button>
            )}
          </div>
          <div className="wcl-table-wrap">
            <table className="wcl-table">
              <thead>
                <tr>
                  <th>{actorColTitle}</th>
                  <th>Amount &amp; Share</th>
                  <th className="num">{rateLabel}</th>
                  <th className="num">Hits</th>
                  <th className="num">Crit%</th>
                  <th className="num">Active%</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.byActor.map((row) => {
                  const isSel = selectedSourceId === row.actorId;
                  return (
                    <tr
                      key={row.actorId}
                      className={`clickable ${isSel ? "selected" : ""}`}
                      onClick={() => onSelectSource(isSel ? null : row.actorId)}
                    >
                      <td style={{ color: row.color, fontWeight: 700 }}>{row.name}</td>
                      <td className="wcl-bar-cell">
                        <div className="wcl-bar-track">
                          <div className="wcl-bar-fill" style={{ width: `${row.sharePct}%`, background: row.color }} />
                          <div className="wcl-bar-text">
                            <span>{formatNumberCompact(row.total)}</span>
                            <span>{row.sharePct}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>{formatNumberCompact(row.perSec)}</td>
                      <td className="num">{row.hits.toLocaleString()}</td>
                      <td className="num">{row.critPct}%</td>
                      <td className="num" style={{ color: "var(--wcl-muted)" }}>{row.activePct}%</td>
                    </tr>
                  );
                })}
                {breakdown.byActor.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>No data for filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="wcl-card" style={{ marginBottom: 0 }}>
          <div className="wcl-card-title">
            <span>By {targetColTitle} (click row to filter)</span>
            {selectedTargetId !== null && (
              <button className="wcl-btn" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => onSelectTarget(null)}>
                Clear Target
              </button>
            )}
          </div>
          <div className="wcl-table-wrap" style={{ maxHeight: 330, overflowY: "auto" }}>
            <table className="wcl-table">
              <thead>
                <tr>
                  <th>{targetColTitle}</th>
                  <th>Amount &amp; Share</th>
                  <th className="num">{rateLabel}</th>
                  <th className="num">Hits</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.byTarget.map((row) => {
                  const isSel = selectedTargetId === row.targetId;
                  return (
                    <tr
                      key={row.targetId}
                      className={`clickable ${isSel ? "selected" : ""}`}
                      onClick={() => onSelectTarget(isSel ? null : row.targetId)}
                    >
                      <td style={{ color: row.color, fontWeight: 600 }}>{row.name}</td>
                      <td className="wcl-bar-cell">
                        <div className="wcl-bar-track">
                          <div className="wcl-bar-fill" style={{ width: `${row.sharePct}%`, background: lineColor }} />
                          <div className="wcl-bar-text">
                            <span>{formatNumberCompact(row.total)}</span>
                            <span>{row.sharePct}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>{formatNumberCompact(row.perSec)}</td>
                      <td className="num">{row.hits.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {breakdown.byTarget.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>No data for filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Abilities Breakdown Table */}
      <div className="wcl-card" style={{ marginBottom: 0 }}>
        <div className="wcl-card-title">
          <span>
            Ability Breakdown ({selectedActorName || "All Players"} → {selectedTargetName || "All Targets"})
          </span>
          <span style={{ color: "var(--wcl-muted)", fontWeight: 500 }}>{breakdown.byAbility.length} abilities</span>
        </div>
        <div className="wcl-table-wrap">
          <table className="wcl-table">
            <thead>
              <tr>
                <th>Ability</th>
                <th>Total &amp; Share</th>
                <th className="num">{rateLabel}</th>
                <th className="num">Hits</th>
                <th className="num">Avg Hit</th>
                <th className="num">Max Hit</th>
                <th className="num">Crit%</th>
                <th className="num">{overLabel}</th>
                {breakdown.mode === "healing" && <th className="num">Absorbed</th>}
              </tr>
            </thead>
            <tbody>
              {breakdown.byAbility.map((ab) => {
                const barCol = getSchoolColor(ab.school);
                const overPct = ab.rawTotal > 0 ? ((ab.overkillOrOverheal / ab.rawTotal) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={ab.abilityId}>
                    <td>
                      <SpellLink spellId={ab.abilityId} name={ab.name} icon={ab.icon} school={ab.school} />
                    </td>
                    <td className="wcl-bar-cell" style={{ minWidth: 185 }}>
                      <div className="wcl-bar-track">
                        <div className="wcl-bar-fill" style={{ width: `${ab.sharePct}%`, background: barCol }} />
                        <div className="wcl-bar-text">
                          <span>{ab.total.toLocaleString()}</span>
                          <span>{ab.sharePct}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatNumberCompact(ab.perSec)}</td>
                    <td className="num">{ab.hits.toLocaleString()}</td>
                    <td className="num">{ab.avgHit.toLocaleString()}</td>
                    <td className="num">{ab.maxHit.toLocaleString()}</td>
                    <td className="num">{ab.critPct}%</td>
                    <td className="num" style={{ color: "var(--wcl-muted)" }}>
                      {formatNumberCompact(ab.overkillOrOverheal)} ({overPct}%)
                    </td>
                    {breakdown.mode === "healing" && (
                      <td className="num" style={{ color: "#38bdf8" }}>{formatNumberCompact(ab.absorbed)}</td>
                    )}
                  </tr>
                );
              })}
              {breakdown.byAbility.length === 0 && (
                <tr>
                  <td colSpan={breakdown.mode === "healing" ? 9 : 8} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>
                    No ability events found for the selected filter
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
