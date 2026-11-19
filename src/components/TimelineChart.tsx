import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatNumberCompact, formatTimestampMMSS } from "../data/legionConstants";
import type { TimelineOverview } from "../lib/combatAnalyzer";

interface TimelineChartProps {
  timeline: TimelineOverview;
  tStartMs: number;
  tEndMs: number;
  onSelectWindow: (tStartMs: number, tEndMs: number) => void;
}

export function TimelineChart({ timeline, tStartMs, tEndMs, onSelectWindow }: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragStartMs, setDragStartMs] = useState<number | null>(null);
  const [dragCurrentMs, setDragCurrentMs] = useState<number | null>(null);
  const [hoverBucket, setHoverBucket] = useState<{ xPct: number; tMs: number; dps: number; hps: number } | null>(null);

  const width = 1200;
  const height = 148;
  const padTop = 18;
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const duration = Math.max(1, timeline.durationMs);

  const maxRate = Math.max(
    1,
    ...timeline.buckets.map((b) => Math.max(b.dps, b.hps))
  );

  const xOf = (t: number) => (Math.max(0, Math.min(duration, t)) / duration) * width;
  const yOf = (val: number) => padTop + plotH - (val / maxRate) * plotH;

  const dpsPoints = timeline.buckets
    .map((b) => `${xOf(b.tMs + timeline.bucketMs * 0.5).toFixed(1)},${yOf(b.dps).toFixed(1)}`)
    .join(" ");
  const dpsArea =
    timeline.buckets.length > 0
      ? `0,${padTop + plotH} ${dpsPoints} ${width},${padTop + plotH}`
      : "";
  const hpsPoints = timeline.buckets
    .map((b) => `${xOf(b.tMs + timeline.bucketMs * 0.5).toFixed(1)},${yOf(b.hps).toFixed(1)}`)
    .join(" ");

  const msFromPointer = (clientX: number): number => {
    const el = svgRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(ratio * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const t = msFromPointer(e.clientX);
    setDragStartMs(t);
    setDragCurrentMs(t);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const t = msFromPointer(e.clientX);
    if (dragStartMs !== null) {
      setDragCurrentMs(t);
    }
    const idx = Math.min(
      timeline.buckets.length - 1,
      Math.max(0, Math.floor(t / timeline.bucketMs))
    );
    const b = timeline.buckets[idx];
    if (b) {
      setHoverBucket({
        xPct: (t / duration) * 100,
        tMs: t,
        dps: b.dps,
        hps: b.hps,
      });
    }
  };

  const handleMouseUp = () => {
    if (dragStartMs !== null && dragCurrentMs !== null) {
      const a = Math.min(dragStartMs, dragCurrentMs);
      const b = Math.max(dragStartMs, dragCurrentMs);
      if (b - a >= 2000) {
        onSelectWindow(a, b);
      }
    }
    setDragStartMs(null);
    setDragCurrentMs(null);
  };

  const isZoomed = tStartMs > 0 || tEndMs < duration;
  const activeStart = dragStartMs !== null && dragCurrentMs !== null ? Math.min(dragStartMs, dragCurrentMs) : tStartMs;
  const activeEnd = dragStartMs !== null && dragCurrentMs !== null ? Math.max(dragStartMs, dragCurrentMs) : tEndMs;

  const tickCount = 8;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (duration * i) / tickCount);

  return (
    <div className="wcl-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <strong style={{ color: "var(--wcl-gold)" }}>Combat Timeline</strong>
          <span style={{ color: "var(--wcl-blue)" }}>■ Party DPS</span>
          <span style={{ color: "var(--wcl-green)" }}>■ Party HPS</span>
          <span style={{ color: "var(--wcl-red)" }}>▼ Friendly Death</span>
          <span style={{ color: "var(--wcl-dim)" }}>Drag across graph to zoom time window</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hoverBucket && (
            <span style={{ color: "var(--wcl-muted)", fontVariantNumeric: "tabular-nums" }}>
              {formatTimestampMMSS(hoverBucket.tMs)} · DPS:{" "}
              <strong style={{ color: "var(--wcl-blue)" }}>{formatNumberCompact(hoverBucket.dps)}</strong> · HPS:{" "}
              <strong style={{ color: "var(--wcl-green)" }}>{formatNumberCompact(hoverBucket.hps)}</strong>
            </span>
          )}
          <span style={{ fontFamily: "monospace", color: "#f8fafc", background: "#0b0e14", padding: "2px 8px", borderRadius: 3, border: "1px solid var(--wcl-border)" }}>
            {formatTimestampMMSS(tStartMs)} – {formatTimestampMMSS(tEndMs)}
          </span>
          {isZoomed && (
            <button
              className="wcl-btn"
              style={{ padding: "2px 8px", fontSize: 11.5 }}
              onClick={() => onSelectWindow(0, duration)}
            >
              <RotateCcw size={12} />
              Reset Zoom
            </button>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: 148, display: "block", background: "#090c11", borderRadius: 4, border: "1px solid #1e2638", cursor: "crosshair", userSelect: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverBucket(null);
          if (dragStartMs !== null) handleMouseUp();
        }}
      >
        {/* Boss encounter bands */}
        {timeline.encounters.map((enc) => {
          const sx = xOf(enc.startMs);
          const ex = xOf(enc.endMs);
          return (
            <g key={enc.id}>
              <rect
                x={sx}
                y={padTop}
                width={Math.max(2, ex - sx)}
                height={plotH}
                fill="rgba(229, 184, 92, 0.08)"
                stroke="rgba(229, 184, 92, 0.25)"
                strokeWidth="1"
              />
              <text
                x={sx + 4}
                y={padTop + 11}
                fill="#e5b85c"
                fontSize="10"
                fontWeight="600"
              >
                {enc.name}
              </text>
            </g>
          );
        })}

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={0}
            x2={width}
            y1={padTop + plotH * frac}
            y2={padTop + plotH * frac}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3 3"
          />
        ))}

        {/* DPS Area + Line */}
        {dpsArea && <polygon points={dpsArea} fill="rgba(78, 161, 255, 0.18)" />}
        {dpsPoints && (
          <polyline fill="none" stroke="#4ea1ff" strokeWidth="1.8" points={dpsPoints} />
        )}

        {/* HPS Line */}
        {hpsPoints && (
          <polyline fill="none" stroke="#4ade80" strokeWidth="1.4" opacity="0.85" points={hpsPoints} />
        )}

        {/* Selected / Dragging Time Window Overlay */}
        {(isZoomed || dragStartMs !== null) && (
          <>
            <rect
              x={0}
              y={padTop}
              width={xOf(activeStart)}
              height={plotH}
              fill="rgba(5, 7, 11, 0.65)"
            />
            <rect
              x={xOf(activeEnd)}
              y={padTop}
              width={Math.max(0, width - xOf(activeEnd))}
              height={plotH}
              fill="rgba(5, 7, 11, 0.65)"
            />
            <rect
              x={xOf(activeStart)}
              y={padTop}
              width={Math.max(2, xOf(activeEnd) - xOf(activeStart))}
              height={plotH}
              fill="none"
              stroke="#e5b85c"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Death markers */}
        {timeline.deaths.map((d, i) => {
          const dx = xOf(d.tMs);
          return (
            <g key={`${d.actorId}-${d.tMs}-${i}`}>
              <line x1={dx} x2={dx} y1={padTop} y2={padTop + plotH} stroke="rgba(248, 113, 113, 0.55)" strokeWidth="1" />
              <polygon points={`${dx - 4},${padTop} ${dx + 4},${padTop} ${dx},${padTop + 7}`} fill="#ef4444" />
            </g>
          );
        })}

        {/* Time axis ticks */}
        {ticks.map((t, i) => {
          const tx = xOf(t);
          const anchor = i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle";
          return (
            <text
              key={i}
              x={i === 0 ? 4 : i === ticks.length - 1 ? width - 4 : tx}
              y={height - 6}
              fill="#64748b"
              fontSize="10"
              textAnchor={anchor}
            >
              {formatTimestampMMSS(t)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
