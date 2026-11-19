import { useState } from "react";
import { formatTimestampMMSS, getWowheadIconUrl, SPEC_BY_ID } from "../../data/legionConstants";
import type { FightContext, ResourceSeries } from "../../lib/combatAnalyzer";

interface ResourcesTabProps {
  ctx: FightContext;
  hpByActor: Record<number, Array<{ tMs: number; pct: number; hp: number; maxHp: number }>>;
  resourcesByActor: Record<number, ResourceSeries[]>;
  tStartMs: number;
  tEndMs: number;
  selectedPlayerId: number | null;
}

export function ResourcesTab({
  ctx,
  hpByActor,
  resourcesByActor,
  tStartMs,
  tEndMs,
  selectedPlayerId,
}: ResourcesTabProps) {
  const [pickedPlayerId, setPickedPlayerId] = useState<number>(
    selectedPlayerId && ctx.playerProfiles.some((p) => p.actorId === selectedPlayerId)
      ? selectedPlayerId
      : ctx.playerProfiles[0]?.actorId || 0
  );

  const activeId =
    selectedPlayerId && ctx.playerProfiles.some((p) => p.actorId === selectedPlayerId)
      ? selectedPlayerId
      : pickedPlayerId;

  const activePlayer = ctx.playerProfiles.find((p) => p.actorId === activeId) || ctx.playerProfiles[0];
  const hpPoints = activePlayer ? hpByActor[activePlayer.actorId] || [] : [];
  const resList = activePlayer ? resourcesByActor[activePlayer.actorId] || [] : [];

  const [selectedResourceType, setSelectedResourceType] = useState<number | "hp">("hp");
  const activeSeries =
    selectedResourceType === "hp"
      ? null
      : resList.find((r) => r.resourceType === selectedResourceType) || resList[0] || null;

  const points =
    selectedResourceType === "hp" || !activeSeries
      ? hpPoints.map((pt) => ({ tMs: pt.tMs, pct: pt.pct, label: `${pt.hp.toLocaleString()} / ${pt.maxHp.toLocaleString()}` }))
      : activeSeries.points.map((pt) => ({ tMs: pt.tMs, pct: pt.pct, label: `${pt.amount} / ${pt.max}` }));

  const chartColor = selectedResourceType === "hp" || !activeSeries ? "#22c55e" : activeSeries.color;
  const chartTitle = selectedResourceType === "hp" || !activeSeries ? "Health %" : activeSeries.name;

  const width = 1100;
  const height = 210;
  const padY = 18;
  const plotH = height - padY * 2;
  const span = Math.max(1, tEndMs - tStartMs);

  const svgPts = points
    .map((pt) => {
      const x = ((pt.tMs - tStartMs) / span) * width;
      const y = padY + plotH - (Math.max(0, Math.min(100, pt.pct)) / 100) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const minPct = points.length > 0 ? Math.min(...points.map((p) => p.pct)) : 0;
  const avgPct = points.length > 0 ? points.reduce((s, p) => s + p.pct, 0) / points.length : 0;
  const maxPct = points.length > 0 ? Math.max(...points.map((p) => p.pct)) : 0;

  return (
    <div>
      <div className="wcl-player-pills">
        {ctx.playerProfiles.map((p) => {
          const specMeta = SPEC_BY_ID[p.specId];
          return (
            <button
              key={p.actorId}
              className={`wcl-player-pill ${activePlayer?.actorId === p.actorId ? "active" : ""}`}
              onClick={() => setPickedPlayerId(p.actorId)}
            >
              {specMeta && <img src={getWowheadIconUrl(specMeta.icon, "small")} alt="" className="wcl-icon" />}
              <span style={{ color: p.color }}>{p.name}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <button
          className={`wcl-btn ${selectedResourceType === "hp" ? "wcl-btn-primary" : ""}`}
          onClick={() => setSelectedResourceType("hp")}
        >
          Health % ({hpPoints.length} samples)
        </button>
        {resList.map((r) => (
          <button
            key={r.resourceType}
            className={`wcl-btn ${selectedResourceType === r.resourceType ? "wcl-btn-primary" : ""}`}
            onClick={() => setSelectedResourceType(r.resourceType)}
          >
            {r.name} ({r.points.length} samples)
          </button>
        ))}
      </div>

      <div className="wcl-card" style={{ marginBottom: 0 }}>
        <div className="wcl-card-title">
          <span>
            {activePlayer?.name} — {chartTitle}
          </span>
          <span style={{ color: "var(--wcl-muted)", fontWeight: 500 }}>
            Min: {minPct.toFixed(1)}% · Avg: {avgPct.toFixed(1)}% · Max: {maxPct.toFixed(1)}%
          </span>
        </div>

        {points.length < 2 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--wcl-muted)" }}>
            Not enough resource samples recorded for {activePlayer?.name} in this time window.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: 210, background: "#090c11", borderRadius: 4, border: "1px solid #1e2638", display: "block" }}
          >
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = padY + plotH - (pct / 100) * plotH;
              return (
                <g key={pct}>
                  <line x1={0} x2={width} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <text x={6} y={y - 3} fill="#64748b" fontSize="10">
                    {pct}%
                  </text>
                </g>
              );
            })}
            <polyline fill="none" stroke={chartColor} strokeWidth="2" points={svgPts} />
            <text x={6} y={height - 4} fill="#64748b" fontSize="10">{formatTimestampMMSS(tStartMs)}</text>
            <text x={width - 6} y={height - 4} fill="#64748b" fontSize="10" textAnchor="end">
              {formatTimestampMMSS(tEndMs)}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}
