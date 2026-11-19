import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatTimestampMMSS } from "../../data/legionConstants";
import {
  filterAndPaginateEvents,
  type FightContext,
  type FightFilterState,
  type FormattedEventRow,
} from "../../lib/combatAnalyzer";
import type { SpellDict } from "../../types/wcl";
import { Pagination } from "../Pagination";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface EventsTabProps {
  ctx: FightContext;
  filter: FightFilterState;
  spellDict?: SpellDict;
}

type Category = "all" | "damage" | "healing" | "cast" | "buff" | "debuff" | "death" | "resource";

export function EventsTab({ ctx, filter, spellDict }: EventsTabProps) {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const result = useMemo(
    () => filterAndPaginateEvents(ctx, filter, { category, search, page, pageSize }, spellDict),
    [ctx, filter, category, search, page, pageSize, spellDict]
  );

  useWowheadTooltips([result.rows]);

  const typeBadgeColor = (t: string) => {
    if (t === "damage") return "#f87171";
    if (t === "heal" || t === "absorbed") return "#4ade80";
    if (t === "cast" || t === "begincast") return "#60a5fa";
    if (t.includes("debuff")) return "#fb923c";
    if (t.includes("buff")) return "#c084fc";
    if (t === "death" || t === "interrupt" || t === "instakill") return "#facc15";
    return "#94a3b8";
  };

  const renderDetails = (ev: FormattedEventRow) => {
    const src = <span style={{ color: ev.sourceColor, fontWeight: 600 }}>{ev.sourceName}</span>;
    const tgt = <span style={{ color: ev.targetColor, fontWeight: 600 }}>{ev.targetName}</span>;
    const sp = <SpellLink spellId={ev.abilityId} name={ev.abilityName} icon={ev.abilityIcon} small />;
    const amtStr = ev.amount.toLocaleString();
    const critTag = ev.isCrit ? <strong style={{ color: "#facc15" }}> (Crit)</strong> : null;

    if (ev.type === "damage") {
      return (
        <span>
          {src} hits {tgt} with {sp} for <strong style={{ color: "#f87171" }}>{amtStr}</strong>
          {critTag}
          {ev.overkillOrOverheal > 0 && (
            <span style={{ color: "var(--wcl-dim)" }}> (O: {ev.overkillOrOverheal.toLocaleString()})</span>
          )}
          {ev.absorbed > 0 && <span style={{ color: "#38bdf8" }}> (A: {ev.absorbed.toLocaleString()})</span>}
        </span>
      );
    }
    if (ev.type === "heal" || ev.type === "absorbed") {
      return (
        <span>
          {src} {ev.type === "absorbed" ? "absorbs on" : "heals"} {tgt} with {sp} for{" "}
          <strong style={{ color: "#4ade80" }}>{amtStr}</strong>
          {critTag}
          {ev.overkillOrOverheal > 0 && (
            <span style={{ color: "var(--wcl-dim)" }}> (OH: {ev.overkillOrOverheal.toLocaleString()})</span>
          )}
        </span>
      );
    }
    if (ev.type === "cast" || ev.type === "begincast") {
      return (
        <span>
          {src} {ev.type === "begincast" ? "begins casting" : "casts"} {sp}
          {ev.targetId > 0 ? <> on {tgt}</> : null}
        </span>
      );
    }
    if (ev.type === "death" || ev.type === "instakill") {
      return (
        <span style={{ color: "#f87171", fontWeight: 700 }}>
          {tgt} dies {ev.abilityId > 0 ? <>({sp})</> : ""}
        </span>
      );
    }
    return (
      <span>
        {src} → {tgt}: {sp}
      </span>
    );
  };

  return (
    <div className="wcl-card" style={{ marginBottom: 0 }}>
      <div className="wcl-filter-bar" style={{ marginBottom: 10 }}>
        <div className="wcl-field">
          <label>Event Type</label>
          <select
            className="wcl-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category);
              setPage(1);
            }}
          >
            <option value="all">All Events</option>
            <option value="damage">Damage</option>
            <option value="healing">Healing &amp; Absorbs</option>
            <option value="cast">Casts</option>
            <option value="buff">Buffs</option>
            <option value="debuff">Debuffs</option>
            <option value="death">Deaths &amp; Interrupts</option>
            <option value="resource">Resources</option>
          </select>
        </div>

        <div className="wcl-field" style={{ flex: "1 1 220px", maxWidth: 340 }}>
          <Search size={14} color="var(--wcl-muted)" />
          <input
            type="text"
            className="wcl-input"
            style={{ width: "100%" }}
            placeholder="Filter by actor, spell name, or spell ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Pagination
        totalItems={result.totalCount}
        page={result.page}
        pageSize={result.pageSize}
        pageSizeOptions={[50, 100, 250, 500]}
        onPageChange={setPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
        itemLabel="events"
      />

      <div className="wcl-table-wrap">
        <table className="wcl-table">
          <thead>
            <tr>
              <th style={{ width: 96 }}>Time</th>
              <th style={{ width: 115 }}>Type</th>
              <th style={{ width: 150 }}>Source</th>
              <th style={{ width: 200 }}>Ability</th>
              <th style={{ width: 150 }}>Target</th>
              <th>Event Details</th>
              <th className="num" style={{ width: 70 }}>HP%</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((ev) => {
              const bCol = typeBadgeColor(ev.type);
              return (
                <tr key={ev.index}>
                  <td style={{ fontFamily: "monospace", color: "var(--wcl-muted)", whiteSpace: "nowrap" }}>
                    {formatTimestampMMSS(ev.tMs, true)}
                  </td>
                  <td>
                    <span
                      className="wcl-badge"
                      style={{
                        background: `${bCol}22`,
                        color: bCol,
                        border: `1px solid ${bCol}55`,
                      }}
                    >
                      {ev.type}
                    </span>
                  </td>
                  <td style={{ color: ev.sourceColor, fontWeight: 600 }}>{ev.sourceName}</td>
                  <td>
                    <SpellLink spellId={ev.abilityId} name={ev.abilityName} icon={ev.abilityIcon} small />
                  </td>
                  <td style={{ color: ev.targetColor, fontWeight: 600 }}>{ev.targetName}</td>
                  <td>{renderDetails(ev)}</td>
                  <td className="num" style={{ color: "var(--wcl-muted)" }}>
                    {ev.hpPct !== null ? `${ev.hpPct}%` : "—"}
                  </td>
                </tr>
              );
            })}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--wcl-muted)" }}>
                  No events match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={result.totalCount}
        page={result.page}
        pageSize={result.pageSize}
        pageSizeOptions={[50, 100, 250, 500]}
        onPageChange={setPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
        itemLabel="events"
      />
    </div>
  );
}
