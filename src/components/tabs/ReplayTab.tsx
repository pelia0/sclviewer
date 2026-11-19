import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { CLASS_COLORS, formatTimestampMMSS } from "../../data/legionConstants";
import { buildReplayFrames, type FightContext, type ReplayFrame } from "../../lib/combatAnalyzer";
import type { WclfArchive } from "../../lib/wclfReader";

interface ReplayTabProps {
  archive: WclfArchive;
  ctx: FightContext;
  selectedPlayerId: number | null;
}

export function ReplayTab({ archive, ctx, selectedPlayerId }: ReplayTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frames, setFrames] = useState<ReplayFrame[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<"follow" | "full">("follow");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    archive
      .readReplay()
      .then((replayRaw) => {
        if (cancelled) return;
        const built = buildReplayFrames(ctx, replayRaw);
        setFrames(built);
        setCurrentMs(built.length > 0 ? built[0].t : 0);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err?.message || err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [archive, ctx]);

  const { framesByActor, playerTrail, bounds } = useMemo(() => {
    const byActor = new Map<number, ReplayFrame[]>();
    const trail: Array<{ t: number; x: number; y: number }> = [];
    if (!frames || frames.length === 0) {
      return {
        framesByActor: byActor,
        playerTrail: trail,
        bounds: { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 },
      };
    }

    let minX = frames[0].x;
    let maxX = frames[0].x;
    let minY = frames[0].y;
    let maxY = frames[0].y;
    let lastTrailT = -5000;

    for (const f of frames) {
      if (!f.x && !f.y) continue;
      if (f.x < minX) minX = f.x;
      if (f.x > maxX) maxX = f.x;
      if (f.y < minY) minY = f.y;
      if (f.y > maxY) maxY = f.y;

      let arr = byActor.get(f.actor);
      if (!arr) {
        arr = [];
        byActor.set(f.actor, arr);
      }
      arr.push(f);

      if (ctx.playerIds.has(f.actor) && f.t - lastTrailT >= 1500) {
        trail.push({ t: f.t, x: f.x, y: f.y });
        lastTrailT = f.t;
      }
    }

    return {
      framesByActor: byActor,
      playerTrail: trail,
      bounds: { minX: minX - 500, maxX: maxX + 500, minY: minY - 500, maxY: maxY + 500 },
    };
  }, [frames, ctx.playerIds]);

  // Playback animation loop
  useEffect(() => {
    if (!playing) return;
    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = (now - lastTs) * speed;
      lastTs = now;
      setCurrentMs((prev) => {
        const next = prev + dt;
        if (next >= ctx.durationMs) {
          setPlaying(false);
          return ctx.durationMs;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, speed, ctx.durationMs]);

  // Draw canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);

    if (frames.length === 0) {
      ctx2d.fillStyle = "#94a3b8";
      ctx2d.font = "14px sans-serif";
      ctx2d.fillText("No (x, y) coordinate frames found in this log for 2D replay.", 32, 48);
      return;
    }

    const sampleAt = (aid: number, tMs: number, isPlayer: boolean) => {
      const list = framesByActor.get(aid);
      if (!list || list.length === 0) return null;
      if (tMs <= list[0].t) {
        if (isPlayer) return list[0];
        return list[0].t - tMs <= 4000 ? list[0] : null;
      }
      let lo = 0;
      let hi = list.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (list[mid].t <= tMs) lo = mid;
        else hi = mid - 1;
      }
      const prev = list[lo];
      const next = lo + 1 < list.length ? list[lo + 1] : null;
      if (!isPlayer && (tMs - prev.t > 12000 || prev.hp_pct <= 0)) return null;
      if (next && next.t > prev.t && next.t - prev.t <= 8000) {
        const alpha = Math.max(0, Math.min(1, (tMs - prev.t) / (next.t - prev.t)));
        return {
          t: tMs,
          actor: aid,
          x: prev.x + (next.x - prev.x) * alpha,
          y: prev.y + (next.y - prev.y) * alpha,
          hp_pct: prev.hp_pct,
        };
      }
      return prev;
    };

    const playerUnits: Array<ReplayFrame & { name: string; color: string; isBoss: boolean }> = [];
    const enemyUnits: Array<ReplayFrame & { name: string; color: string; isBoss: boolean }> = [];

    for (const aid of framesByActor.keys()) {
      const actor = ctx.actorsById[aid];
      if (actor?.type === "Pet") continue;
      const isPlayer = ctx.playerIds.has(aid);
      const sample = sampleAt(aid, currentMs, isPlayer);
      if (!sample) continue;
      const isBoss = actor?.type === "Boss" || actor?.subType === "Boss";
      const unit = {
        ...sample,
        name: actor?.name || `#${aid}`,
        color: isPlayer ? CLASS_COLORS[actor?.type || ""] || "#38bdf8" : isBoss ? "#ef4444" : "#f97316",
        isBoss,
      };
      if (isPlayer) playerUnits.push(unit);
      else enemyUnits.push(unit);
    }

    let viewMinX = bounds.minX;
    let viewMaxX = bounds.maxX;
    let viewMinY = bounds.minY;
    let viewMaxY = bounds.maxY;

    if (cameraMode === "follow" && (playerUnits.length > 0 || enemyUnits.length > 0)) {
      const focus = selectedPlayerId ? playerUnits.filter((u) => u.actor === selectedPlayerId) : playerUnits;
      const activeList = focus.length > 0 ? focus : playerUnits.length > 0 ? playerUnits : enemyUnits;
      let cx = 0;
      let cy = 0;
      for (const u of activeList) {
        cx += u.x;
        cy += u.y;
      }
      cx /= activeList.length;
      cy /= activeList.length;
      let halfSpan = 4200 / zoom;
      for (const u of activeList) {
        halfSpan = Math.max(halfSpan, Math.abs(u.x - cx) * 1.35, Math.abs(u.y - cy) * 1.35);
      }
      const aspect = w / Math.max(1, h);
      viewMinX = cx - halfSpan * aspect;
      viewMaxX = cx + halfSpan * aspect;
      viewMinY = cy - halfSpan;
      viewMaxY = cy + halfSpan;
    } else {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const spanX = Math.max(1000, bounds.maxX - bounds.minX) / zoom;
      const spanY = Math.max(1000, bounds.maxY - bounds.minY) / zoom;
      viewMinX = cx - spanX / 2;
      viewMaxX = cx + spanX / 2;
      viewMinY = cy - spanY / 2;
      viewMaxY = cy + spanY / 2;
    }

    const spanX = Math.max(1, viewMaxX - viewMinX);
    const spanY = Math.max(1, viewMaxY - viewMinY);
    const toScreen = (wx: number, wy: number) => ({
      px: 40 + ((wx - viewMinX) / spanX) * (w - 80) + pan.x,
      py: h - (40 + ((wy - viewMinY) / spanY) * (h - 80)) + pan.y,
    });

    // Subtle grid
    ctx2d.strokeStyle = "rgba(37, 46, 64, 0.5)";
    ctx2d.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 100) {
      ctx2d.beginPath();
      ctx2d.moveTo(gx, 0);
      ctx2d.lineTo(gx, h);
      ctx2d.stroke();
    }
    for (let gy = 0; gy <= h; gy += 100) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, gy);
      ctx2d.lineTo(w, gy);
      ctx2d.stroke();
    }

    // Player movement trail
    if (playerTrail.length > 1) {
      ctx2d.beginPath();
      ctx2d.strokeStyle = "rgba(78, 161, 255, 0.25)";
      ctx2d.lineWidth = 2;
      let started = false;
      for (const pt of playerTrail) {
        if (pt.t > currentMs) break;
        const { px, py } = toScreen(pt.x, pt.y);
        if (!started) {
          ctx2d.moveTo(px, py);
          started = true;
        } else {
          ctx2d.lineTo(px, py);
        }
      }
      ctx2d.stroke();
    }

    const drawUnit = (u: (typeof playerUnits)[number], isPlayer: boolean) => {
      const { px, py } = toScreen(u.x, u.y);
      if (px < -50 || px > w + 50 || py < -50 || py > h + 50) return;

      const radius = isPlayer ? 9 : u.isBoss ? 12 : 6;
      ctx2d.beginPath();
      ctx2d.arc(px, py, radius, 0, Math.PI * 2);
      ctx2d.fillStyle = u.color;
      ctx2d.fill();
      ctx2d.lineWidth = isPlayer || u.isBoss ? 2 : 1;
      ctx2d.strokeStyle = selectedPlayerId === u.actor ? "#facc15" : "#090b10";
      ctx2d.stroke();

      const hpRatio = Math.max(0, Math.min(1, u.hp_pct / 10000));
      const barW = isPlayer ? 38 : 26;
      const barH = 4;
      const bx = px - barW / 2;
      const by = py - radius - 8;
      ctx2d.fillStyle = "rgba(9, 11, 16, 0.88)";
      ctx2d.fillRect(bx, by, barW, barH);
      ctx2d.fillStyle = isPlayer ? "#22c55e" : "#ef4444";
      ctx2d.fillRect(bx, by, barW * hpRatio, barH);

      if (isPlayer || u.isBoss || enemyUnits.length <= 12) {
        ctx2d.fillStyle = isPlayer ? "#f8fafc" : "#cbd5e1";
        ctx2d.font = isPlayer ? "bold 12px sans-serif" : "11px sans-serif";
        ctx2d.fillText(`${u.name} (${Math.round(hpRatio * 100)}%)`, px + radius + 5, py + 4);
      }
    };

    enemyUnits.forEach((u) => drawUnit(u, false));
    playerUnits.forEach((u) => drawUnit(u, true));

    ctx2d.fillStyle = "rgba(9, 11, 16, 0.85)";
    ctx2d.fillRect(12, 12, 520, 26);
    ctx2d.fillStyle = "#e2e8f0";
    ctx2d.font = "12px sans-serif";
    ctx2d.fillText(
      `Players: ${playerUnits.length} | Enemies Nearby: ${enemyUnits.length} | Wheel: Zoom (${zoom.toFixed(1)}x) | Drag: Pan`,
      20,
      29
    );
  }, [frames, framesByActor, playerTrail, bounds, currentMs, cameraMode, zoom, pan, selectedPlayerId, ctx.actorsById, ctx.playerIds]);

  if (loading) {
    return (
      <div className="wcl-card" style={{ textAlign: "center", padding: 36, color: "var(--wcl-muted)" }}>
        Decoding 2D replay coordinates stream...
      </div>
    );
  }

  if (error) {
    return <div className="wcl-error-banner">Failed to decode replay section: {error}</div>;
  }

  return (
    <div className="wcl-card" style={{ marginBottom: 0 }}>
      <div className="wcl-filter-bar" style={{ marginBottom: 10 }}>
        <button
          className="wcl-btn wcl-btn-primary"
          onClick={() => {
            if (!playing && currentMs >= ctx.durationMs && frames && frames.length > 0) {
              setCurrentMs(frames[0].t);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? "Pause" : "Play"}
        </button>

        <input
          type="range"
          min={0}
          max={ctx.durationMs}
          value={Math.round(currentMs)}
          onChange={(e) => setCurrentMs(Number(e.target.value))}
          style={{ flex: 1, minWidth: 200 }}
        />

        <span style={{ fontFamily: "monospace", minWidth: 120, textAlign: "center" }}>
          {formatTimestampMMSS(currentMs)} / {formatTimestampMMSS(ctx.durationMs)}
        </span>

        <select className="wcl-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
          <option value={8}>8x</option>
        </select>

        <select
          className="wcl-select"
          value={cameraMode}
          onChange={(e) => {
            setCameraMode(e.target.value as "follow" | "full");
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <option value="follow">Camera: Follow Party</option>
          <option value="full">Camera: Full Dungeon</option>
        </select>

        <button
          className="wcl-btn"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw size={13} />
          Reset Cam
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        style={{
          width: "100%",
          height: "auto",
          background: "#090c11",
          border: "1px solid var(--wcl-border)",
          borderRadius: 5,
          cursor: "grab",
          display: "block",
        }}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
          setZoom((z) => Math.max(0.25, Math.min(20, z * factor)));
        }}
        onMouseDown={(e) => {
          dragRef.current = { active: true, x: e.clientX, y: e.clientY };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.x;
          const dy = e.clientY - dragRef.current.y;
          dragRef.current.x = e.clientX;
          dragRef.current.y = e.clientY;
          setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        }}
        onMouseUp={() => {
          dragRef.current.active = false;
        }}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
      />
    </div>
  );
}
